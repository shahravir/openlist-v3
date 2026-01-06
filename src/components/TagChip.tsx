interface TagChipProps {
  tag: string;
  onRemove?: () => void;
  size?: 'small' | 'medium';
}

export function TagChip({ tag, onRemove, size = 'medium' }: TagChipProps) {
  const sizeClasses = {
    small: 'text-xs px-2 py-0.5',
    medium: 'text-sm px-2.5 py-1',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 text-gray-600 transition-all duration-200 ${sizeClasses[size]}`}
      role="listitem"
      aria-label={`Tag: ${tag}`}
    >
      {/* Tag icon */}
      <svg
        className={`${size === 'small' ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-gray-500 flex-shrink-0`}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
      <span className="select-none">{tag}</span>
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 hover:opacity-70 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-0 rounded-full text-gray-500 hover:text-gray-700"
          aria-label={`Remove tag ${tag}`}
          type="button"
        >
          <svg
            className="w-3 h-3"
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
      )}
    </span>
  );
}
