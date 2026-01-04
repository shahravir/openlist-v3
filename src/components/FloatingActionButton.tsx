import { useState, useEffect, useRef } from 'react';
import { AddTodoExpanded } from './AddTodoExpanded';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

interface FloatingActionButtonProps {
  onAdd: (text: string) => void;
}

export function FloatingActionButton({ onAdd }: FloatingActionButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const fabRef = useRef<HTMLButtonElement>(null);
  const expandedRef = useRef<HTMLDivElement>(null);

  // Handle keyboard shortcut (Ctrl/Cmd+N)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+N or Cmd+N to open FAB
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        setIsExpanded(true);
      }
      // Escape to close
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  // Handle click outside to close (desktop)
  useEffect(() => {
    if (!isExpanded) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        expandedRef.current &&
        !expandedRef.current.contains(e.target as Node) &&
        fabRef.current &&
        !fabRef.current.contains(e.target as Node)
      ) {
        setIsExpanded(false);
      }
    };

    // Add delay to prevent immediate closing
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded]);

  const handleFabClick = async () => {
    // Trigger haptic feedback on mobile
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch (error) {
        // Haptic feedback not available, continue silently for users
        // Log in non-production environments to aid debugging unexpected issues
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.error('[FloatingActionButton] Haptics.impact failed:', error);
        }
      }
    }
    setIsExpanded(true);
  };

  const handleAdd = (text: string) => {
    onAdd(text);
    setIsExpanded(false);
  };

  const handleCancel = () => {
    setIsExpanded(false);
  };

  return (
    <>
      {/* Backdrop for mobile */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:bg-transparent md:pointer-events-none transition-opacity duration-300"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Expanded View */}
      {isExpanded && (
        <div ref={expandedRef}>
          <AddTodoExpanded onAdd={handleAdd} onCancel={handleCancel} />
        </div>
      )}

      {/* FAB Button - Hidden when expanded */}
      {!isExpanded && (
        <button
          ref={fabRef}
          onClick={handleFabClick}
          aria-label="Add new todo"
          className="fixed bottom-4 right-4 md:bottom-6 md:right-6 w-14 h-14 md:w-16 md:h-16 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 z-50 flex items-center justify-center group touch-manipulation focus:outline-none focus:ring-4 focus:ring-primary-300"
        >
          {/* Plus Icon */}
          <svg
            className="w-6 h-6 md:w-7 md:h-7 transition-transform group-hover:scale-110"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}
    </>
  );
}
