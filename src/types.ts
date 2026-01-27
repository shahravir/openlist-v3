export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  order: number;
  priority: 'none' | 'low' | 'medium' | 'high';
  dueDate?: number | null;
  tags?: string[];
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

export interface GmailStatus {
  connected: boolean;
  email?: string;
  lastSyncTime?: number | null;
}

