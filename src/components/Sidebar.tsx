import { useEffect, useRef } from 'react';

export type DateFilter = 'all' | 'overdue' | 'today' | 'week' | 'upcoming' | 'no-date';
export type FilterStatus = 'all' | 'active' | 'completed';
export type PriorityFilter = 'all' | 'none' | 'low' | 'medium' | 'high';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSearch: () => void;
  dateFilter?: DateFilter;
  onDateFilterChange?: (filter: DateFilter) => void;
  filterStatus?: FilterStatus;
  onFilterStatusChange?: (status: FilterStatus) => void;
  priorityFilter?: PriorityFilter;
  onPriorityFilterChange?: (priority: PriorityFilter) => void;
  isPersistent?: boolean; // For desktop persistent sidebar
}

export function Sidebar({ isOpen, onClose, onOpenSearch, dateFilter = 'all', onDateFilterChange, filterStatus = 'all', onFilterStatusChange, priorityFilter = 'all', onPriorityFilterChange, isPersistent = false }: SidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap: handle Tab key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape key closes sidebar
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      // Tab key: trap focus within sidebar
      if (e.key === 'Tab') {
        const sidebar = sidebarRef.current;
        if (!sidebar) return;

        const focusableElements = sidebar.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus close button when sidebar opens
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    }
  }, [isOpen]);

  return (
    <aside
      ref={sidebarRef}
      className={`
        fixed top-0 left-0 h-full w-80 max-w-[90vw]
        bg-white shadow-2xl z-50
        transform transition-transform duration-300 ease-out
        ${isPersistent ? 'lg:translate-x-0' : ''}
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        pt-safe pb-safe
      `}
      role="navigation"
      aria-label="Navigation menu"
      aria-hidden={!isOpen && !isPersistent}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Menu</h2>
          {/* Only show close button on mobile/tablet */}
          {!isPersistent && (
            <button
              ref={closeButtonRef}
              onClick={onClose}
              className="lg:hidden w-11 h-11 flex items-center justify-center rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400"
              aria-label="Close navigation menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Search Button */}
          <button
            onClick={onOpenSearch}
            className="w-full flex items-center gap-3 px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 touch-manipulation"
            aria-label="Open search"
          >
            <svg
              className="w-5 h-5 text-gray-600"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-gray-700 font-medium">Search</span>
            <span className="ml-auto text-xs text-gray-500">Ctrl+K</span>
          </button>

          {/* Status Filters */}
          {onFilterStatusChange && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2">
                Status
              </h3>
              <div className="space-y-1">
                <button
                  onClick={() => onFilterStatusChange('all')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 touch-manipulation ${
                    filterStatus === 'all'
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  aria-label="Show all todos"
                  aria-pressed={filterStatus === 'all'}
                >
                  <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  <span>All</span>
                </button>
                
                <button
                  onClick={() => onFilterStatusChange('active')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 touch-manipulation ${
                    filterStatus === 'active'
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  aria-label="Show active todos"
                  aria-pressed={filterStatus === 'active'}
                >
                  <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Active</span>
                </button>
                
                <button
                  onClick={() => onFilterStatusChange('completed')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 touch-manipulation ${
                    filterStatus === 'completed'
                      ? 'bg-green-50 text-green-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  aria-label="Show completed todos"
                  aria-pressed={filterStatus === 'completed'}
                >
                  <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Completed</span>
                </button>
              </div>
            </div>
          )}

          {/* Date Filters */}
          {onDateFilterChange && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2">
                Due Date
              </h3>
              <div className="space-y-1">
                <button
                  onClick={() => onDateFilterChange('all')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 touch-manipulation ${
                    dateFilter === 'all'
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  aria-label="Show all todos by due date"
                  aria-pressed={dateFilter === 'all'}
                >
                  <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  <span>All</span>
                </button>
                
                <button
                  onClick={() => onDateFilterChange('overdue')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 touch-manipulation ${
                    dateFilter === 'overdue'
                      ? 'bg-red-50 text-red-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  aria-label="Show overdue todos"
                  aria-pressed={dateFilter === 'overdue'}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span>Overdue</span>
                </button>
                
                <button
                  onClick={() => onDateFilterChange('today')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 touch-manipulation ${
                    dateFilter === 'today'
                      ? 'bg-yellow-50 text-yellow-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  aria-label="Show todos due today"
                  aria-pressed={dateFilter === 'today'}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <span>Today</span>
                </button>
                
                <button
                  onClick={() => onDateFilterChange('week')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 touch-manipulation ${
                    dateFilter === 'week'
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  aria-label="Show todos due this week"
                  aria-pressed={dateFilter === 'week'}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                  <span>This Week</span>
                </button>
                
                <button
                  onClick={() => onDateFilterChange('upcoming')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 touch-manipulation ${
                    dateFilter === 'upcoming'
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  aria-label="Show upcoming todos"
                  aria-pressed={dateFilter === 'upcoming'}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                  <span>Upcoming</span>
                </button>
                
                <button
                  onClick={() => onDateFilterChange('no-date')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 touch-manipulation ${
                    dateFilter === 'no-date'
                      ? 'bg-gray-100 text-gray-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  aria-label="Show todos without due date"
                  aria-pressed={dateFilter === 'no-date'}
                >
                  <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>No Date</span>
                </button>
              </div>
            </div>
          )}

          {/* Priority Filters */}
          {onPriorityFilterChange && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2">
                Priority
              </h3>
              <div className="space-y-1">
                <button
                  onClick={() => onPriorityFilterChange('all')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 touch-manipulation ${
                    priorityFilter === 'all'
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  aria-label="Show all priorities"
                  aria-pressed={priorityFilter === 'all'}
                >
                  <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  <span>All</span>
                </button>
                
                <button
                  onClick={() => onPriorityFilterChange('high')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 touch-manipulation ${
                    priorityFilter === 'high'
                      ? 'bg-red-50 text-red-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  aria-label="Show high priority todos"
                  aria-pressed={priorityFilter === 'high'}
                >
                  <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M5 15l7-7 7 7M5 11l7-7 7 7" />
                  </svg>
                  <span>High</span>
                </button>
                
                <button
                  onClick={() => onPriorityFilterChange('medium')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 touch-manipulation ${
                    priorityFilter === 'medium'
                      ? 'bg-yellow-50 text-yellow-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  aria-label="Show medium priority todos"
                  aria-pressed={priorityFilter === 'medium'}
                >
                  <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M5 15l7-7 7 7" />
                  </svg>
                  <span>Medium</span>
                </button>
                
                <button
                  onClick={() => onPriorityFilterChange('low')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 touch-manipulation ${
                    priorityFilter === 'low'
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  aria-label="Show low priority todos"
                  aria-pressed={priorityFilter === 'low'}
                >
                  <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                  <span>Low</span>
                </button>
                
                <button
                  onClick={() => onPriorityFilterChange('none')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 touch-manipulation ${
                    priorityFilter === 'none'
                      ? 'bg-gray-100 text-gray-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  aria-label="Show todos without priority"
                  aria-pressed={priorityFilter === 'none'}
                >
                  <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M20 12H4" />
                  </svg>
                  <span>None</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
