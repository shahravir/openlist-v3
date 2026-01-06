import { generateTagColor } from '../utils/tagColor';

interface TagChipProps {
  tag: string;
  onRemove?: () => void;
  size?: 'small' | 'medium';
}

export function TagChip({ tag, onRemove, size = 'medium' }: TagChipProps) {
  const color = generateTagColor(tag);
  
  const sizeClasses = {
    small: 'text-xs px-2 py-0.5',
    medium: 'text-sm px-2.5 py-1',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium transition-all duration-200 ${sizeClasses[size]}`}
      style={{
        backgroundColor: color.bg,
        color: color.text,
        border: `1px solid ${color.border}`,
      }}
      role="listitem"
      aria-label={`Tag: ${tag}`}
    >
      <span className="select-none">{tag}</span>
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 hover:opacity-70 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-0 rounded-full"
          style={{ color: color.text }}
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
