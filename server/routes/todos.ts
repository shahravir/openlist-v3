import { FastifyInstance } from 'fastify';
import { todoQueries } from '../db/queries.js';
import { authenticate } from '../middleware/auth.js';
import { SyncRequest, SyncResponse } from '../types.js';
import { broadcastToUser } from '../websocket.js';
import { randomUUID } from 'crypto';
import { MAX_TODO_LENGTH, MIN_TODO_LENGTH } from '../constants.js';

export async function todoRoutes(fastify: FastifyInstance) {
  // Get all todos
  fastify.get('/todos', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user.userId;
    const todos = await todoQueries.findByUserId(userId);

    return {
      todos: todos.map((todo) => ({
        id: todo.id,
        text: todo.text,
        completed: todo.completed,
        order: todo.order,
        due_date: todo.due_date ? new Date(todo.due_date).getTime() : null,
        created_at: new Date(todo.created_at).getTime(),
        updated_at: new Date(todo.updated_at).getTime(),
      })),
    };
  });

  // Sync todos (bulk upsert with conflict resolution)
  fastify.post<{ Body: SyncRequest }>('/todos/sync', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user.userId;
    const { todos: clientTodos } = request.body;
    const correlationId = randomUUID();
    const syncMethod = 'http'; // HTTP sync endpoint

    fastify.log.info({
      userId,
      syncMethod,
      operationType: 'sync',
      clientTodosCount: clientTodos.length,
      correlationId,
      timestamp: new Date().toISOString(),
    }, '[HTTP_SYNC] Sync request received');

    console.log('Sync request - userId:', userId, 'clientTodos:', clientTodos.length);

    // Get server todos
    const serverTodos = await todoQueries.findByUserId(userId);
    console.log('Server todos:', serverTodos.length);

    // Convert server todos to client format with timestamps
    const serverTodosMap = new Map(
      serverTodos.map((todo) => [
        todo.id,
        {
          id: todo.id,
          text: todo.text,
          completed: todo.completed,
          order: todo.order,
          due_date: todo.due_date ? new Date(todo.due_date).getTime() : null,
          created_at: new Date(todo.created_at).getTime(),
          updated_at: new Date(todo.updated_at).getTime(),
        },
      ])
    );

    // Merge client and server todos (last-write-wins based on updated_at)
    const todosToUpsert: typeof clientTodos = [];
    const conflictResolutions: Array<{ todoId: string; winner: 'client' | 'server'; clientTime: number; serverTime: number }> = [];

    // Process client todos - add to upsert list if newer or doesn't exist on server
    clientTodos.forEach((clientTodo) => {
      const serverTodo = serverTodosMap.get(clientTodo.id);
      if (!serverTodo) {
        // New todo from client - always include it
        console.log('New client todo:', clientTodo.id);
        todosToUpsert.push(clientTodo);
      } else if (clientTodo.updated_at >= serverTodo.updated_at) {
        // Client version is newer or equal - include client version
        console.log('Client todo is newer:', clientTodo.id, clientTodo.updated_at, 'vs', serverTodo.updated_at);
        todosToUpsert.push(clientTodo);
        if (clientTodo.updated_at !== serverTodo.updated_at) {
          conflictResolutions.push({
            todoId: clientTodo.id,
            winner: 'client',
            clientTime: clientTodo.updated_at,
            serverTime: serverTodo.updated_at,
          });
        }
      } else {
        // Server version is newer - keep server version
        console.log('Server todo is newer:', serverTodo.id);
        todosToUpsert.push(serverTodo);
        conflictResolutions.push({
          todoId: serverTodo.id,
          winner: 'server',
          clientTime: clientTodo.updated_at,
          serverTime: serverTodo.updated_at,
        });
      }
    });

    // Add server todos that don't exist in client (new todos from other devices)
    serverTodosMap.forEach((serverTodo) => {
      const clientTodo = clientTodos.find((t) => t.id === serverTodo.id);
      if (!clientTodo) {
        // Server has a todo that client doesn't - add it
        console.log('New server todo:', serverTodo.id);
        todosToUpsert.push(serverTodo);
      }
    });

    console.log('Todos to upsert:', todosToUpsert.length);

    // Upsert all merged todos to database (bulkUpsert handles conflict resolution)
    const upsertedTodos = await todoQueries.bulkUpsert(userId, todosToUpsert);
    console.log('Upserted todos:', upsertedTodos.length);

    // Return final merged state from database
    const finalTodos = await todoQueries.findByUserId(userId);
    console.log('Final todos from DB:', finalTodos.length);
    
    const response: SyncResponse = {
      todos: finalTodos.map((todo) => ({
        id: todo.id,
        text: todo.text,
        completed: todo.completed,
        order: todo.order,
        due_date: todo.due_date ? new Date(todo.due_date).getTime() : null,
        created_at: new Date(todo.created_at).getTime(),
        updated_at: new Date(todo.updated_at).getTime(),
      })),
    };

    console.log('Sending response with', response.todos.length, 'todos');

    // Log conflict resolutions
    if (conflictResolutions.length > 0) {
      fastify.log.info({
        userId,
        syncMethod,
        correlationId,
        conflictCount: conflictResolutions.length,
        resolutions: conflictResolutions,
        timestamp: new Date().toISOString(),
      }, '[HTTP_SYNC] Conflict resolutions');
    }

    // Broadcast to all user's connected devices
    broadcastToUser(
      userId,
      {
        event: 'todos:synced',
        data: response.todos,
        correlationId,
      },
      fastify
    );

    fastify.log.info({
      userId,
      syncMethod,
      operationType: 'sync',
      todosCount: response.todos.length,
      correlationId,
      timestamp: new Date().toISOString(),
    }, '[HTTP_SYNC] Sync completed');

    return response;
  });

  // Update single todo
  fastify.put<{ Params: { id: string }; Body: { text: string; completed: boolean; order?: number; due_date?: number | null } }>(
    '/todos/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = request.user.userId;
      const { id } = request.params;
      const { text, completed, order, due_date } = request.body;
      const correlationId = randomUUID();
      const syncMethod = 'http';

      // Validate text
      if (!text || text.trim().length < MIN_TODO_LENGTH) {
        return reply.code(400).send({ error: 'Todo text cannot be empty' });
      }
      if (text.trim().length > MAX_TODO_LENGTH) {
        return reply.code(400).send({ error: `Todo text cannot exceed ${MAX_TODO_LENGTH} characters` });
      }

      fastify.log.info({
        userId,
        syncMethod,
        operationType: 'update',
        todoId: id,
        correlationId,
        timestamp: new Date().toISOString(),
      }, '[HTTP_SYNC] Update request received');

      const todo = await todoQueries.update(id, userId, text, completed, order, due_date);
      if (!todo) {
        return reply.code(404).send({ error: 'Todo not found' });
      }

      const todoResponse = {
        id: todo.id,
        text: todo.text,
        completed: todo.completed,
        order: todo.order,
        due_date: todo.due_date ? new Date(todo.due_date).getTime() : null,
        created_at: new Date(todo.created_at).getTime(),
        updated_at: new Date(todo.updated_at).getTime(),
      };

      // Broadcast to all user's connected devices
      broadcastToUser(
        userId,
        {
          event: 'todo:updated',
          data: [todoResponse],
          correlationId,
        },
        fastify
      );

      fastify.log.info({
        userId,
        syncMethod,
        operationType: 'update',
        todoId: id,
        correlationId,
        timestamp: new Date().toISOString(),
      }, '[HTTP_SYNC] Update completed');

      return todoResponse;
    }
  );

  // Delete todo
  fastify.delete<{ Params: { id: string } }>(
    '/todos/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = request.user.userId;
      const { id } = request.params;
      const correlationId = randomUUID();
      const syncMethod = 'http';

      fastify.log.info({
        userId,
        syncMethod,
        operationType: 'delete',
        todoId: id,
        correlationId,
        timestamp: new Date().toISOString(),
      }, '[HTTP_SYNC] Delete request received');

      const deleted = await todoQueries.delete(id, userId);
      if (!deleted) {
        return reply.code(404).send({ error: 'Todo not found' });
      }

      // Broadcast to all user's connected devices
      broadcastToUser(
        userId,
        {
          event: 'todo:deleted',
          data: [{ id }],
          correlationId,
        },
        fastify
      );

      fastify.log.info({
        userId,
        syncMethod,
        operationType: 'delete',
        todoId: id,
        correlationId,
        timestamp: new Date().toISOString(),
      }, '[HTTP_SYNC] Delete completed');

      return { success: true };
    }
  );
}

