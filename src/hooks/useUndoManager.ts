import { useState, useCallback } from 'react';
import { Todo } from '../types';

export type UndoAction = 
  | { type: 'delete'; todo: Todo }
  | { type: 'complete'; todo: Todo; previousCompleted: boolean }
  | { type: 'edit'; todo: Todo; previousText: string };

interface UndoState {
  action: UndoAction;
  timestamp: number;
}

const MAX_UNDO_HISTORY = 10;

export function useUndoManager() {
  const [undoHistory, setUndoHistory] = useState<UndoState[]>([]);

  const addUndoAction = useCallback((action: UndoAction) => {
    setUndoHistory((prev) => {
      const newHistory = [
        {
          action,
          timestamp: Date.now(),
        },
        ...prev,
      ].slice(0, MAX_UNDO_HISTORY);
      return newHistory;
    });
  }, []);

  const getLastAction = useCallback((): UndoState | null => {
    return undoHistory.length > 0 ? undoHistory[0] : null;
  }, [undoHistory]);

  const removeLastAction = useCallback(() => {
    setUndoHistory((prev) => prev.slice(1));
  }, []);

  const clearHistory = useCallback(() => {
    setUndoHistory([]);
  }, []);

  return {
    addUndoAction,
    getLastAction,
    removeLastAction,
    clearHistory,
    historyLength: undoHistory.length,
  };
}
