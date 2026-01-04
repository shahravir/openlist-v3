import { useState, useRef, useEffect } from 'react';
import { Todo } from '../types';
import { MAX_TODO_LENGTH, MIN_TODO_LENGTH, NEW_ITEM_DETECTION_WINDOW_MS, ANIMATION_DURATION_MS } from '../utils/constants';
import { highlightText } from '../utils/searchUtils';

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, text: string) => void;
  searchQuery?: string;
}

export function TodoItem({ todo, onToggle, onDelete, onUpdate, searchQuery = '' }: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(todo.text);
  const [announcement, setAnnouncement] = useState<string>('');
  const [isNew, setIsNew] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Detect if this is a newly added item (created within last NEW_ITEM_DETECTION_WINDOW_MS)
  useEffect(() => {
    const now = Date.now();
    const itemAge = now - todo.createdAt;
    if (itemAge < NEW_ITEM_DETECTION_WINDOW_MS) {
      setIsNew(true);
      const timer = setTimeout(() => setIsNew(false), ANIMATION_DURATION_MS);
      return () => clearTimeout(timer);
    }
  }, [todo.createdAt]);

  // Update editText when todo.text changes externally (e.g., from sync)
  useEffect(() => {
    if (!isEditing) {
      setEditText(todo.text);
    }
  }, [todo.text, isEditing]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
      // Set announcement for screen readers
      setAnnouncement('Edit mode activated');
      // Clear announcement after it's been read
      const timer = setTimeout(() => setAnnouncement(''), 1000);
      return () => clearTimeout(timer);
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    setEditText(todo.text);
    setIsEditing(true);
  };

  const validateAndSave = (text: string): boolean => {
    const trimmedText = text.trim();
    return (
      trimmedText.length >= MIN_TODO_LENGTH &&
      trimmedText.length <= MAX_TODO_LENGTH &&
      trimmedText !== todo.text
    );
  };

  const handleSave = () => {
    if (validateAndSave(editText)) {
      onUpdate(todo.id, editText.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditText(todo.text);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <>
        {announcement && (
          <div role="status" aria-live="polite" className="sr-only">
            {announcement}
          </div>
        )}
        <div className="group flex items-center gap-2 px-4 py-3 bg-white rounded-lg shadow-sm border-2 border-primary-400 transition-all duration-200 touch-manipulation">
          <input
            ref={inputRef}
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={MAX_TODO_LENGTH}
            className="flex-1 text-base text-gray-800 bg-transparent border-none outline-none px-0"
            aria-label="Edit todo text"
          />
          <button
            onClick={handleSave}
            className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-full text-white bg-primary-500 hover:bg-primary-600 transition-all duration-200 touch-manipulation"
            aria-label="Save changes"
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
              <path d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <button
            onClick={handleCancel}
            className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-full text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-all duration-200 touch-manipulation"
            aria-label="Cancel editing"
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
      </>
    );
  }

  return (
    <div className={`group flex items-center gap-3 px-4 py-3 bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200 touch-manipulation ${isNew ? 'animate-fade-in-scale' : ''}`}>
      <button
        onClick={() => onToggle(todo.id)}
        className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
          todo.completed
            ? 'bg-primary-500 border-primary-500'
            : 'border-gray-300 hover:border-primary-400'
        }`}
        aria-label={todo.completed ? 'Mark as incomplete' : 'Mark as complete'}
      >
        {todo.completed && (
          <svg
            className="w-4 h-4 text-white"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
      <span
        onDoubleClick={handleStartEdit}
        className={`flex-1 text-base ${
          todo.completed
            ? 'text-gray-400 line-through'
            : 'text-gray-800'
        } transition-all duration-200 cursor-pointer`}
      >
        {searchQuery ? (
          <>
            {highlightText(todo.text, searchQuery).map((segment, index) => (
              <span
                key={`${index}-${segment.text}`}
                className={segment.highlight ? 'bg-yellow-200 font-medium' : ''}
              >
                {segment.text}
              </span>
            ))}
          </>
        ) : (
          todo.text
        )}
      </span>
      <button
        onClick={handleStartEdit}
        className="flex-shrink-0 w-11 h-11 md:w-8 md:h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-primary-500 hover:bg-primary-50 focus:text-primary-500 focus:bg-primary-50 transition-all duration-200 md:scale-0 md:group-hover:scale-100 md:focus:scale-100 touch-manipulation"
        aria-label="Edit todo"
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
          <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>
      <button
        onClick={() => onDelete(todo.id)}
        className="flex-shrink-0 w-11 h-11 md:w-8 md:h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 focus:text-red-500 focus:bg-red-50 transition-all duration-200 md:scale-0 md:group-hover:scale-100 md:focus:scale-100 touch-manipulation"
        aria-label="Delete todo"
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
  );
}

