import { useState } from 'react';

export type FilterStatus = 'all' | 'active' | 'completed';

interface FilterMenuProps {
  value: FilterStatus;
  onChange: (value: FilterStatus) => void;
}

export function FilterMenu({ value, onChange }: FilterMenuProps) {
  const [announcement, setAnnouncement] = useState<string>('');

  const handleFilterChange = (newValue: FilterStatus) => {
    onChange(newValue);
    const labels = {
      all: 'All todos',
      active: 'Active todos',
      completed: 'Completed todos',
    };
    setAnnouncement(`Showing ${labels[newValue]}`);
    setTimeout(() => setAnnouncement(''), 1000);
  };

  const filters: Array<{ value: FilterStatus; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
  ];

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
        aria-label="Filter todos by status"
      >
        {filters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => handleFilterChange(filter.value)}
            className={`
              min-w-[44px] min-h-[44px] px-4 py-2 rounded-lg text-sm font-medium
              transition-all duration-200 touch-manipulation
              ${
                value === filter.value
                  ? 'bg-primary-500 text-white shadow-md'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
              }
              focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2
            `}
            aria-label={`Show ${filter.label.toLowerCase()} todos`}
            aria-pressed={value === filter.value}
          >
            {filter.label}
          </button>
        ))}
      </div>
    </>
  );
}
