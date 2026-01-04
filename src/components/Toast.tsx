import { useEffect, useState, useRef } from 'react';
import { TOAST_DURATION_MS, TOAST_ANIMATION_DURATION_MS } from '../utils/constants';

interface ToastProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss: () => void;
  duration?: number; // in milliseconds, default 5000
}

export function Toast({
  message,
  actionLabel = 'Undo',
  onAction,
  onDismiss,
  duration = TOAST_DURATION_MS,
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastRef = useRef<HTMLDivElement>(null);

  // Minimum swipe distance (in px) to trigger dismiss
  const minSwipeDistance = 50;

  useEffect(() => {
    // Trigger animation on mount
    setIsVisible(true);

    // Auto-dismiss after duration
    timerRef.current = setTimeout(() => {
      handleDismiss();
    }, duration);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [duration]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      onDismiss();
    }, TOAST_ANIMATION_DURATION_MS); // Wait for animation to complete
  };

  const handleAction = () => {
    if (onAction) {
      onAction();
    }
    handleDismiss();
  };

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientY);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientY);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isSwipeDown = distance < -minSwipeDistance;
    
    if (isSwipeDown) {
      handleDismiss();
    }
    
    setTouchStart(null);
    setTouchEnd(null);
  };

  return (
    <div
      ref={toastRef}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
      className={`
        fixed z-50 
        left-0 right-0 bottom-0 sm:left-auto sm:right-4 sm:bottom-auto sm:top-4
        w-full sm:w-auto sm:max-w-md
        px-4 py-3 sm:px-6 sm:py-4
        bg-gray-900 text-white
        sm:rounded-lg shadow-lg
        transition-all duration-300 ease-out
        ${isVisible 
          ? 'translate-y-0 opacity-100' 
          : 'translate-y-full sm:translate-y-0 sm:translate-x-full opacity-0'
        }
      `}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="flex items-center justify-between gap-3 sm:gap-4">
        <p className="flex-1 text-sm sm:text-base font-medium">
          {message}
        </p>
        <div className="flex items-center gap-2">
          {onAction && (
            <button
              onClick={handleAction}
              className="
                px-3 py-2 sm:px-4 sm:py-2
                min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0
                text-sm sm:text-base font-semibold
                text-primary-400 hover:text-primary-300
                transition-colors duration-200
                touch-manipulation
                rounded
                focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 focus:ring-offset-gray-900
              "
              aria-label={actionLabel}
            >
              {actionLabel}
            </button>
          )}
          <button
            onClick={handleDismiss}
            className="
              p-2
              min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0
              text-gray-400 hover:text-white
              transition-colors duration-200
              touch-manipulation
              rounded
              focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-900
            "
            aria-label="Dismiss notification"
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
      </div>
    </div>
  );
}
