import axios, { AxiosInstance, AxiosError } from 'axios';
import { Todo, AuthResponse } from '../types';
import { getApiBaseUrl } from '../utils/config';

const API_BASE_URL = getApiBaseUrl();

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Load token from localStorage on initialization
    this.token = localStorage.getItem('auth_token');
    if (this.token) {
      this.setAuthToken(this.token);
    }

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        // Log detailed error for debugging
        if (error.response) {
          // Server responded with error status
          console.error('[API] Server error:', {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data,
            url: error.config?.url,
          });
        } else if (error.request) {
          // Request was made but no response received
          console.error('[API] Network error:', {
            message: error.message,
            url: error.config?.url,
            baseURL: error.config?.baseURL,
          });
        } else {
          // Error setting up the request
          console.error('[API] Request setup error:', error.message);
        }

        if (error.response?.status === 401) {
          // Token expired or invalid
          this.clearAuthToken();
          window.dispatchEvent(new CustomEvent('auth:logout'));
        }
        return Promise.reject(error);
      }
    );
  }

  setAuthToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  clearAuthToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
    delete this.client.defaults.headers.common['Authorization'];
  }

  isOnline(): boolean {
    return navigator.onLine;
  }

  // Auth endpoints
  async register(email: string, password: string): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/auth/register', {
      email,
      password,
    });
    if (response.data.token) {
      this.setAuthToken(response.data.token);
    }
    return response.data;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/auth/login', {
      email,
      password,
    });
    if (response.data.token) {
      this.setAuthToken(response.data.token);
    }
    return response.data;
  }

  // Todo endpoints
  async getTodos(): Promise<Todo[]> {
    const response = await this.client.get<{ todos: Todo[] }>('/todos');
    return response.data.todos;
  }

  async syncTodos(todos: Todo[]): Promise<Todo[]> {
    const response = await this.client.post<{
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
    }>('/todos/sync', {
      todos: todos.map((todo) => ({
        id: todo.id,
        text: todo.text,
        completed: todo.completed,
        order: todo.order,
        priority: todo.priority,
        due_date: todo.dueDate,
        tags: todo.tags,
        created_at: todo.createdAt,
        updated_at: todo.updatedAt,
      })),
    });
    // Map server response to client Todo format
    return response.data.todos.map((todo) => ({
      id: todo.id,
      text: todo.text,
      completed: todo.completed,
      order: todo.order,
      priority: todo.priority,
      dueDate: todo.due_date,
      tags: todo.tags,
      createdAt: todo.created_at,
      updatedAt: todo.updated_at,
    }));
  }

  async updateTodo(id: string, text: string, completed: boolean, order?: number, dueDate?: number | null, priority?: 'none' | 'low' | 'medium' | 'high', tags?: string[]): Promise<Todo> {
    const response = await this.client.put<{
      id: string;
      text: string;
      completed: boolean;
      order: number;
      priority: 'none' | 'low' | 'medium' | 'high';
      due_date?: number | null;
      tags?: string[];
      created_at: number;
      updated_at: number;
    }>(`/todos/${id}`, { text, completed, order, priority, due_date: dueDate, tags });
    return {
      id: response.data.id,
      text: response.data.text,
      completed: response.data.completed,
      order: response.data.order,
      priority: response.data.priority,
      dueDate: response.data.due_date,
      tags: response.data.tags,
      createdAt: response.data.created_at,
      updatedAt: response.data.updated_at,
    };
  }

  async deleteTodo(id: string): Promise<void> {
    await this.client.delete(`/todos/${id}`);
  }

  // Tag endpoints
  async getTags(): Promise<Array<{ id: string; name: string; color: string; created_at: number }>> {
    const response = await this.client.get<{ tags: Array<{ id: string; name: string; color: string; created_at: number }> }>('/tags');
    return response.data.tags;
  }

  async createTag(name: string, color?: string): Promise<{ id: string; name: string; color: string; created_at: number }> {
    const response = await this.client.post<{ id: string; name: string; color: string; created_at: number }>('/tags', { name, color });
    return response.data;
  }

  async updateTag(id: string, name?: string, color?: string): Promise<{ id: string; name: string; color: string; created_at: number }> {
    const response = await this.client.put<{ id: string; name: string; color: string; created_at: number }>(`/tags/${id}`, { name, color });
    return response.data;
  }

  async deleteTag(id: string): Promise<void> {
    await this.client.delete(`/tags/${id}`);
  }
}

export const apiClient = new ApiClient();

