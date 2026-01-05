import { useState, useRef, useEffect } from 'react';
import { Todo } from '../types';
import { MAX_TODO_LENGTH, MIN_TODO_LENGTH, NEW_ITEM_DETECTION_WINDOW_MS, ANIMATION_DURATION_MS } from '../utils/constants';
import { highlightText } from '../utils/searchUtils';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DragHandle } from './DragHandle';
import { ReorderButtons } from './ReorderButtons';
import { DueDateIndicator } from './DueDateIndicator';
import { DatePicker } from './DatePicker';
import { parseDateFromText } from '../utils/dateParser';

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, text: string, dueDate?: number | null) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  searchQuery?: string;
}

export function TodoItem({ todo, onToggle, onDelete, onUpdate, onMoveUp, onMoveDown, canMoveUp, canMoveDown, searchQuery = '' }: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(todo.text);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editDueDate, setEditDueDate] = useState<number | null>(todo.dueDate || null);
  const [detectedDate, setDetectedDate] = useState<{ date: Date; dateText: string } | null>(null);
  const [showDatePreview, setShowDatePreview] = useState(false);
  const [announcement, setAnnouncement] = useState<string>('');
  const [isNew, setIsNew] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

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

  // Update editText and editDueDate when todo changes externally (e.g., from sync)
  useEffect(() => {
    if (!isEditing) {
      setEditText(todo.text);
      setEditDueDate(todo.dueDate || null);
    }
  }, [todo.text, todo.dueDate, isEditing]);

  // Detect dates in the text as user types (only when editing and no manual date picker is set)
  useEffect(() => {
    if (isEditing && editText.trim() && !showDatePicker) {
      const result = parseDateFromText(editText);
      if (result.parsedDate) {
        setDetectedDate(result.parsedDate);
        setShowDatePreview(true);
      } else {
        setDetectedDate(null);
        setShowDatePreview(false);
      }
    } else {
      // Clear when not editing or date picker is open
      setDetectedDate(null);
      setShowDatePreview(false);
    }
  }, [editText, isEditing, showDatePicker]);

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
    setEditDueDate(todo.dueDate || null);
    setIsEditing(true);
  };

  const validateAndSave = (text: string): boolean => {
    const trimmedText = text.trim();
    const textChanged = trimmedText !== todo.text;
    
    // Check if date changed: detected date, manual date picker, or removed
    let dateChanged = false;
    if (detectedDate) {
      // Date detected from text - check if it's different from current
      const detectedDateTimestamp = detectedDate.date.getTime();
      dateChanged = detectedDateTimestamp !== (todo.dueDate ?? null);
    } else if (editDueDate !== (todo.dueDate ?? null)) {
      // Manual date picker was changed
      dateChanged = true;
    }
    
    return (
      trimmedText.length >= MIN_TODO_LENGTH &&
      trimmedText.length <= MAX_TODO_LENGTH &&
      (textChanged || dateChanged)
    );
  };

  const handleSave = () => {
    const trimmedText = editText.trim();
    
    if (!trimmedText || trimmedText.length < MIN_TODO_LENGTH || trimmedText.length > MAX_TODO_LENGTH) {
      // Invalid text, just close editing
      setIsEditing(false);
      setShowDatePicker(false);
      setDetectedDate(null);
      setShowDatePreview(false);
      return;
    }
    
    // Always parse for dates in the text (most reliable)
    const dateParseResult = parseDateFromText(trimmedText);
    
    let finalText = trimmedText;
    let finalDueDate: number | null = null;

    // Priority: detected date from text > manual date picker (if changed) > existing date
    if (dateParseResult.parsedDate) {
      // Date detected in text - use it and remove from text
      finalText = dateParseResult.cleanedText.trim();
      finalDueDate = dateParseResult.parsedDate.date.getTime();
      
      // Ensure cleaned text is still valid
      if (finalText.length < MIN_TODO_LENGTH) {
        // If cleaning removed too much, keep original text but still apply date
        finalText = trimmedText;
      }
    } else if (editDueDate !== (todo.dueDate ?? null)) {
      // Manual date picker was changed from original
      finalDueDate = editDueDate;
    } else {
      // No changes to date, keep existing
      finalDueDate = todo.dueDate ?? null;
    }

    // Check if there are actual changes (using final cleaned text)
    const textChanged = finalText !== todo.text;
    const dateChanged = (finalDueDate ?? null) !== (todo.dueDate ?? null);
    
    // Always save if a date was detected from text, even if text is the same
    // This ensures dates are always applied when mentioned in the text
    const dateWasDetected = dateParseResult.parsedDate !== null;
    
    // Save if there are any changes (text or date) OR if a date was detected
    if (textChanged || dateChanged || dateWasDetected) {
      onUpdate(todo.id, finalText, finalDueDate);
    }
    
    setIsEditing(false);
    setShowDatePicker(false);
    setDetectedDate(null);
    setShowDatePreview(false);
  };

  const handleCancel = () => {
    setEditText(todo.text);
    setEditDueDate(todo.dueDate || null);
    setIsEditing(false);
    setShowDatePicker(false);
    setDetectedDate(null);
    setShowDatePreview(false);
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
        <div 
          ref={setNodeRef}
          style={style}
          className="relative group flex flex-col gap-2 px-4 py-3 bg-white rounded-lg shadow-sm border-2 border-primary-400 transition-all duration-200 touch-manipulation"
        >
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={MAX_TODO_LENGTH}
                className="w-full text-base text-gray-800 bg-transparent border-none outline-none px-0"
                aria-label="Edit todo text"
                aria-describedby={showDatePreview ? 'edit-date-preview' : undefined}
              />
              
              {/* Date preview */}
              {showDatePreview && detectedDate && !showDatePicker && (
                <div
                  id="edit-date-preview"
                  className="absolute top-full left-0 right-0 mt-1 p-2 bg-blue-50 border border-blue-200 rounded-lg text-sm z-50 shadow-md"
                  role="status"
                  aria-live="polite"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-blue-700 font-medium flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>Due: {detectedDate.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setDetectedDate(null);
                        setShowDatePreview(false);
                      }}
                      className="text-blue-600 hover:text-blue-800 text-xs underline"
                      aria-label="Remove detected due date"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-full text-gray-600 hover:text-primary-500 hover:bg-primary-50 transition-all duration-200 touch-manipulation"
              aria-label="Set due date"
              title="Set due date"
            >
              <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
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
          
          {/* Date picker */}
          {showDatePicker && (
            <div className="mt-2">
              <DatePicker
                value={editDueDate}
                onChange={setEditDueDate}
                onClose={() => setShowDatePicker(false)}
              />
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-3 px-4 py-3 bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200 touch-manipulation ${isNew ? 'animate-fade-in-scale' : ''}`}
      role="listitem"
    >
      {/* Drag Handle */}
      <div {...attributes} {...listeners}>
        <DragHandle isDragging={isDragging} />
      </div>
      
      {/* Reorder Buttons for Accessibility */}
      <div className="hidden md:flex">
        <ReorderButtons
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          canMoveUp={canMoveUp}
          canMoveDown={canMoveDown}
          todoText={todo.text}
        />
      </div>
      
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
      <div className="flex-1 flex flex-col gap-1">
        <span
          onDoubleClick={handleStartEdit}
          className={`text-base ${
            todo.completed
              ? 'text-gray-400 line-through'
              : 'text-gray-800'
          } transition-all duration-200 cursor-pointer`}
        >
          {searchQuery ? (
            <>
              {highlightText(todo.text, searchQuery).map((segment, index) => (
                <span
                  key={index}
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
        {todo.dueDate && (
          <div className="flex items-center">
            <DueDateIndicator dueDate={todo.dueDate} compact={true} />
          </div>
        )}
      </div>
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

