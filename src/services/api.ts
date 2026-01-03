import axios, { AxiosInstance, AxiosError } from 'axios';
import { Todo, AuthResponse, User } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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
        created_at: number;
        updated_at: number;
      }>;
    }>('/todos/sync', {
      todos: todos.map((todo) => ({
        id: todo.id,
        text: todo.text,
        completed: todo.completed,
        created_at: todo.createdAt,
        updated_at: todo.updatedAt,
      })),
    });
    // Map server response to client Todo format
    return response.data.todos.map((todo) => ({
      id: todo.id,
      text: todo.text,
      completed: todo.completed,
      createdAt: todo.created_at,
      updatedAt: todo.updated_at,
    }));
  }

  async updateTodo(id: string, text: string, completed: boolean): Promise<Todo> {
    const response = await this.client.put<{
      id: string;
      text: string;
      completed: boolean;
      created_at: number;
      updated_at: number;
    }>(`/todos/${id}`, { text, completed });
    return {
      id: response.data.id,
      text: response.data.text,
      completed: response.data.completed,
      createdAt: response.data.created_at,
      updatedAt: response.data.updated_at,
    };
  }

  async deleteTodo(id: string): Promise<void> {
    await this.client.delete(`/todos/${id}`);
  }
}

export const apiClient = new ApiClient();

