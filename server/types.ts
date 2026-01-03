export interface User {
  id: string;
  email: string;
  password_hash: string;
  created_at: Date;
}

export interface Todo {
  id: string;
  user_id: string;
  text: string;
  completed: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
  };
}

export interface SyncRequest {
  todos: Array<{
    id: string;
    text: string;
    completed: boolean;
    created_at: number;
    updated_at: number;
  }>;
}

export interface SyncResponse {
  todos: Array<{
    id: string;
    text: string;
    completed: boolean;
    created_at: number;
    updated_at: number;
  }>;
}

