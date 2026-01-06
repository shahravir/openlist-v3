import { useState, useEffect, useCallback, useRef } from 'react';
import { Todo, SyncStatus } from '../types';
import { apiClient } from '../services/api';
import { useLocalStorage } from './useLocalStorage';
import { wsService } from '../services/websocket';

interface SyncQueueItem {
  type: 'create' | 'update' | 'delete';
  todo: Todo;
  timestamp: number;
}

// Get user-scoped localStorage keys to prevent cross-user data leakage
const getStorageKey = (baseKey: string): string => {
  // Try to get current user ID from auth service
  try {
    const authUser = localStorage.getItem('auth_user');
    if (authUser) {
      const user = JSON.parse(authUser);
      if (user?.id) {
        return `${baseKey}:${user.id}`;
      }
    }
  } catch {
    // Fallback to base key if parsing fails
  }
  return baseKey;
};

const SYNC_QUEUE_KEY = 'openlist-sync-queue';
const LAST_SYNC_KEY = 'openlist-last-sync';
const TODOS_KEY = 'openlist-todos';

const DEBUG_KEY = 'openlist:debug';

function isDebugMode(): boolean {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(DEBUG_KEY) === 'true';
  }
  return false;
}

function logSync(prefix: string, message: string, data?: any) {
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

export function useSync() {
  // Use user-scoped keys to prevent cross-user data leakage
  const [todos, setTodos] = useLocalStorage<Todo[]>(getStorageKey(TODOS_KEY), []);
  const [syncQueue, setSyncQueue] = useLocalStorage<SyncQueueItem[]>(getStorageKey(SYNC_QUEUE_KEY), []);
  const [lastSyncTime, setLastSyncTime] = useLocalStorage<number | null>(getStorageKey(LAST_SYNC_KEY), null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wsConnected, setWsConnected] = useState(false);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncStatsRef = useRef({ websocket: 0, http: 0 });
  const previousUserIdRef = useRef<string | null>(null);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Clear todos when user changes (prevent cross-user data leakage)
  useEffect(() => {
    try {
      const authUser = localStorage.getItem('auth_user');
      const currentUserId = authUser ? JSON.parse(authUser)?.id : null;
      
      // If user ID changed (or user logged out), clear todos
      if (previousUserIdRef.current !== null && previousUserIdRef.current !== currentUserId) {
        logSync('SYNC', 'User changed, clearing todos', { 
          previousUserId: previousUserIdRef.current, 
          currentUserId 
        });
        setTodos([]);
        setSyncQueue([]);
        setLastSyncTime(null);
      }
      
      previousUserIdRef.current = currentUserId;
    } catch (error) {
      // If we can't read user, that's okay - might be logged out
      if (previousUserIdRef.current !== null) {
        logSync('SYNC', 'User logged out, clearing todos');
        setTodos([]);
        setSyncQueue([]);
        setLastSyncTime(null);
        previousUserIdRef.current = null;
      }
    }
  }, [setTodos, setSyncQueue, setLastSyncTime]);

  // Merge todos from server with conflict resolution
  const mergeTodosFromServer = useCallback((serverTodos: Todo[]) => {
    setTodos((prev) => {
      const merged = new Map<string, Todo>();

      // Add all local todos first
      prev.forEach((todo) => {
        merged.set(todo.id, todo);
      });

      // Merge server todos (server wins if timestamp is newer or equal)
      serverTodos.forEach((serverTodo) => {
        const localTodo = merged.get(serverTodo.id);
        if (!localTodo) {
          // New todo from server
          merged.set(serverTodo.id, serverTodo);
          logSync('SYNC', 'Added new todo from server', { todoId: serverTodo.id });
        } else {
          // Conflict resolution: use server version if it's newer or equal
          if (serverTodo.updatedAt >= localTodo.updatedAt) {
            // Use server version, but preserve local dueDate, priority, and tags if server version doesn't have them
            // and timestamps are equal (meaning no actual update happened on server)
            const mergedTodo = {
              ...serverTodo,
              // Preserve local dueDate if:
              // 1. Server has null/undefined for dueDate
              // 2. Local has a dueDate value
              // 3. Timestamps are equal (no actual server update happened)
              // This prevents losing dueDate when server sync returns stale data
              dueDate: (serverTodo.dueDate == null && localTodo.dueDate != null && serverTodo.updatedAt === localTodo.updatedAt)
                ? localTodo.dueDate
                : serverTodo.dueDate,
              // Preserve local priority if:
              // 1. Server has 'none' or undefined for priority
              // 2. Local has a non-'none' priority value
              // 3. Timestamps are equal (no actual server update happened)
              // This prevents losing priority when server sync returns stale data
              priority: (serverTodo.updatedAt === localTodo.updatedAt && 
                         (serverTodo.priority === 'none' || !serverTodo.priority) && 
                         localTodo.priority && localTodo.priority !== 'none')
                ? localTodo.priority
                : (serverTodo.priority ?? 'none'),
              // Preserve local tags if:
              // 1. Server has empty/undefined tags
              // 2. Local has tags
              // 3. Timestamps are equal (no actual server update happened) - means server hasn't synced tags yet
              // OR if server timestamp is only slightly newer (within 2 seconds) - likely a race condition
              // This prevents losing tags when server sync returns stale data or hasn't synced tags yet
              tags: (() => {
                const timeDiff = serverTodo.updatedAt - localTodo.updatedAt;
                const isLikelyRaceCondition = timeDiff >= 0 && timeDiff < 2000; // Within 2 seconds
                if ((!serverTodo.tags || serverTodo.tags.length === 0) && 
                    localTodo.tags && localTodo.tags.length > 0 &&
                    (serverTodo.updatedAt === localTodo.updatedAt || isLikelyRaceCondition)) {
                  return localTodo.tags;
                }
                if (serverTodo.tags && serverTodo.tags.length > 0) {
                  return serverTodo.tags;
                }
                return localTodo.tags ?? [];
              })(),
            };
            merged.set(serverTodo.id, mergedTodo);
            if (serverTodo.updatedAt > localTodo.updatedAt) {
              logSync('CONFLICT', 'Server version kept', {
                todoId: serverTodo.id,
                serverTime: serverTodo.updatedAt,
                localTime: localTodo.updatedAt,
              });
            }
          } else {
            logSync('CONFLICT', 'Local version kept', {
              todoId: serverTodo.id,
              serverTime: serverTodo.updatedAt,
              localTime: localTodo.updatedAt,
            });
          }
        }
      });

      const mergedArray = Array.from(merged.values());
      logSync('SYNC', 'State merged', {
        localCount: prev.length,
        serverCount: serverTodos.length,
        mergedCount: mergedArray.length,
      });

      return mergedArray;
    });
    setLastSyncTime(Date.now());
  }, [setTodos, setLastSyncTime]);

  // Initialize WebSocket connection when authenticated
  useEffect(() => {
    const checkAndConnect = () => {
      const token = localStorage.getItem('auth_token');
      const isConnected = wsService.isConnected();
      
      if (token && !isConnected) {
        logSync('WS', 'Connecting WebSocket...', { hasToken: !!token });
        wsService.connect(token);
      } else if (!token && isConnected) {
        logSync('WS', 'Disconnecting WebSocket (no token)');
        wsService.disconnect();
        setWsConnected(false);
      } else if (token && isConnected) {
        // Already connected, just update state
        setWsConnected(true);
      }
    };

    // Check immediately
    checkAndConnect();

    // Listen for connection state changes
    const checkConnection = () => {
      const isConnected = wsService.isConnected();
      if (isConnected !== wsConnected) {
        logSync('WS', `Connection state changed: ${wsConnected ? 'disconnected' : 'connected'} -> ${isConnected ? 'connected' : 'disconnected'}`);
        setWsConnected(isConnected);
      }
    };

    // Check connection state periodically
    const connectionInterval = setInterval(() => {
      checkAndConnect();
      checkConnection();
    }, 1000);
    
    // Also listen for auth token changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_token') {
        logSync('WS', 'Auth token changed, reconnecting WebSocket');
        checkAndConnect();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    
    // Listen for custom auth events
    const handleAuthChange = () => {
      logSync('WS', 'Auth state changed, reconnecting WebSocket');
      checkAndConnect();
      // Clear todos when user changes to prevent data leakage
      // The new user's todos will be loaded from server on initial sync
      setTodos([]);
      setSyncQueue([]);
      setLastSyncTime(null);
      previousUserIdRef.current = null; // Reset to trigger user change detection
    };
    window.addEventListener('auth:login', handleAuthChange);
    const handleLogout = () => {
      wsService.disconnect();
      setWsConnected(false);
      // Clear todos when user logs out to prevent data leakage
      setTodos([]);
      setSyncQueue([]);
      setLastSyncTime(null);
      previousUserIdRef.current = null;
    };
    window.addEventListener('auth:logout', handleLogout);

    // Helper to transform server format to client format
    const transformServerTodos = (serverData: any[]): Todo[] => {
      return serverData.map((item: any) => ({
        id: item.id,
        text: item.text,
        completed: item.completed,
        order: item.order ?? 0,
        priority: item.priority ?? 'none',
        dueDate: item.due_date ?? item.dueDate ?? null,
        tags: item.tags ?? [],
        createdAt: item.created_at ?? item.createdAt,
        updatedAt: item.updated_at ?? item.updatedAt,
        userId: item.userId,
      }));
    };

    // Listen for WebSocket events
    const unsubscribeCreated = wsService.on('todo:created', (data: any) => {
      logSync('SYNC', 'Received todo:created event', { data });
      const todos = Array.isArray(data) ? transformServerTodos(data) : transformServerTodos([data]);
      mergeTodosFromServer(todos);
    });

    const unsubscribeUpdated = wsService.on('todo:updated', (data: any) => {
      logSync('SYNC', 'Received todo:updated event', { data });
      const todos = Array.isArray(data) ? transformServerTodos(data) : transformServerTodos([data]);
      mergeTodosFromServer(todos);
    });

    const unsubscribeDeleted = wsService.on('todo:deleted', (data: any) => {
      logSync('SYNC', 'Received todo:deleted event', { data });
      const deletedIds = Array.isArray(data) 
        ? data.map((d: any) => d.id || d)
        : [data.id || data];
      setTodos((prev) => {
        const deletedSet = new Set(deletedIds);
        return prev.filter((todo) => !deletedSet.has(todo.id));
      });
      setLastSyncTime(Date.now());
    });

    const unsubscribeSynced = wsService.on('todos:synced', (data: any) => {
      logSync('SYNC', 'Received todos:synced event', { data });
      const todos = Array.isArray(data) ? transformServerTodos(data) : transformServerTodos([data]);
      mergeTodosFromServer(todos);
    });

    return () => {
      clearInterval(connectionInterval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth:login', handleAuthChange);
      window.removeEventListener('auth:logout', handleAuthChange);
      unsubscribeCreated();
      unsubscribeUpdated();
      unsubscribeDeleted();
      unsubscribeSynced();
      // Don't disconnect on unmount - keep connection alive for other components
      // wsService.disconnect();
    };
  }, [wsConnected, mergeTodosFromServer]);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && syncQueue.length > 0 && !isSyncing) {
      syncWithServer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  // Periodic sync (every 30 seconds when online, only if WebSocket is disconnected)
  useEffect(() => {
    if (isOnline && !wsConnected) {
      const interval = setInterval(() => {
        if (!isSyncing && syncQueue.length > 0) {
          logSync('SYNC', 'Periodic sync triggered (WebSocket disconnected)');
          syncWithServer();
        }
      }, 30000);

      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, isSyncing, syncQueue.length, wsConnected]);

  const addToSyncQueue = useCallback((todo: Todo, type: 'create' | 'update' | 'delete') => {
    setSyncQueue((prev) => [
      ...prev,
      {
        type,
        todo,
        timestamp: Date.now(),
      },
    ]);
  }, [setSyncQueue]);

  const syncWithServer = useCallback(async (todosToSyncOverride?: Todo[], isInitialSync: boolean = false) => {
    if (!apiClient.isOnline() || isSyncing) {
      return;
    }

    // Use HTTP fallback if WebSocket is not connected
    const syncMethod = wsConnected ? 'websocket' : 'http';
    
    // For WebSocket, we don't do full sync - commands are sent individually
    // Only use HTTP sync when WebSocket is disconnected
    if (syncMethod === 'websocket' && !isInitialSync) {
      logSync('SYNC', 'Skipping HTTP sync - WebSocket connected');
      return;
    }

    logSync('SYNC', `Using ${syncMethod.toUpperCase()} fallback`, {
      isInitialSync,
      todosCount: todosToSyncOverride?.length || todos.length,
    });

    setIsSyncing(true);
    setSyncError(null);
    const syncStartTime = Date.now();

    try {
      // Use override if provided, otherwise use current todos state
      // This ensures we sync the latest todos even if state hasn't updated yet
      const currentTodos = todosToSyncOverride ?? todos;
      
      // Don't sync if we have no todos and this is not an initial sync
      // This prevents overwriting local todos with empty server response
      if (currentTodos.length === 0 && !isInitialSync) {
        logSync('SYNC', 'Skipping sync - no todos to sync and not initial sync');
        setIsSyncing(false);
        return;
      }
      
      // Prepare todos for sync - ensure all have updatedAt
      const preparedTodos = currentTodos.map((todo) => ({
        ...todo,
        updatedAt: todo.updatedAt || todo.createdAt,
      }));

      logSync('SYNC', 'Syncing todos', {
        method: syncMethod,
        count: preparedTodos.length,
        dataSize: JSON.stringify(preparedTodos).length,
      });

      // Sync with server - server handles conflict resolution
      const syncedTodos = await apiClient.syncTodos(preparedTodos);

      const syncDuration = Date.now() - syncStartTime;
      syncStatsRef.current.http++;

      logSync('SYNC', 'Received from server', {
        method: syncMethod,
        count: syncedTodos.length,
        duration: `${syncDuration}ms`,
      });

      // Server returns the merged state, already converted to Todo format by apiClient
      // The apiClient.syncTodos() already converts due_date to dueDate
      const mergedTodos: Todo[] = syncedTodos;

      // Only update if we got todos back, or if we had todos to sync
      // This prevents overwriting with empty response
      // Use mergeTodosFromServer to preserve local state for todos not in server response
      if (mergedTodos.length > 0 || currentTodos.length > 0) {
        mergeTodosFromServer(mergedTodos);
        setLastSyncTime(Date.now());
      }

      // Clear sync queue after successful sync
      setSyncQueue([]);
    } catch (error) {
      // Enhanced error logging
      let errorMessage = 'Sync failed';
      let errorDetails: any = {};

      if (error instanceof Error) {
        errorMessage = error.message;
        errorDetails = {
          name: error.name,
          message: error.message,
          stack: error.stack,
        };
      }

      // Check if it's an Axios error for more details
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any;
        errorDetails = {
          ...errorDetails,
          status: axiosError.response?.status,
          statusText: axiosError.response?.statusText,
          data: axiosError.response?.data,
          url: axiosError.config?.url,
        };
        if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        } else if (axiosError.response?.status) {
          errorMessage = `HTTP ${axiosError.response.status}: ${axiosError.response.statusText || errorMessage}`;
        }
      }

      setSyncError(errorMessage);
      logSync('SYNC', 'Sync error', { 
        method: syncMethod, 
        error: errorMessage,
        details: errorDetails,
      });
      // Don't clear local todos on error - keep what we have
    } finally {
      setIsSyncing(false);
    }
  }, [todos, isSyncing, wsConnected, setTodos, setSyncQueue, setLastSyncTime]);

  const addTodo = useCallback((text: string, dueDate?: number | null, priority: 'none' | 'low' | 'medium' | 'high' = 'none', tags?: string[]) => {
    const now = Date.now();
    
    // Get the max order from existing todos to append at the end
    const maxOrder = todos.reduce((max, todo) => Math.max(max, todo.order), 0);
    
    const newTodo: Todo = {
      id: crypto.randomUUID(),
      text,
      completed: false,
      order: maxOrder + 1,
      priority,
      dueDate: dueDate || null,
      tags: tags || [],
      createdAt: now,
      updatedAt: now,
    };

    // Update state immediately
    setTodos((prev) => [newTodo, ...prev]);
    
    // Send via WebSocket if connected, otherwise use HTTP fallback
    if (wsConnected && wsService.isConnected()) {
      logSync('SYNC', 'Using WebSocket', { operation: 'create', todoId: newTodo.id });
      syncStatsRef.current.websocket++;
      wsService.sendCommand({
        type: 'todo:create',
        payload: {
          id: newTodo.id,
          text: newTodo.text,
          completed: newTodo.completed,
          order: newTodo.order,
          due_date: newTodo.dueDate,
          tags: newTodo.tags,
          createdAt: newTodo.createdAt,
          updatedAt: newTodo.updatedAt,
        },
      });
    } else {
      logSync('SYNC', 'Using HTTP fallback', { operation: 'create', todoId: newTodo.id });
      // Update state and get the new todos array immediately
      setTodos((prev) => {
        const updatedTodos = [newTodo, ...prev];
        
        // Trigger sync with the updated todos to avoid stale state
        if (syncTimeoutRef.current) {
          clearTimeout(syncTimeoutRef.current);
        }
        syncTimeoutRef.current = setTimeout(() => {
          if (isOnline) {
            // Pass the updated todos directly to avoid stale state
            syncWithServer(updatedTodos);
          }
        }, 1000);
        
        return updatedTodos;
      });
      
      addToSyncQueue(newTodo, 'create');
    }
  }, [setTodos, addToSyncQueue, isOnline, syncWithServer, wsConnected]);

  const updateTodo = useCallback((id: string, updates: Partial<Todo>) => {
    setTodos((prev) => {
      const todo = prev.find((t) => t.id === id);
      if (!todo) return prev;

      const updated = {
        ...todo,
        ...updates,
        updatedAt: Date.now(),
      };

      // Send via WebSocket if connected, otherwise use HTTP fallback
      if (wsConnected && wsService.isConnected()) {
        logSync('SYNC', 'Using WebSocket', { operation: 'update', todoId: id });
        syncStatsRef.current.websocket++;
        wsService.sendCommand({
          type: 'todo:update',
          payload: {
            id: updated.id,
            text: updated.text,
            completed: updated.completed,
            order: updated.order,
            priority: updated.priority,
            due_date: updated.dueDate,
            tags: updated.tags,
            createdAt: updated.createdAt,
            updatedAt: updated.updatedAt,
          },
        });
      } else {
        logSync('SYNC', 'Using HTTP fallback', { operation: 'update', todoId: id });
        addToSyncQueue(updated, 'update');
        
        // Trigger sync with updated todos
        if (syncTimeoutRef.current) {
          clearTimeout(syncTimeoutRef.current);
        }
        syncTimeoutRef.current = setTimeout(() => {
          if (isOnline) {
            const updatedTodos = prev.map((t) => (t.id === id ? updated : t));
            syncWithServer(updatedTodos);
          }
        }, 1000);
      }

      return prev.map((t) => (t.id === id ? updated : t));
    });
  }, [setTodos, addToSyncQueue, isOnline, syncWithServer, wsConnected]);

  const deleteTodo = useCallback((id: string) => {
    const todoToDelete = todos.find((t) => t.id === id);
    if (!todoToDelete) return;

    // Update state immediately
    setTodos((prev) => prev.filter((t) => t.id !== id));

    // Send via WebSocket if connected, otherwise use HTTP fallback
    if (wsConnected && wsService.isConnected()) {
      logSync('SYNC', 'Using WebSocket', { operation: 'delete', todoId: id });
      syncStatsRef.current.websocket++;
      wsService.sendCommand({
        type: 'todo:delete',
        payload: {
          id: todoToDelete.id,
          text: todoToDelete.text,
          completed: todoToDelete.completed,
          order: todoToDelete.order,
          priority: todoToDelete.priority,
          createdAt: todoToDelete.createdAt,
          updatedAt: todoToDelete.updatedAt,
        },
      });
    } else {
      logSync('SYNC', 'Using HTTP fallback', { operation: 'delete', todoId: id });
      // Trigger sync with updated todos immediately for deletes
      if (isOnline) {
        const updatedTodos = todos.filter((t) => t.id !== id);
        syncWithServer(updatedTodos);
      }
      addToSyncQueue(todoToDelete, 'delete');
    }
  }, [todos, setTodos, addToSyncQueue, isOnline, syncWithServer, wsConnected]);

  // Reorder todos - updates the order field for multiple todos
  const reorderTodos = useCallback((reorderedTodos: Todo[]) => {
    // Update todos with new order values
    const todosWithNewOrder = reorderedTodos.map((todo, index) => ({
      ...todo,
      order: index,
      updatedAt: Date.now(),
    }));

    // Update state immediately
    setTodos(todosWithNewOrder);

    // Send via WebSocket if connected, otherwise use HTTP fallback
    if (wsConnected && wsService.isConnected()) {
      logSync('SYNC', 'Reordering via WebSocket', { count: todosWithNewOrder.length });
      // Send individual updates for each reordered todo
      todosWithNewOrder.forEach((todo) => {
        wsService.sendCommand({
          type: 'todo:update',
          payload: {
            id: todo.id,
            text: todo.text,
            completed: todo.completed,
            order: todo.order,
            priority: todo.priority,
            due_date: todo.dueDate,
            tags: todo.tags,
            createdAt: todo.createdAt,
            updatedAt: todo.updatedAt,
          },
        });
      });
    } else {
      logSync('SYNC', 'Reordering via HTTP fallback', { count: todosWithNewOrder.length });
      // Trigger sync with reordered todos
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      syncTimeoutRef.current = setTimeout(() => {
        if (isOnline) {
          syncWithServer(todosWithNewOrder);
        }
      }, 1000);
    }
  }, [setTodos, isOnline, syncWithServer, wsConnected]);

  const restoreTodo = useCallback((todo: Todo) => {
    // Send via WebSocket if connected, otherwise use HTTP fallback
    if (wsConnected && wsService.isConnected()) {
      logSync('SYNC', 'Restoring via WebSocket', { operation: 'restore', todoId: todo.id });
      syncStatsRef.current.websocket++;
      
      // Update state immediately
      setTodos((prev) => [todo, ...prev]);
      
      // Send command to server
      wsService.sendCommand({
        type: 'todo:create',
        payload: {
          id: todo.id,
          text: todo.text,
          completed: todo.completed,
          order: todo.order,
          priority: todo.priority,
          due_date: todo.dueDate,
          tags: todo.tags,
          createdAt: todo.createdAt,
          updatedAt: todo.updatedAt,
        },
      });
    } else {
      logSync('SYNC', 'Restoring via HTTP fallback', { operation: 'restore', todoId: todo.id });
      // Update state and sync
      setTodos((prev) => {
        const updatedTodos = [todo, ...prev];
        
        // Trigger sync with the updated todos
        if (syncTimeoutRef.current) {
          clearTimeout(syncTimeoutRef.current);
        }
        syncTimeoutRef.current = setTimeout(() => {
          if (isOnline) {
            syncWithServer(updatedTodos);
          }
        }, 1000);
        
        return updatedTodos;
      });
      
      addToSyncQueue(todo, 'create');
    }
  }, [setTodos, addToSyncQueue, isOnline, syncWithServer, wsConnected]);

  const syncStatus: SyncStatus = {
    isOnline,
    isSyncing,
    lastSyncTime,
    pendingChanges: syncQueue.length,
    error: syncError,
  };

  return {
    todos,
    addTodo,
    updateTodo,
    deleteTodo,
    restoreTodo,
    reorderTodos,
    syncWithServer,
    syncStatus,
  };
}

