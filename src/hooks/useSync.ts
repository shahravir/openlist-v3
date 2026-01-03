import { useState, useEffect, useCallback, useRef } from 'react';
import { Todo, SyncStatus } from '../types';
import { apiClient } from '../services/api';
import { useLocalStorage } from './useLocalStorage';

interface SyncQueueItem {
  type: 'create' | 'update' | 'delete';
  todo: Todo;
  timestamp: number;
}

const SYNC_QUEUE_KEY = 'openlist-sync-queue';
const LAST_SYNC_KEY = 'openlist-last-sync';

export function useSync() {
  const [todos, setTodos] = useLocalStorage<Todo[]>('openlist-todos', []);
  const [syncQueue, setSyncQueue] = useLocalStorage<SyncQueueItem[]>(SYNC_QUEUE_KEY, []);
  const [lastSyncTime, setLastSyncTime] = useLocalStorage<number | null>(LAST_SYNC_KEY, null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && syncQueue.length > 0 && !isSyncing) {
      syncWithServer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  // Periodic sync (every 30 seconds when online)
  useEffect(() => {
    if (isOnline) {
      const interval = setInterval(() => {
        if (!isSyncing && syncQueue.length > 0) {
          syncWithServer();
        }
      }, 30000);

      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, isSyncing, syncQueue.length]);

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

    setIsSyncing(true);
    setSyncError(null);

    try {
      // Use override if provided, otherwise use current todos state
      // This ensures we sync the latest todos even if state hasn't updated yet
      const currentTodos = todosToSyncOverride ?? todos;
      
      // Don't sync if we have no todos and this is not an initial sync
      // This prevents overwriting local todos with empty server response
      if (currentTodos.length === 0 && !isInitialSync) {
        console.log('Skipping sync - no todos to sync and not initial sync');
        setIsSyncing(false);
        return;
      }
      
      // Prepare todos for sync - ensure all have updatedAt
      const preparedTodos = currentTodos.map((todo) => ({
        ...todo,
        updatedAt: todo.updatedAt || todo.createdAt,
      }));

      console.log('Syncing todos:', preparedTodos.length, preparedTodos);

      // Sync with server - server handles conflict resolution
      const syncedTodos = await apiClient.syncTodos(preparedTodos);

      console.log('Received from server:', syncedTodos.length, syncedTodos);

      // Server returns the merged state, so we can directly use it
      // But we need to ensure format matches our Todo type
      const mergedTodos: Todo[] = syncedTodos.map((todo) => ({
        id: todo.id,
        text: todo.text,
        completed: todo.completed,
        createdAt: todo.createdAt,
        updatedAt: todo.updatedAt,
      }));

      console.log('Merged todos:', mergedTodos.length, mergedTodos);

      // Only update if we got todos back, or if we had todos to sync
      // This prevents overwriting with empty response
      if (mergedTodos.length > 0 || currentTodos.length > 0) {
        setTodos(mergedTodos);
        setLastSyncTime(Date.now());
      }

      // Clear sync queue after successful sync
      setSyncQueue([]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sync failed';
      setSyncError(errorMessage);
      console.error('Sync error:', error);
      // Don't clear local todos on error - keep what we have
    } finally {
      setIsSyncing(false);
    }
  }, [todos, isSyncing, setTodos, setSyncQueue, setLastSyncTime]);

  const addTodo = useCallback((text: string) => {
    const now = Date.now();
    const newTodo: Todo = {
      id: crypto.randomUUID(),
      text,
      completed: false,
      createdAt: now,
      updatedAt: now,
    };

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
  }, [setTodos, addToSyncQueue, isOnline, syncWithServer]);

  const updateTodo = useCallback((id: string, updates: Partial<Todo>) => {
    setTodos((prev) => {
      const updatedTodos = prev.map((todo) => {
        if (todo.id === id) {
          const updated = {
            ...todo,
            ...updates,
            updatedAt: Date.now(),
          };
          addToSyncQueue(updated, 'update');
          return updated;
        }
        return todo;
      });

      // Trigger sync with updated todos
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
  }, [setTodos, addToSyncQueue, isOnline, syncWithServer]);

  const deleteTodo = useCallback((id: string) => {
    const todoToDelete = todos.find((t) => t.id === id);
    if (todoToDelete) {
      setTodos((prev) => {
        const updatedTodos = prev.filter((t) => t.id !== id);
        
        // Trigger sync with updated todos immediately for deletes
        if (isOnline) {
          syncWithServer(updatedTodos);
        }
        
        return updatedTodos;
      });
      addToSyncQueue(todoToDelete, 'delete');
    }
  }, [todos, setTodos, addToSyncQueue, isOnline, syncWithServer]);

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
    syncWithServer,
    syncStatus,
  };
}

