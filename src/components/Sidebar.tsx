import { useEffect, useRef } from 'react';
import { SearchBar } from './SearchBar';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

export function Sidebar({ isOpen, onClose, searchQuery, onSearchChange }: SidebarProps) {
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
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
      role="navigation"
      aria-label="Navigation menu"
      aria-hidden={!isOpen}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Menu</h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400"
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
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Search Section */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Search</h3>
            <SearchBar
              value={searchQuery}
              onChange={onSearchChange}
              placeholder="Search todos..."
            />
          </div>

          {/* Future sections can go here */}
          {/* Filters, Settings, Help, etc. */}
        </div>
      </div>
    </aside>
  );
}
