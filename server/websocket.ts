import { FastifyInstance } from 'fastify';
import { WebSocket } from 'ws';
import { todoQueries } from './db/queries.js';
import { randomUUID } from 'crypto';

// Track active connections per user
const userConnections = new Map<string, Set<WebSocket>>();

// Connection metrics
let totalConnections = 0;

export interface BroadcastEvent {
  event: 'todo:created' | 'todo:updated' | 'todo:deleted' | 'todos:synced';
  data: any;
  correlationId?: string;
}

/**
 * Authenticate WebSocket connection using JWT token
 */
async function authenticateWebSocket(
  fastify: FastifyInstance,
  token: string | null
): Promise<{ userId: string; email: string } | null> {
  if (!token) {
    return null;
  }

  try {
    const decoded = fastify.jwt.verify<{ userId: string; email: string }>(token);
    return decoded;
  } catch (err) {
    if (fastify.log && typeof fastify.log.warn === 'function') {
      fastify.log.warn({ err }, '[WEBSOCKET] Authentication failed');
    }
    return null;
  }
}

/**
 * Add a WebSocket connection for a user
 */
export function addConnection(userId: string, ws: WebSocket, fastify: FastifyInstance): void {
  if (!userConnections.has(userId)) {
    userConnections.set(userId, new Set());
  }
  userConnections.get(userId)!.add(ws);
  totalConnections++;

  const userConnectionCount = userConnections.get(userId)!.size;
  if (fastify.log && typeof fastify.log.info === 'function') {
    fastify.log.info({
      userId,
      userConnectionCount,
      totalConnections,
      timestamp: new Date().toISOString(),
    }, '[WEBSOCKET] Connection established');
  }
}

/**
 * Remove a WebSocket connection for a user
 */
export function removeConnection(userId: string, ws: WebSocket, fastify: FastifyInstance): void {
  const connections = userConnections.get(userId);
  if (connections) {
    connections.delete(ws);
    if (connections.size === 0) {
      userConnections.delete(userId);
    }
    totalConnections--;
  }

  const userConnectionCount = connections?.size || 0;
  if (fastify.log && typeof fastify.log.info === 'function') {
    fastify.log.info({
      userId,
      userConnectionCount,
      totalConnections,
      timestamp: new Date().toISOString(),
    }, '[WEBSOCKET] Connection closed');
  }
}

/**
 * Broadcast an event to all connected devices for a user
 */
export function broadcastToUser(
  userId: string,
  event: BroadcastEvent,
  fastify: FastifyInstance
): void {
  const connections = userConnections.get(userId);
  if (!connections || connections.size === 0) {
    if (fastify.log && typeof fastify.log.debug === 'function') {
      fastify.log.debug({
        userId,
        event: event.event,
        deviceCount: 0,
      }, '[BROADCAST] No active connections for user');
    }
    return;
  }

  const message = JSON.stringify(event);
  const messageSize = Buffer.byteLength(message, 'utf8');
  let successCount = 0;
  let failureCount = 0;

  connections.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(message);
        successCount++;
      } catch (err) {
        if (fastify.log && typeof fastify.log.error === 'function') {
          fastify.log.error({ err, userId }, '[BROADCAST] Failed to send message');
        }
        failureCount++;
      }
    } else {
      failureCount++;
    }
  });

  if (fastify.log && typeof fastify.log.info === 'function') {
    fastify.log.info({
      userId,
      event: event.event,
      deviceCount: connections.size,
      successCount,
      failureCount,
      dataSize: messageSize,
      correlationId: event.correlationId,
      timestamp: new Date().toISOString(),
    }, '[BROADCAST] Event broadcasted');
  }
}

/**
 * Get connection metrics
 */
export function getConnectionMetrics(): {
  totalConnections: number;
  usersWithConnections: number;
  connectionsPerUser: Record<string, number>;
} {
  const connectionsPerUser: Record<string, number> = {};
  userConnections.forEach((connections, userId) => {
    connectionsPerUser[userId] = connections.size;
  });

  return {
    totalConnections,
    usersWithConnections: userConnections.size,
    connectionsPerUser,
  };
}

/**
 * Setup WebSocket route handler
 */
