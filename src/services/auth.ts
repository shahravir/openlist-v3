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
    
    // Clear any existing todos before setting new user
    // This ensures we don't mix todos from different users
    // Clear both scoped and non-scoped keys for backward compatibility
    const oldUser = this.currentUser;
    localStorage.removeItem('openlist-todos');
    localStorage.removeItem('openlist-sync-queue');
    localStorage.removeItem('openlist-last-sync');
    
    // Clear old user's scoped keys if they existed
    if (oldUser?.id) {
      localStorage.removeItem(`openlist-todos:${oldUser.id}`);
      localStorage.removeItem(`openlist-sync-queue:${oldUser.id}`);
      localStorage.removeItem(`openlist-last-sync:${oldUser.id}`);
    }
    
    this.setUser(response.user);
    return response;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await apiClient.login(email, password);
    
    // Clear any existing todos before setting new user
    // This ensures we don't mix todos from different users
    // Clear both scoped and non-scoped keys for backward compatibility
    const oldUser = this.currentUser;
    localStorage.removeItem('openlist-todos');
    localStorage.removeItem('openlist-sync-queue');
    localStorage.removeItem('openlist-last-sync');
    
    // Clear old user's scoped keys if they existed
    if (oldUser?.id) {
      localStorage.removeItem(`openlist-todos:${oldUser.id}`);
      localStorage.removeItem(`openlist-sync-queue:${oldUser.id}`);
      localStorage.removeItem(`openlist-last-sync:${oldUser.id}`);
    }
    
    this.setUser(response.user);
    return response;
  }

  logout() {
    const oldUser = this.currentUser;
    this.currentUser = null;
    localStorage.removeItem('auth_user');
    apiClient.clearAuthToken();
    
    // Clear all user-specific data from localStorage
    // Clear both scoped (user-specific) and non-scoped (legacy) keys
    localStorage.removeItem('openlist-todos');
    localStorage.removeItem('openlist-sync-queue');
    localStorage.removeItem('openlist-last-sync');
    
    // Also clear user-scoped keys if we had a user
    if (oldUser?.id) {
      localStorage.removeItem(`openlist-todos:${oldUser.id}`);
      localStorage.removeItem(`openlist-sync-queue:${oldUser.id}`);
      localStorage.removeItem(`openlist-last-sync:${oldUser.id}`);
    }
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

