import { useState, useRef, useEffect } from 'react';
import { TagChip } from './TagChip';

interface TagInputProps {
  tags: string[];
  availableTags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export function TagInput({ tags, availableTags, onChange, placeholder = 'Add tags...' }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter available tags based on input and exclude already selected tags
  const filteredTags = availableTags
    .filter((tag) => !tags.includes(tag) && tag.toLowerCase().includes(inputValue.toLowerCase()))
    .slice(0, 5); // Limit to 5 suggestions

  // Show autocomplete when there are filtered tags and input has value
  useEffect(() => {
    setShowAutocomplete(inputValue.length > 0 && filteredTags.length > 0);
    setSelectedIndex(0);
  }, [inputValue, filteredTags.length]);

  const handleAddTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      onChange([...tags, trimmedTag]);
      setInputValue('');
      setShowAutocomplete(false);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (showAutocomplete && filteredTags.length > 0) {
        handleAddTag(filteredTags[selectedIndex]);
      } else if (inputValue.trim()) {
        handleAddTag(inputValue);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredTags.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredTags.length) % filteredTags.length);
    } else if (e.key === 'Escape') {
      setShowAutocomplete(false);
      setInputValue('');
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      // Remove last tag if input is empty
      handleRemoveTag(tags[tags.length - 1]);
    }
  };

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent">
        {/* Display existing tags */}
        {tags.map((tag) => (
          <TagChip key={tag} tag={tag} onRemove={() => handleRemoveTag(tag)} size="small" />
        ))}

        {/* Input for adding new tags */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-sm placeholder-gray-400"
          aria-label="Add tag"
          aria-autocomplete="list"
          aria-controls={showAutocomplete ? 'tag-autocomplete' : undefined}
          aria-expanded={showAutocomplete}
        />
      </div>

      {/* Autocomplete dropdown */}
      {showAutocomplete && (
        <div
          id="tag-autocomplete"
          role="listbox"
          className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
        >
          {filteredTags.map((tag, index) => (
            <button
              key={tag}
              type="button"
              role="option"
              aria-selected={index === selectedIndex}
              onClick={() => handleAddTag(tag)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                index === selectedIndex
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <TagChip tag={tag} size="small" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
