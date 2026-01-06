import { useState, FormEvent, useEffect } from 'react';
import { parseDateFromText } from '../utils/dateParser';
import { parseTagsFromText, extractUniqueTagNames } from '../utils/tagParser';
import { TagChip } from './TagChip';

interface TodoInputProps {
  onAdd: (text: string, dueDate?: number | null, tags?: string[]) => void;
}

export function TodoInput({ onAdd }: TodoInputProps) {
  const [text, setText] = useState('');
  const [detectedDate, setDetectedDate] = useState<{ date: Date; dateText: string } | null>(null);
  const [detectedTags, setDetectedTags] = useState<string[]>([]);
  const [showDatePreview, setShowDatePreview] = useState(false);
  const [showTagsPreview, setShowTagsPreview] = useState(false);

  // Detect dates and tags in the text as user types
  useEffect(() => {
    if (text.trim()) {
      const dateResult = parseDateFromText(text);
      if (dateResult.parsedDate) {
        setDetectedDate(dateResult.parsedDate);
        setShowDatePreview(true);
      } else {
        setDetectedDate(null);
        setShowDatePreview(false);
      }
      
      const tagResult = parseTagsFromText(text);
      if (tagResult.parsedTags.length > 0) {
        setDetectedTags(extractUniqueTagNames(tagResult.parsedTags));
        setShowTagsPreview(true);
      } else {
        setDetectedTags([]);
        setShowTagsPreview(false);
      }
    } else {
      setDetectedDate(null);
      setDetectedTags([]);
      setShowDatePreview(false);
      setShowTagsPreview(false);
    }
  }, [text]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmedText = text.trim();
    if (trimmedText) {
      let finalText = trimmedText;
      let finalDueDate: number | null = null;
      let finalTags: string[] = [];
      
      // Parse date from text
      if (detectedDate) {
        const dateResult = parseDateFromText(trimmedText);
        finalText = dateResult.cleanedText;
        finalDueDate = detectedDate.date.getTime();
      }
      
      // Parse tags from text
      if (detectedTags.length > 0) {
        const tagResult = parseTagsFromText(finalText);
        finalText = tagResult.cleanedText;
        finalTags = detectedTags;
      }
      
      onAdd(finalText, finalDueDate, finalTags);
      setText('');
      setDetectedDate(null);
      setDetectedTags([]);
      setShowDatePreview(false);
      setShowTagsPreview(false);
    }
  };

  const handleRejectDate = () => {
    setDetectedDate(null);
    setShowDatePreview(false);
  };

  const handleRejectTags = () => {
    setDetectedTags([]);
    setShowTagsPreview(false);
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
            aria-describedby={(showDatePreview || showTagsPreview) ? 'preview-info' : undefined}
          />
          
          {/* Date and Tags preview */}
          {(showDatePreview || showTagsPreview) && (
            <div
              id="preview-info"
              className="absolute top-full left-0 right-0 mt-1 space-y-1 z-10"
              role="status"
              aria-live="polite"
            >
              {/* Date preview */}
              {showDatePreview && detectedDate && (
                <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg text-sm shadow-md">
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
          
          {/* Tags preview */}
          {showTagsPreview && detectedTags.length > 0 && (
            <div className="p-2 bg-green-50 border border-green-200 rounded-lg text-sm shadow-md">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-green-700 font-medium">Tags:</span>
                  {detectedTags.map((tag) => (
                    <TagChip key={tag} tag={tag} size="small" />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleRejectTags}
                  className="text-green-600 hover:text-green-800 text-xs underline whitespace-nowrap"
                  aria-label="Remove detected tags"
                >
                  Remove
                </button>
              </div>
            </div>
          )}
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

