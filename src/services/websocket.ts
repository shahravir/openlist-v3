type ConnectionState = 'disconnected' | 'connecting' | 'connected';

type WebSocketEvent = 'todo:created' | 'todo:updated' | 'todo:deleted' | 'todos:synced';

type EventHandler = (data: any) => void;

interface WebSocketMessage {
  event: WebSocketEvent;
  data: any;
  correlationId?: string;
}

interface Command {
  type: 'todo:create' | 'todo:update' | 'todo:delete';
  payload: {
    id: string;
    text?: string;
    completed?: boolean;
    order?: number;
    due_date?: number | null;
    createdAt: number;
    updatedAt: number;
  };
}

import { getWebSocketUrl } from '../utils/config';

const DEBUG_KEY = 'openlist:debug';
const WS_URL = getWebSocketUrl();

function isDebugMode(): boolean {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(DEBUG_KEY) === 'true';
  }
  return false;
}

function log(prefix: string, message: string, data?: any) {
  if (isDebugMode()) {
    console.group(`[${prefix}] ${message}`);
    if (data) {
      console.log(data);
    }
    console.groupEnd();
  } else {
    if (data) {
      console.log(`[${prefix}] ${message}`, data);
    } else {
      console.log(`[${prefix}] ${message}`);
    }
  }
}

export class WebSocketService {
  private ws: WebSocket | null = null;
  private state: ConnectionState = 'disconnected';
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private baseReconnectDelay = 1000; // 1 second
  private eventHandlers = new Map<WebSocketEvent, Set<EventHandler>>();
  private messageQueue: Command[] = [];
  private connectionStartTime: number | null = null;
  private messageCount = { sent: 0, received: 0 };

  constructor() {
    if (typeof window !== 'undefined') {
      // Handle page visibility changes
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.state === 'disconnected') {
          log('WS', 'Page visible, attempting reconnection');
          this.connect(this.getToken());
        }
      });
    }
  }

  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  }

  connect(token: string | null): void {
    if (!token) {
      log('WS', 'No token provided, cannot connect');
      return;
    }

    if (this.state === 'connecting' || this.state === 'connected') {
      log('WS', 'Already connecting or connected');
      return;
    }

    this.state = 'connecting';
    this.connectionStartTime = Date.now();
    log('WS', 'Connecting...', { url: WS_URL });

    try {
      const wsUrl = `${WS_URL}?token=${encodeURIComponent(token)}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.state = 'connected';
        this.reconnectAttempts = 0;
        const connectionDuration = this.connectionStartTime
          ? Date.now() - this.connectionStartTime
          : 0;
        log('WS', 'Connected', {
          connectionDuration: `${connectionDuration}ms`,
          queuedMessages: this.messageQueue.length,
        });

        // Send queued messages
        this.flushMessageQueue();

        // Clear any pending reconnection
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const rawData = event.data;
          const message: WebSocketMessage = JSON.parse(rawData);
          this.messageCount.received++;
          const dataSize = new Blob([rawData]).size;

          log('WS', 'Event received', {
            event: message.event,
            dataSize: `${dataSize} bytes`,
            correlationId: message.correlationId,
            timestamp: new Date().toISOString(),
            totalReceived: this.messageCount.received,
            dataPreview: Array.isArray(message.data) 
              ? `Array with ${message.data.length} items` 
              : typeof message.data,
          });

          // Call registered handlers
          const handlers = this.eventHandlers.get(message.event);
          if (handlers) {
            log('WS', `Calling ${handlers.size} handler(s) for event: ${message.event}`);
            handlers.forEach((handler) => {
              try {
                handler(message.data);
              } catch (err) {
                console.error('[WS] Error in event handler', err);
              }
            });
          } else {
            log('WS', `No handlers registered for event: ${message.event}`, {
              availableEvents: Array.from(this.eventHandlers.keys()),
            });
          }
        } catch (err) {
          console.error('[WS] Failed to parse message', err, {
            rawData: event.data,
          });
        }
      };

      this.ws.onerror = (error) => {
        log('WS', 'Connection error', error);
      };

      this.ws.onclose = (event) => {
        const wasConnected = this.state === 'connected';
        this.state = 'disconnected';
        const connectionDuration = this.connectionStartTime
          ? Date.now() - this.connectionStartTime
          : 0;

        log('WS', 'Connection closed', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
          connectionDuration: `${connectionDuration}ms`,
          totalSent: this.messageCount.sent,
          totalReceived: this.messageCount.received,
        });

        this.ws = null;
        this.connectionStartTime = null;

        // Attempt reconnection if it was a connected state (not intentional disconnect)
        if (wasConnected && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };
    } catch (err) {
      this.state = 'disconnected';
      log('WS', 'Failed to create WebSocket', err);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      return; // Already scheduled
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      30000 // Max 30 seconds
    );

    log('WS', 'Scheduling reconnection', {
      attempt: this.reconnectAttempts,
      delay: `${delay}ms`,
      maxAttempts: this.maxReconnectAttempts,
    });

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      const token = this.getToken();
      if (token) {
        this.connect(token);
      }
    }, delay);
  }

  private flushMessageQueue(): void {
    if (this.messageQueue.length === 0) {
      return;
    }

    log('WS', 'Flushing message queue', {
      queueSize: this.messageQueue.length,
    });

    const messages = [...this.messageQueue];
    this.messageQueue = [];

    messages.forEach((command) => {
      this.sendCommand(command);
    });
  }

  sendCommand(command: Command): void {
    if (this.state !== 'connected' || !this.ws) {
      // Queue message for later
      this.messageQueue.push(command);
      log('WS', 'Message queued (not connected)', {
        type: command.type,
        queueSize: this.messageQueue.length,
      });
      return;
    }

    try {
      const message = JSON.stringify(command);
      this.ws.send(message);
      this.messageCount.sent++;

      log('WS', 'Command sent', {
        type: command.type,
        todoId: command.payload.id,
        timestamp: new Date().toISOString(),
        totalSent: this.messageCount.sent,
      });
    } catch (err) {
      console.error('[WS] Failed to send command', err);
      // Queue for retry
      this.messageQueue.push(command);
    }
  }

  on(event: WebSocketEvent, handler: EventHandler): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.eventHandlers.delete(event);
        }
      }
    };
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.state = 'disconnected';
    this.reconnectAttempts = 0;
    this.messageQueue = [];
    log('WS', 'Disconnected');
  }

  getState(): ConnectionState {
    return this.state;
  }

  isConnected(): boolean {
    return this.state === 'connected';
  }
}

export const wsService = new WebSocketService();