export function setupWebSocket(fastify: FastifyInstance): void {
  fastify.get('/ws', { websocket: true }, (connection, req) => {
    // Extract token from query params or Authorization header
    // Parse query string from URL
    const url = req.url || '';
    const queryMatch = url.match(/\?([^#]*)/);
    const queryParams = new URLSearchParams(queryMatch ? queryMatch[1] : '');
    const token =
      queryParams.get('token') ||
      (req.headers.authorization && typeof req.headers.authorization === 'string'
        ? req.headers.authorization.replace('Bearer ', '')
        : null);

    // Authenticate (async, but we'll handle it)
    authenticateWebSocket(fastify, token || null).then((user) => {
      if (!user) {
        if (fastify.log && typeof fastify.log.warn === 'function') {
          fastify.log.warn({
            hasToken: !!token,
            timestamp: new Date().toISOString(),
          }, '[WEBSOCKET] Authentication failed, closing connection');
        }
        connection.socket.close(1008, 'Unauthorized');
        return;
      }

      const { userId } = user;

      // Add connection
      addConnection(userId, connection.socket, fastify);

      // Handle incoming messages (commands from client)
      connection.socket.on('message', async (message: Buffer) => {
        try {
          const command = JSON.parse(message.toString());
          const correlationId = randomUUID();
          const syncMethod = 'websocket';

          if (fastify.log && typeof fastify.log.info === 'function') {
            fastify.log.info({
              userId,
              syncMethod,
              commandType: command.type,
              todoId: command.payload?.id,
              correlationId,
              timestamp: new Date().toISOString(),
            }, '[WEBSOCKET] Command received');
          }

          // Process command
          try {
            if (command.type === 'todo:create') {
              const { id, text, completed, created_at, updated_at } = command.payload;
              await todoQueries.bulkUpsert(userId, [{
                id,
                text,
                completed,
                created_at,
                updated_at,
              }]);
              
              const allTodos = await todoQueries.findByUserId(userId);
              const todos = allTodos.map((todo) => ({
                id: todo.id,
                text: todo.text,
                completed: todo.completed,
                created_at: new Date(todo.created_at).getTime(),
                updated_at: new Date(todo.updated_at).getTime(),
              }));

              broadcastToUser(
                userId,
                {
                  event: 'todo:created',
                  data: todos,
                  correlationId,
                },
                fastify
              );

              if (fastify.log && typeof fastify.log.info === 'function') {
                fastify.log.info({
                  userId,
                  syncMethod,
                  operationType: 'create',
                  todoId: id,
                  correlationId,
                  timestamp: new Date().toISOString(),
                }, '[WEBSOCKET] Create completed');
              }
            } else if (command.type === 'todo:update') {
              const { id, text, completed } = command.payload;
              const todo = await todoQueries.update(id, userId, text, completed);
              
              if (todo) {
                const allTodos = await todoQueries.findByUserId(userId);
                const todos = allTodos.map((t) => ({
                  id: t.id,
                  text: t.text,
                  completed: t.completed,
                  created_at: new Date(t.created_at).getTime(),
                  updated_at: new Date(t.updated_at).getTime(),
                }));

                broadcastToUser(
                  userId,
                  {
                    event: 'todo:updated',
                    data: todos,
                    correlationId,
                  },
                  fastify
                );

                if (fastify.log && typeof fastify.log.info === 'function') {
                  fastify.log.info({
                    userId,
                    syncMethod,
                    operationType: 'update',
                    todoId: id,
                    correlationId,
                    timestamp: new Date().toISOString(),
                  }, '[WEBSOCKET] Update completed');
                }
              }
            } else if (command.type === 'todo:delete') {
              const { id } = command.payload;
              const deleted = await todoQueries.delete(id, userId);
              
              if (deleted) {
                broadcastToUser(
                  userId,
                  {
                    event: 'todo:deleted',
                    data: [{ id }],
                    correlationId,
                  },
                  fastify
                );

                if (fastify.log && typeof fastify.log.info === 'function') {
                  fastify.log.info({
                    userId,
                    syncMethod,
                    operationType: 'delete',
                    todoId: id,
                    correlationId,
                    timestamp: new Date().toISOString(),
                  }, '[WEBSOCKET] Delete completed');
                }
              }
            }
          } catch (cmdErr) {
            if (fastify.log && typeof fastify.log.error === 'function') {
              fastify.log.error({ err: cmdErr, userId, commandType: command.type }, '[WEBSOCKET] Command processing failed');
            }
          }
        } catch (err) {
          if (fastify.log && typeof fastify.log.error === 'function') {
            fastify.log.error({ err, userId }, '[WEBSOCKET] Failed to parse command');
          }
        }
      });

      // Handle connection close
      connection.socket.on('close', () => {
        removeConnection(userId, connection.socket, fastify);
      });

      // Handle errors
      connection.socket.on('error', (err) => {
        if (fastify.log && typeof fastify.log.error === 'function') {
          fastify.log.error({ err, userId }, '[WEBSOCKET] Connection error');
        }
        removeConnection(userId, connection.socket, fastify);
      });
    }).catch((err) => {
      if (fastify.log && typeof fastify.log.error === 'function') {
        fastify.log.error({ err }, '[WEBSOCKET] Authentication error');
      }
      connection.socket.close(1011, 'Internal Server Error');
    });
  });
}

