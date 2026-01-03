import { apiClient } from './api';
import { AuthResponse, User } from '../types';

export class AuthService {
  private currentUser: User | null = null;

  constructor() {
    // Load user from localStorage if available
    const storedUser = localStorage.getItem('auth_user');
    if (storedUser) {
      try {
        this.currentUser = JSON.parse(storedUser);
      } catch {
        this.currentUser = null;
      }
    }

    // Listen for logout events
    window.addEventListener('auth:logout', () => {
      this.logout();
    });
  }

  async register(email: string, password: string): Promise<AuthResponse> {
    const response = await apiClient.register(email, password);
    this.setUser(response.user);
    return response;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await apiClient.login(email, password);
    this.setUser(response.user);
    return response;
  }

  logout() {
    this.currentUser = null;
    localStorage.removeItem('auth_user');
    apiClient.clearAuthToken();
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null && apiClient.isOnline();
  }

  getUser(): User | null {
    return this.currentUser;
  }

  private setUser(user: User) {
    this.currentUser = user;
    localStorage.setItem('auth_user', JSON.stringify(user));
  }
}

export const authService = new AuthService();

