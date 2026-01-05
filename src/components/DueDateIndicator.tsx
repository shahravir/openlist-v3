import { getDueDateStatus, formatDueDate } from '../utils/dateParser';

interface DueDateIndicatorProps {
  dueDate: number;
  compact?: boolean;
}

export function DueDateIndicator({ dueDate, compact = false }: DueDateIndicatorProps) {
  const status = getDueDateStatus(dueDate);
  const formattedDate = formatDueDate(dueDate, compact);

  // Color classes based on status
  const colorClasses = {
    overdue: 'bg-red-50 text-red-700 border-red-200',
    today: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    upcoming: 'bg-blue-50 text-blue-700 border-blue-200',
  };

  // Icon based on status
  const icons = {
    overdue: (
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    ),
    today: (
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
      </svg>
    ),
    upcoming: (
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
      </svg>
    ),
  };

  // Screen reader labels
  const ariaLabels = {
    overdue: `Overdue: ${formattedDate}`,
    today: `Due today: ${formattedDate}`,
    upcoming: `Due date: ${formattedDate}`,
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${colorClasses[status]}`}
      aria-label={ariaLabels[status]}
      title={ariaLabels[status]}
    >
      {icons[status]}
      <span>{formattedDate}</span>
    </span>
  );
}
