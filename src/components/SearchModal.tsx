import { useEffect, useRef } from 'react';
import { SearchBar } from './SearchBar';
import { TodoList } from './TodoList';
import { Todo } from '../types';
import { Priority } from './PrioritySelector';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filteredTodos: Todo[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, text: string, dueDate?: number | null, priority?: Priority) => void;
  onReorder: (reorderedTodos: Todo[]) => void;
}

export function SearchModal({ 
  isOpen, 
  onClose, 
  searchQuery, 
  onSearchChange,
  filteredTodos,
  onToggle,
  onDelete,
  onUpdate,
  onReorder
}: SearchModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      // Small delay to ensure modal is rendered
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Add slight delay to avoid closing immediately on open
    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-[60]" aria-hidden="true" />
      
      {/* Modal */}
      <div className="fixed inset-0 z-[70] flex items-start justify-center pt-8 sm:pt-12 px-4 pb-8">
        <div
          ref={modalRef}
          className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-in fade-in slide-in-from-top-4 duration-200"
          role="dialog"
          aria-modal="true"
          aria-label="Search todos"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
            <h3 className="text-lg font-semibold text-gray-900">Search Todos</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400"
              aria-label="Close search"
            >
              <svg
                className="w-5 h-5"
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
          </div>
          
          {/* Search Input */}
          <div className="px-4 sm:px-6 pt-4 flex-shrink-0" ref={(node) => {
            if (node) {
              const input = node.querySelector('input');
              if (input && searchInputRef) {
                (searchInputRef as any).current = input;
              }
            }
          }}>
            <SearchBar
              value={searchQuery}
              onChange={onSearchChange}
              placeholder="Search todos..."
            />
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
            {searchQuery ? (
              <>
                <div className="mb-3 text-sm text-gray-600">
                  {filteredTodos.length === 0 ? (
                    <span>No todos match your search</span>
                  ) : (
                    <span>{filteredTodos.length} {filteredTodos.length === 1 ? 'todo' : 'todos'} found</span>
                  )}
                </div>
                <TodoList
                  todos={filteredTodos}
                  onToggle={onToggle}
                  onDelete={onDelete}
                  onUpdate={onUpdate}
                  onReorder={onReorder}
                  searchQuery={searchQuery}
                  emptyMessage="No todos match your search."
                />
              </>
            ) : (
              <div className="flex items-center justify-center py-12 text-gray-400 text-center">
                <div>
                  <svg
                    className="w-16 h-16 mx-auto mb-4 text-gray-300"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p className="text-base">Start typing to search your todos</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="px-4 sm:px-6 py-3 border-t border-gray-200 flex-shrink-0">
            <p className="text-xs text-gray-500 text-center">
              Press <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">Esc</kbd> to close
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
