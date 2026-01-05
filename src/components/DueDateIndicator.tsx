import { getDueDateStatus, formatDueDateRelative } from '../utils/dateParser';

interface DueDateIndicatorProps {
  dueDate: number;
}

export function DueDateIndicator({ dueDate }: DueDateIndicatorProps) {
  const status = getDueDateStatus(dueDate);
  const formattedDate = formatDueDateRelative(dueDate);

  // Text color classes based on status
  const colorClasses = {
    overdue: 'text-red-600',
    today: 'text-amber-600',
    upcoming: 'text-green-600',
  };

  // Screen reader labels
  const ariaLabels = {
    overdue: `Overdue: ${formattedDate}`,
    today: `Due today: ${formattedDate}`,
    upcoming: `Due date: ${formattedDate}`,
  };

  return (
    <span
      className={`text-xs ${colorClasses[status]}`}
      aria-label={ariaLabels[status]}
      title={ariaLabels[status]}
    >
      {formattedDate}
    </span>
  );
}
