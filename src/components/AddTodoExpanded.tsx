import { useState, useEffect, useRef, FormEvent } from 'react';

interface AddTodoExpandedProps {
  onAdd: (text: string) => void;
  onCancel: () => void;
}

export function AddTodoExpanded({ onAdd, onCancel }: AddTodoExpandedProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when expanded
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Focus trap - keep focus within expanded view
  useEffect(() => {
    const containerRef = inputRef.current?.closest('form');
    if (!containerRef) return;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = containerRef.querySelectorAll(
        'input:not([disabled]), button:not([disabled])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    };

    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmedText = text.trim();
    if (trimmedText) {
      onAdd(trimmedText);
      setText('');
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 md:bottom-6 md:right-6 md:left-auto md:w-96 bg-white rounded-t-2xl md:rounded-2xl shadow-2xl z-50 animate-slide-up">
      {/* Header with close button */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Add New Task</h3>
        <button
          onClick={onCancel}
          aria-label="Close"
          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-300"
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

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What needs to be done?"
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 touch-manipulation"
          autoComplete="off"
          aria-label="Todo text"
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 active:bg-gray-300 transition-all duration-200 touch-manipulation focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!text.trim()}
            className="flex-1 px-4 py-3 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 active:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 touch-manipulation shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-300"
          >
            Add Task
          </button>
        </div>
      </form>
    </div>
  );
}
