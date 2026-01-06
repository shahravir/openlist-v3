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
import { PrioritySelector, Priority, priorityConfig } from './PrioritySelector';
import { parseDateFromText } from '../utils/dateParser';
import { parsePriorityFromText } from '../utils/priorityParser';
import { parseTagsFromText, extractUniqueTagNames } from '../utils/tagParser';
import { TagChip } from './TagChip';

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, text: string, dueDate?: number | null, priority?: Priority, tags?: string[]) => void;
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
  const [showPrioritySelector, setShowPrioritySelector] = useState(false);
  const [editDueDate, setEditDueDate] = useState<number | null>(todo.dueDate || null);
  const [editPriority, setEditPriority] = useState<Priority>(todo.priority || 'none');
  const [editTags, setEditTags] = useState<string[]>(todo.tags || []);
  const [detectedDate, setDetectedDate] = useState<{ date: Date; dateText: string } | null>(null);
  const [detectedPriority, setDetectedPriority] = useState<{ priority: Priority; priorityText: string } | null>(null);
  const [detectedTags, setDetectedTags] = useState<string[]>([]);
  const [showDatePreview, setShowDatePreview] = useState(false);
  const [showPriorityPreview, setShowPriorityPreview] = useState(false);
  const [showTagsPreview, setShowTagsPreview] = useState(false);
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

  // Update editText, editDueDate, editPriority, and editTags when todo changes externally (e.g., from sync)
  useEffect(() => {
    if (!isEditing) {
      setEditText(todo.text);
      setEditDueDate(todo.dueDate || null);
      setEditPriority(todo.priority || 'none');
      setEditTags(todo.tags || []);
    }
  }, [todo.text, todo.dueDate, todo.priority, todo.tags, isEditing]);

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

  // Detect priority in the text as user types (only when editing and no manual priority selector is set)
  useEffect(() => {
    if (isEditing && editText.trim() && !showPrioritySelector && editPriority === (todo.priority || 'none')) {
      const result = parsePriorityFromText(editText);
      if (result.parsedPriority) {
        setDetectedPriority(result.parsedPriority);
        setShowPriorityPreview(true);
      } else {
        setDetectedPriority(null);
        setShowPriorityPreview(false);
      }
    } else {
      // Clear when not editing or priority selector is open
      setDetectedPriority(null);
      setShowPriorityPreview(false);
    }
  }, [editText, isEditing, showPrioritySelector, editPriority, todo.priority]);

  // Update priority state when detected priority changes (for button display)
  // Only auto-set if priority matches the original (user hasn't manually changed it)
  useEffect(() => {
    if (detectedPriority && editPriority === (todo.priority || 'none')) {
      setEditPriority(detectedPriority.priority);
    }
  }, [detectedPriority, editPriority, todo.priority]);

  // Detect tags in the text as user types (only when editing)
  // Also update editTags to include detected tags so they persist when saving
  useEffect(() => {
    if (isEditing && editText.trim()) {
      const tagParseResult = parseTagsFromText(editText);
      if (tagParseResult.parsedTags.length > 0) {
        const uniqueTags = extractUniqueTagNames(tagParseResult.parsedTags);
        setDetectedTags(uniqueTags);
        setShowTagsPreview(true);
        // Merge detected tags with existing editTags to preserve all tags
        setEditTags((prevTags) => {
          const merged = [...new Set([...prevTags, ...uniqueTags])];
          return merged;
        });
      } else {
        setDetectedTags([]);
        setShowTagsPreview(false);
      }
    } else {
      setDetectedTags([]);
      setShowTagsPreview(false);
    }
  }, [editText, isEditing]);

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
    setEditPriority(todo.priority || 'none');
    setEditTags(todo.tags || []);
    setIsEditing(true);
  };

  const handleSave = () => {
    const trimmedText = editText.trim();
    
    if (!trimmedText || trimmedText.length < MIN_TODO_LENGTH || trimmedText.length > MAX_TODO_LENGTH) {
      // Invalid text, just close editing
      setIsEditing(false);
      setShowDatePicker(false);
      setShowPrioritySelector(false);
      setDetectedDate(null);
      setDetectedTags([]);
      setShowDatePreview(false);
      setShowTagsPreview(false);
      return;
    }
    
    // Always parse for dates, priority, and tags in the text (most reliable)
    const dateParseResult = parseDateFromText(trimmedText);
    let textAfterDate = dateParseResult.cleanedText;
    const priorityParseResult = parsePriorityFromText(textAfterDate);
    let textAfterPriority = priorityParseResult.cleanedText;
    const tagParseResult = parseTagsFromText(textAfterPriority);
    
    let finalText = trimmedText;
    let finalDueDate: number | null = null;
    let finalPriority: Priority = editPriority;
    let finalTags: string[] = editTags;

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

    // Priority: detected priority from text > manual priority selector (if changed) > existing priority
    if (priorityParseResult.parsedPriority && editPriority === (todo.priority || 'none')) {
      // Priority detected in text - use it and remove from text
      finalText = priorityParseResult.cleanedText.trim();
      finalPriority = priorityParseResult.parsedPriority.priority;
      
      // Ensure cleaned text is still valid
      if (finalText.length < MIN_TODO_LENGTH) {
        // If cleaning removed too much, keep original text but still apply priority
        finalText = trimmedText;
      }
    } else if (editPriority !== (todo.priority || 'none')) {
      // Manual priority selector was changed from original
      finalPriority = editPriority;
    } else {
      // No changes to priority, keep existing
      finalPriority = todo.priority || 'none';
    }

    // Tags: merge detected tags from text (@mentions) with existing tags
    if (tagParseResult.parsedTags.length > 0) {
      // Tags detected in text - merge them with existing tags and remove from text
      finalText = tagParseResult.cleanedText.trim();
      const detectedTags = extractUniqueTagNames(tagParseResult.parsedTags);
      // Merge detected tags with existing tags from todo (not just editTags, to ensure we have all tags)
      // This ensures that if user adds tags in multiple edit sessions, all tags are preserved
      const existingTags = todo.tags || [];
      const mergedTags = [...new Set([...existingTags, ...detectedTags])];
      finalTags = mergedTags;
      
      // Ensure cleaned text is still valid
      if (finalText.length < MIN_TODO_LENGTH) {
        // If cleaning removed too much, keep original text but still apply tags
        finalText = trimmedText;
      }
    } else {
      // No tags detected - keep existing tags from todo
      finalTags = todo.tags || [];
    }

    // Check if there are actual changes (using final cleaned text)
    const textChanged = finalText !== todo.text;
    const dateChanged = (finalDueDate ?? null) !== (todo.dueDate ?? null);
    const priorityChanged = finalPriority !== (todo.priority || 'none');
    const tagsChanged = JSON.stringify(finalTags.sort()) !== JSON.stringify((todo.tags || []).sort());
    
    // Always save if a date, priority, or tags were detected from text, even if text is the same
    // This ensures dates, priorities, and tags are always applied when mentioned in the text
    const dateWasDetected = dateParseResult.parsedDate !== null;
    const priorityWasDetected = priorityParseResult.parsedPriority !== null;
    const tagsWereDetected = tagParseResult.parsedTags.length > 0;
    
    // Save if there are any changes (text, date, priority, or tags) OR if any were detected
    // Only include tags in the update if they've changed or were detected (to avoid clearing tags)
    if (textChanged || dateChanged || priorityChanged || tagsChanged || dateWasDetected || priorityWasDetected || tagsWereDetected) {
      // Only pass tags if they were detected or changed, otherwise pass undefined to preserve existing tags
      const tagsToUpdate = (tagsWereDetected || tagsChanged) ? finalTags : undefined;
      onUpdate(todo.id, finalText, finalDueDate, finalPriority, tagsToUpdate);
    }
    
    setIsEditing(false);
    setShowDatePicker(false);
    setShowPrioritySelector(false);
    setDetectedDate(null);
    setDetectedPriority(null);
    setDetectedTags([]);
    setShowDatePreview(false);
    setShowPriorityPreview(false);
    setShowTagsPreview(false);
  };

  const handleCancel = () => {
    setEditText(todo.text);
    setEditDueDate(todo.dueDate || null);
    setEditPriority(todo.priority || 'none');
    setEditTags(todo.tags || []);
    setIsEditing(false);
    setShowDatePicker(false);
    setShowPrioritySelector(false);
    setDetectedDate(null);
    setDetectedPriority(null);
    setDetectedTags([]);
    setShowDatePreview(false);
    setShowPriorityPreview(false);
    setShowTagsPreview(false);
  };

  const handleRejectPriority = () => {
    setDetectedPriority(null);
    setShowPriorityPreview(false);
    setEditPriority(todo.priority || 'none');
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

  // Get checkbox border color based on priority
  const getCheckboxBorderClass = () => {
    if (todo.completed) {
      return 'bg-primary-500 border-primary-500';
    }
    
    const priority = todo.priority || 'none';
    switch (priority) {
      case 'low':
        return 'border-green-500 hover:border-green-600';
      case 'medium':
        return 'border-amber-500 hover:border-amber-600';
      case 'high':
        return 'border-red-500 hover:border-red-600';
      default:
        return 'border-gray-300 hover:border-primary-400';
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
                aria-describedby={(showDatePreview || showPriorityPreview || showTagsPreview) ? 'edit-preview-info' : undefined}
              />
              
              {/* Date, Priority, and Tags previews */}
              {(showDatePreview || showPriorityPreview || showTagsPreview) && (
                <div
                  id="edit-preview-info"
                  className="absolute top-full left-0 right-0 mt-1 space-y-1 z-50"
                  role="status"
                  aria-live="polite"
                >
                  {/* Date preview */}
                  {showDatePreview && detectedDate && !showDatePicker && (
                    <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg text-sm shadow-md">
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
                  
                  {/* Priority preview */}
                  {showPriorityPreview && detectedPriority && !showPrioritySelector && editPriority === (todo.priority || 'none') && (
                    <div className="p-2 bg-purple-50 border border-purple-200 rounded-lg text-sm shadow-md">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-purple-700 font-medium flex items-center gap-1">
                          {priorityConfig[detectedPriority.priority].icon}
                          <span>Priority: {priorityConfig[detectedPriority.priority].label}</span>
                        </span>
                        <button
                          type="button"
                          onClick={handleRejectPriority}
                          className="text-purple-600 hover:text-purple-800 text-xs underline"
                          aria-label="Remove detected priority"
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
                          onClick={() => {
                            setDetectedTags([]);
                            setShowTagsPreview(false);
                          }}
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
              onClick={() => setShowPrioritySelector(!showPrioritySelector)}
              className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-full text-gray-600 hover:text-primary-500 hover:bg-primary-50 transition-all duration-200 touch-manipulation"
              aria-label="Set priority"
              title="Set priority"
            >
              <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
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
          
          {/* Priority selector */}
          {showPrioritySelector && (
            <div className="mt-2">
              <PrioritySelector
                value={editPriority}
                onChange={(newPriority) => {
                  setEditPriority(newPriority);
                  // Clear detected priority when user manually selects
                  if (newPriority !== (todo.priority || 'none')) {
                    setDetectedPriority(null);
                    setShowPriorityPreview(false);
                  }
                  setShowPrioritySelector(false); // Close selector after selection
                }}
                isMobile={window.innerWidth < 768}
              />
            </div>
          )}
          
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
        className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${getCheckboxBorderClass()}`}
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
        <div className="flex items-center gap-2 flex-wrap">
          {todo.dueDate && <DueDateIndicator dueDate={todo.dueDate} />}
          {todo.tags && todo.tags.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap" role="list" aria-label="Tags">
              {todo.tags.map((tag) => (
                <TagChip key={tag} tag={tag} size="small" />
              ))}
            </div>
          )}
        </div>
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

