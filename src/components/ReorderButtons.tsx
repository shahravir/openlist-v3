interface ReorderButtonsProps {
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  todoText: string;
}

export function ReorderButtons({
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  todoText,
}: ReorderButtonsProps) {
  return (
    <div className="flex flex-col gap-1" role="group" aria-label={`Reorder buttons for ${todoText}`}>
      <button
        onClick={onMoveUp}
        disabled={!canMoveUp}
        className={`flex-shrink-0 w-8 h-5 flex items-center justify-center rounded text-xs transition-all duration-200 touch-manipulation ${
          canMoveUp
            ? 'text-gray-600 hover:text-primary-500 hover:bg-primary-50 focus:text-primary-500 focus:bg-primary-50'
            : 'text-gray-300 cursor-not-allowed'
        }`}
        aria-label={`Move ${todoText} up`}
        aria-disabled={!canMoveUp}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M5 15l7-7 7 7" />
        </svg>
      </button>
      <button
        onClick={onMoveDown}
        disabled={!canMoveDown}
        className={`flex-shrink-0 w-8 h-5 flex items-center justify-center rounded text-xs transition-all duration-200 touch-manipulation ${
          canMoveDown
            ? 'text-gray-600 hover:text-primary-500 hover:bg-primary-50 focus:text-primary-500 focus:bg-primary-50'
            : 'text-gray-300 cursor-not-allowed'
        }`}
        aria-label={`Move ${todoText} down`}
        aria-disabled={!canMoveDown}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
  );
}
