import { useState, FormEvent, useEffect } from 'react';
import { parseDateFromText } from '../utils/dateParser';

interface TodoInputProps {
  onAdd: (text: string, dueDate?: number | null) => void;
}

export function TodoInput({ onAdd }: TodoInputProps) {
  const [text, setText] = useState('');
  const [detectedDate, setDetectedDate] = useState<{ date: Date; dateText: string } | null>(null);
  const [showDatePreview, setShowDatePreview] = useState(false);

  // Detect dates in the text as user types
  useEffect(() => {
    if (text.trim()) {
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
  }, [text]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmedText = text.trim();
    if (trimmedText) {
      if (detectedDate) {
        // Parse the text to remove the date
        const result = parseDateFromText(trimmedText);
        onAdd(result.cleanedText, detectedDate.date.getTime());
      } else {
        onAdd(trimmedText, null);
      }
      setText('');
      setDetectedDate(null);
      setShowDatePreview(false);
    }
  };

  const handleRejectDate = () => {
    setDetectedDate(null);
    setShowDatePreview(false);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a task..."
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 touch-manipulation"
            autoComplete="off"
            aria-describedby={showDatePreview ? 'date-preview' : undefined}
          />
          
          {/* Date preview */}
          {showDatePreview && detectedDate && (
            <div
              id="date-preview"
              className="absolute top-full left-0 right-0 mt-1 p-2 bg-blue-50 border border-blue-200 rounded-lg text-sm z-10 shadow-md"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-blue-700 font-medium">
                  📅 Due: {detectedDate.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
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
        <button
          type="submit"
          disabled={!text.trim()}
          className="px-6 py-3 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 active:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 touch-manipulation shadow-sm hover:shadow-md"
        >
          Add
        </button>
      </div>
    </form>
  );
}

