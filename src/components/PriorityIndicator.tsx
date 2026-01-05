import { Priority } from './PrioritySelector';

interface PriorityIndicatorProps {
  priority: Priority;
  compact?: boolean;
}

const priorityConfig = {
  none: {
    label: 'None',
    color: 'bg-gray-100 text-gray-600',
    icon: null, // Don't show indicator for none priority
  },
  low: {
    label: 'Low',
    color: 'bg-blue-100 text-blue-700',
    icon: (
      <svg className="w-3 h-3" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
        <path d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    ),
  },
  medium: {
    label: 'Medium',
    color: 'bg-yellow-100 text-yellow-700',
    icon: (
      <svg className="w-3 h-3" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
        <path d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
    ),
  },
  high: {
    label: 'High',
    color: 'bg-red-100 text-red-700',
    icon: (
      <svg className="w-3 h-3" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
        <path d="M5 10l7-7m0 0l7 7m-7-7v18M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
    ),
  },
};

export function PriorityIndicator({ priority, compact = false }: PriorityIndicatorProps) {
  // Don't show indicator for 'none' priority
  if (priority === 'none') {
    return null;
  }

  const config = priorityConfig[priority];

  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
        ${config.color}
      `}
      aria-label={`Priority: ${config.label}`}
    >
      {config.icon}
      {!compact && <span>{config.label}</span>}
    </span>
  );
}
