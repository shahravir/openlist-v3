interface BurgerMenuButtonProps {
  onClick: () => void;
  isOpen: boolean;
}

export function BurgerMenuButton({ onClick, isOpen }: BurgerMenuButtonProps) {
  return (
    <button
      onClick={onClick}
      className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 touch-manipulation"
      aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
      aria-expanded={isOpen}
    >
      <svg
        className="w-6 h-6"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        {isOpen ? (
          <path d="M6 18L18 6M6 6l12 12" />
        ) : (
          <path d="M4 6h16M4 12h16M4 18h16" />
        )}
      </svg>
    </button>
  );
}
