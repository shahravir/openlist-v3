import { useState } from 'react';

export type Priority = 'none' | 'low' | 'medium' | 'high';

interface PrioritySelectorProps {
  value: Priority;
  onChange: (priority: Priority) => void;
  isMobile?: boolean;
}

export const priorityConfig = {
  none: {
    label: 'None',
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    activeColor: 'bg-gray-200 border-gray-300',
    icon: (
      <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
        <path d="M20 12H4" />
      </svg>
    ),
  },
  low: {
    label: 'Low',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    activeColor: 'bg-blue-100 border-blue-300',
    icon: (
      <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
        <path d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    ),
  },
  medium: {
    label: 'Medium',
    color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    activeColor: 'bg-yellow-100 border-yellow-300',
    icon: (
      <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
        <path d="M5 15l7-7 7 7" />
      </svg>
    ),
  },
  high: {
    label: 'High',
    color: 'bg-red-50 text-red-700 border-red-200',
    activeColor: 'bg-red-100 border-red-300',
    icon: (
      <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
        <path d="M5 15l7-7 7 7M5 11l7-7 7 7" />
      </svg>
    ),
  },
};

export function PrioritySelector({ value, onChange, isMobile = false }: PrioritySelectorProps) {
  const [announcement, setAnnouncement] = useState<string>('');

  const handlePriorityChange = (priority: Priority) => {
    onChange(priority);
    setAnnouncement(`Priority set to ${priorityConfig[priority].label}`);
    setTimeout(() => setAnnouncement(''), 1000);
  };

  if (isMobile) {
    // Dropdown menu for mobile
    return (
      <>
        {announcement && (
          <div role="status" aria-live="polite" className="sr-only">
            {announcement}
          </div>
        )}
        <div className="w-full">
          <label htmlFor="priority-select" className="sr-only">
            Priority
          </label>
          <select
            id="priority-select"
            value={value}
            onChange={(e) => handlePriorityChange(e.target.value as Priority)}
            className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent touch-manipulation"
            aria-label="Select priority level"
          >
            {(Object.keys(priorityConfig) as Priority[]).map((priority) => (
              <option key={priority} value={priority}>
                {priorityConfig[priority].label} Priority
              </option>
            ))}
          </select>
        </div>
      </>
    );
  }

  // Inline buttons for desktop
  return (
    <>
      {announcement && (
        <div role="status" aria-live="polite" className="sr-only">
          {announcement}
        </div>
      )}
      <div
        className="flex gap-2 flex-wrap"
        role="group"
        aria-label="Priority selector"
      >
        {(['low', 'medium', 'high'] as Priority[]).map((priority) => {
          const config = priorityConfig[priority];
          const isActive = value === priority;
          return (
            <button
              key={priority}
              onClick={() => handlePriorityChange(priority)}
              className={`
                min-w-[44px] min-h-[44px] w-11 h-11 rounded-lg
                border transition-all duration-200 touch-manipulation
                flex items-center justify-center
                ${isActive ? config.activeColor : config.color}
                hover:shadow-sm
                focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2
              `}
              aria-label={`Set priority to ${config.label.toLowerCase()}`}
              aria-pressed={isActive}
              title={config.label}
            >
              {config.icon}
            </button>
          );
        })}
      </div>
    </>
  );
}
