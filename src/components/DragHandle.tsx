interface DragHandleProps {
  isDragging?: boolean;
}

export function DragHandle({ isDragging = false }: DragHandleProps) {
  return (
    <div
      className={`flex-shrink-0 w-11 h-11 md:w-8 md:h-8 flex items-center justify-center rounded-lg touch-manipulation cursor-grab active:cursor-grabbing transition-all duration-200 ${
        isDragging
          ? 'bg-primary-100 text-primary-600'
          : 'text-gray-400 hover:text-primary-500 hover:bg-primary-50'
      }`}
      aria-label="Drag handle to reorder"
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
        <path d="M4 8h16M4 16h16" />
      </svg>
    </div>
  );
}
