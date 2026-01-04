import { useState, useEffect, useCallback, useMemo } from 'react';
import { FloatingActionButton } from './components/FloatingActionButton';
import { TodoList } from './components/TodoList';
import { FilterMenu, FilterStatus } from './components/FilterMenu';
import { Sidebar } from './components/Sidebar';
import { SearchModal } from './components/SearchModal';
import { BurgerMenuButton } from './components/BurgerMenuButton';
import { Backdrop } from './components/Backdrop';
import { Toast } from './components/Toast';
import { useSync } from './hooks/useSync';
import { useUndoManager, UndoAction } from './hooks/useUndoManager';
import { authService } from './services/auth';
import { LoginForm } from './components/Auth/LoginForm';
import { RegisterForm } from './components/Auth/RegisterForm';
import { SyncStatus } from './components/SyncStatus';
import { filterTodosBySearch, debounce } from './utils/searchUtils';
import { SEARCH_DEBOUNCE_DELAY_MS } from './utils/constants';

type AuthView = 'login' | 'register';

interface ToastState {
  message: string;
  action: UndoAction;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());
  const [authView, setAuthView] = useState<AuthView>('login');
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [toastState, setToastState] = useState<ToastState | null>(null);
  const { todos, addTodo, updateTodo, deleteTodo, reorderTodos, syncWithServer, syncStatus } = useSync();
  const { addUndoAction, getLastAction, removeLastAction } = useUndoManager();

  // Debounced search with configurable delay
  const debouncedSetSearch = useMemo(
    () => debounce(setDebouncedSearchQuery, SEARCH_DEBOUNCE_DELAY_MS),
    []
  );

  useEffect(() => {
    debouncedSetSearch(searchQuery);
  }, [searchQuery, debouncedSetSearch]);

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
    setAuthView('login'); // Reset to login view after logout
    setIsSidebarOpen(false); // Close sidebar on logout
    setIsSearchModalOpen(false); // Close search modal on logout
  };

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const openSearchModal = () => {
    setIsSearchModalOpen(true);
  };

  const closeSearchModal = () => {
    setIsSearchModalOpen(false);
    setSearchQuery(''); // Clear search filter when closing modal
  };

  // Keyboard shortcut: Ctrl/Cmd + B to toggle sidebar (mobile/tablet only)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        // Only toggle on mobile/tablet, not desktop
        if (window.innerWidth < 1024) {
          toggleSidebar();
        }
      }
      // Ctrl/Cmd + K to open search modal
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        openSearchModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside detection for desktop (only when not persistent)
  useEffect(() => {
    // On desktop, sidebar is persistent, so no click-outside needed
    if (window.innerWidth >= 1024) return;
    if (!isSidebarOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const sidebar = document.querySelector('[role="navigation"]');
      const burgerButton = document.querySelector('[aria-label*="navigation menu"]');

      // Close if clicking outside sidebar and not on the burger button
      if (
        sidebar &&
        !sidebar.contains(target) &&
        burgerButton &&
        !burgerButton.contains(target)
      ) {
        closeSidebar();
      }
    };

    // Add slight delay to avoid closing immediately on open
    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSidebarOpen]);

  const handleToggle = useCallback((id: string) => {
    const todo = todos.find((t) => t.id === id);
    if (todo) {
      const previousCompleted = todo.completed;
      updateTodo(id, { completed: !todo.completed });
      
      // Track undo action
      addUndoAction({
        type: 'complete',
        todo: { ...todo },
        previousCompleted,
      });
      
      // Show toast notification
      setToastState({
        message: previousCompleted ? 'Task marked as incomplete' : 'Task marked as complete',
        action: {
          type: 'complete',
          todo: { ...todo },
          previousCompleted,
        },
      });
    }
  }, [todos, updateTodo, addUndoAction]);

  const handleUpdate = useCallback((id: string, text: string) => {
    const todo = todos.find((t) => t.id === id);
    if (todo && text !== todo.text) {
      const previousText = todo.text;
      updateTodo(id, { text });
      
      // Track undo action
      addUndoAction({
        type: 'edit',
        todo: { ...todo, text },
        previousText,
      });
      
      // Show toast notification
      setToastState({
        message: 'Task updated',
        action: {
          type: 'edit',
          todo: { ...todo, text },
          previousText,
        },
      });
    }
  }, [todos, updateTodo, addUndoAction]);
  
  const handleDelete = useCallback((id: string) => {
    const todo = todos.find((t) => t.id === id);
    if (todo) {
      deleteTodo(id);
      
      // Track undo action
      addUndoAction({
        type: 'delete',
        todo: { ...todo },
      });
      
      // Show toast notification
      setToastState({
        message: 'Task deleted',
        action: {
          type: 'delete',
          todo: { ...todo },
        },
      });
    }
  }, [todos, deleteTodo, addUndoAction]);
  
  const handleUndo = useCallback(() => {
    const lastAction = getLastAction();
    if (!lastAction) return;
    
    const { action } = lastAction;
    
    switch (action.type) {
      case 'delete':
        // Restore the deleted todo
        addTodo(action.todo.text);
        break;
      case 'complete':
        // Restore previous completion state
        updateTodo(action.todo.id, { completed: action.previousCompleted });
        break;
      case 'edit':
        // Restore previous text
        updateTodo(action.todo.id, { text: action.previousText });
        break;
    }
    
    removeLastAction();
    setToastState(null);
  }, [getLastAction, removeLastAction, addTodo, updateTodo]);
  
  const handleDismissToast = useCallback(() => {
    setToastState(null);
  }, []);

  // Filter and sort todos based on search and filter status
  const filteredTodos = useMemo(() => {
    let filtered = todos;

    // Apply status filter
    if (filterStatus === 'active') {
      filtered = filtered.filter((t) => !t.completed);
    } else if (filterStatus === 'completed') {
      filtered = filtered.filter((t) => t.completed);
    }

    // Apply search filter (debounced)
    if (debouncedSearchQuery) {
      filtered = filtered.filter((t) => filterTodosBySearch(t.text, debouncedSearchQuery));
    }

    return filtered;
  }, [todos, filterStatus, debouncedSearchQuery]);
  
  // Sort todos: by order field primarily, then incomplete first, then by creation date
  const sortedTodos = useMemo(() => {
    return [...filteredTodos].sort((a, b) => {
      // First sort by order (ascending)
      if (a.order !== b.order) {
        return a.order - b.order;
      }
      // Then by completion status (incomplete first)
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      // Finally by creation date (oldest first)
      return a.createdAt - b.createdAt;
    });
  }, [filteredTodos]);

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
      {/* Sidebar - Persistent on desktop, collapsible on mobile/tablet */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
        onOpenSearch={openSearchModal}
        isPersistent={true}
      />

      {/* Search Modal */}
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={closeSearchModal}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filteredTodos={sortedTodos}
        onToggle={handleToggle}
        onDelete={handleDelete}
        onUpdate={handleUpdate}
        onReorder={reorderTodos}
      />

      {/* Backdrop - Only for mobile/tablet */}
      <Backdrop isVisible={isSidebarOpen && window.innerWidth < 1024} onClick={closeSidebar} />

      {/* Main content with left margin on desktop to account for persistent sidebar */}
      <div className="lg:ml-80 transition-all duration-300">
        <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8 md:py-12 pb-24 pt-safe">
          {/* Header */}
          <header className="mb-8 sm:mb-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 sm:gap-3 flex-1">
                {/* Burger Menu Button - Only visible on mobile/tablet */}
                <div className="lg:hidden">
                  <BurgerMenuButton onClick={toggleSidebar} isOpen={isSidebarOpen} />
                </div>
                
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900">
                    OpenList
                  </h1>
                  {/* Sync Status - Positioned at top */}
                  <SyncStatus status={syncStatus} />
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Logout
              </button>
            </div>
            
            {user && (
              <p className="text-sm text-gray-500 mt-2 lg:ml-0 ml-14 sm:ml-[60px]">{user.email}</p>
            )}
            
            {totalCount > 0 && (
              <div className="mb-4 lg:ml-0 ml-14 sm:ml-[60px]">
                <p className="text-sm sm:text-base text-gray-500 mb-4">
                  {completedCount} of {totalCount} completed
                </p>
              </div>
            )}

            {/* Filter - Search removed from main view */}
            {totalCount > 0 && (
              <div className="space-y-3 mb-6 lg:ml-0 ml-14 sm:ml-[60px]">
                <FilterMenu
                  value={filterStatus}
                  onChange={setFilterStatus}
                />
              </div>
            )}
          </header>

          {/* Todo List */}
          <TodoList
            todos={sortedTodos}
            onToggle={handleToggle}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
            onReorder={reorderTodos}
            searchQuery={debouncedSearchQuery}
            emptyMessage={
              debouncedSearchQuery || filterStatus !== 'all'
                ? 'No todos match your search or filter.'
                : 'No tasks yet. Tap the + button to add one.'
            }
          />
        </div>
      </div>

      {/* Floating Action Button */}
      <FloatingActionButton onAdd={addTodo} />
      
      {/* Toast Notification */}
      {toastState && (
        <Toast
          message={toastState.message}
          onAction={handleUndo}
          onDismiss={handleDismissToast}
        />
      )}
    </div>
  );
}

export default App;

