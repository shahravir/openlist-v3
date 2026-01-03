import { useState, useEffect, useCallback } from 'react';
import { Todo } from './types';
import { TodoInput } from './components/TodoInput';
import { TodoList } from './components/TodoList';
import { useSync } from './hooks/useSync';
import { authService } from './services/auth';
import { apiClient } from './services/api';
import { LoginForm } from './components/Auth/LoginForm';
import { RegisterForm } from './components/Auth/RegisterForm';
import { SyncStatus } from './components/SyncStatus';

type AuthView = 'login' | 'register';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());
  const [authView, setAuthView] = useState<AuthView>('login');
  const [isLoading, setIsLoading] = useState(true);
  const { todos, addTodo, updateTodo, deleteTodo, syncWithServer, syncStatus } = useSync();

  // Initial sync on mount if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const loadInitialData = async () => {
        try {
          setIsLoading(true);
          // Sync with server to merge local and server todos
          // Pass true to indicate this is initial sync (allows empty todos)
          await syncWithServer(undefined, true);
        } catch (error) {
          console.error('Failed to load initial data:', error);
        } finally {
          setIsLoading(false);
        }
      };
      loadInitialData();
    } else {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    authService.logout();
    setIsAuthenticated(false);
  };

  const handleToggle = useCallback((id: string) => {
    const todo = todos.find((t) => t.id === id);
    if (todo) {
      updateTodo(id, { completed: !todo.completed });
    }
  }, [todos, updateTodo]);

  // Sort todos: incomplete first, then by creation date
  const sortedTodos = [...todos].sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    return b.createdAt - a.createdAt;
  });

  const completedCount = todos.filter((t) => t.completed).length;
  const totalCount = todos.length;
  const user = authService.getUser();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4 py-12">
        {authView === 'login' ? (
          <LoginForm
            onSuccess={handleLoginSuccess}
            onSwitchToRegister={() => setAuthView('register')}
          />
        ) : (
          <RegisterForm
            onSuccess={handleLoginSuccess}
            onSwitchToLogin={() => setAuthView('login')}
          />
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8 md:py-12">
        {/* Header */}
        <header className="mb-8 sm:mb-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-2">
                OpenList
              </h1>
              {user && (
                <p className="text-sm text-gray-500">{user.email}</p>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Logout
            </button>
          </div>
          
          {totalCount > 0 && (
            <p className="text-sm sm:text-base text-gray-500 mb-2">
              {completedCount} of {totalCount} completed
            </p>
          )}

          {/* Sync Status */}
          <div className="mt-2">
            <SyncStatus status={syncStatus} />
          </div>
        </header>

        {/* Input */}
        <div className="mb-6 sm:mb-8">
          <TodoInput onAdd={addTodo} />
        </div>

        {/* Todo List */}
        <TodoList
          todos={sortedTodos}
          onToggle={handleToggle}
          onDelete={deleteTodo}
        />
      </div>
    </div>
  );
}

export default App;

