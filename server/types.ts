export interface User {
  id: string;
  email: string;
  password_hash: string;
  email_verified: boolean;
  verification_token: string | null;
  verification_token_expires: Date | null;
  created_at: Date;
}

export interface Todo {
  id: string;
  user_id: string;
  text: string;
  completed: boolean;
  order: number;
  priority: 'none' | 'low' | 'medium' | 'high';
  due_date: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: Date;
}

export interface TodoTag {
  todo_id: string;
  tag_id: string;
  created_at: Date;
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
    emailVerified: boolean;
  };
}

export interface SyncRequest {
  todos: Array<{
    id: string;
    text: string;
    completed: boolean;
    order: number;
    priority?: 'none' | 'low' | 'medium' | 'high';
    due_date?: number | null;
    tags?: string[];
    created_at: number;
    updated_at: number;
  }>;
}

export interface SyncResponse {
  todos: Array<{
    id: string;
    text: string;
    completed: boolean;
    order: number;
    priority: 'none' | 'low' | 'medium' | 'high';
    due_date?: number | null;
    tags?: string[];
    created_at: number;
    updated_at: number;
  }>;
}

