export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  order: number;
  dueDate?: number | null;
  createdAt: number;
  updatedAt: number;
  userId?: string; // Optional, for local-only todos before sync
}

export interface User {
  id: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: number | null;
  pendingChanges: number;
  error: string | null;
}

