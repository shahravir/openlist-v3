import { useState, useEffect, useRef, FormEvent } from 'react';
import { parseDateFromText } from '../utils/dateParser';
import { DatePicker } from './DatePicker';
import { PrioritySelector, Priority } from './PrioritySelector';

interface AddTodoExpandedProps {
  onAdd: (text: string, dueDate?: number | null, priority?: Priority) => void;
  onCancel: () => void;
}

export function AddTodoExpanded({ onAdd, onCancel }: AddTodoExpandedProps) {
  const [text, setText] = useState('');
  const [detectedDate, setDetectedDate] = useState<{ date: Date; dateText: string } | null>(null);
  const [showDatePreview, setShowDatePreview] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPrioritySelector, setShowPrioritySelector] = useState(false);
  const [manualDueDate, setManualDueDate] = useState<number | null>(null);
  const [priority, setPriority] = useState<Priority>('none');
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when expanded
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Detect dates in the text as user types
  useEffect(() => {
    if (text.trim() && !manualDueDate) {
      const result = parseDateFromText(text);
      if (result.parsedDate) {
        setDetectedDate(result.parsedDate);
        setShowDatePreview(true);
      } else {
        setDetectedDate(null);
        setShowDatePreview(false);
      }
    } else {
      setDetectedDate(null);
      setShowDatePreview(false);
    }
  }, [text, manualDueDate]);

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
      let finalText = trimmedText;
      let finalDueDate: number | null = manualDueDate;

      // If manual date is set, use it
      if (manualDueDate) {
        finalDueDate = manualDueDate;
      } else if (detectedDate) {
        // Parse the text to remove the date
        const result = parseDateFromText(trimmedText);
        finalText = result.cleanedText;
        finalDueDate = detectedDate.date.getTime();
      }

      onAdd(finalText, finalDueDate, priority);
      setText('');
      setDetectedDate(null);
      setShowDatePreview(false);
      setManualDueDate(null);
      setPriority('none');
      setShowDatePicker(false);
      setShowPrioritySelector(false);
    }
  };

  const handleRejectDate = () => {
    setDetectedDate(null);
    setShowDatePreview(false);
  };

  const handleManualDateChange = (date: number | null) => {
    setManualDueDate(date);
    // Clear detected date when manual date is set
    if (date) {
      setDetectedDate(null);
      setShowDatePreview(false);
    }
  };

  const handleCancel = () => {
    // Reset all state when canceling
    setText('');
    setDetectedDate(null);
    setShowDatePreview(false);
    setManualDueDate(null);
    setPriority('none');
    setShowDatePicker(false);
    setShowPrioritySelector(false);
    onCancel();
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 md:bottom-6 md:right-6 md:left-auto md:w-96 bg-white rounded-t-2xl md:rounded-2xl shadow-2xl z-50 animate-slide-up">
      {/* Header with close button */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Add New Task</h3>
        <button
          onClick={handleCancel}
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
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What needs to be done?"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 touch-manipulation"
            autoComplete="off"
            aria-label="Todo text"
            aria-describedby={showDatePreview ? 'date-preview' : undefined}
          />
          
          {/* Date preview */}
          {showDatePreview && detectedDate && !manualDueDate && (
            <div
              id="date-preview"
              className="absolute top-full left-0 right-0 mt-1 p-2 bg-blue-50 border border-blue-200 rounded-lg text-sm z-10 shadow-md"
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
                  onClick={handleRejectDate}
                  className="text-blue-600 hover:text-blue-800 text-xs underline"
                  aria-label="Remove detected due date"
                >
                  Remove
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Date picker button and picker */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-300"
            aria-label="Set due date"
          >
            <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{manualDueDate ? `Due: ${new Date(manualDueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : 'Set due date'}</span>
          </button>

          {showDatePicker && (
            <DatePicker
              value={manualDueDate}
              onChange={handleManualDateChange}
              onClose={() => setShowDatePicker(false)}
            />
          )}
        </div>

        {/* Priority selector button and selector */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowPrioritySelector(!showPrioritySelector)}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-300"
            aria-label="Set priority"
          >
            <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
            </svg>
            <span>Priority: {priority.charAt(0).toUpperCase() + priority.slice(1)}</span>
          </button>

          {showPrioritySelector && (
            <PrioritySelector
              value={priority}
              onChange={(newPriority) => {
                setPriority(newPriority);
                setShowPrioritySelector(false); // Close selector after selection
              }}
              isMobile={window.innerWidth < 768}
            />
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCancel}
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
