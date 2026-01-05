import { useState, useEffect } from 'react';

interface DatePickerProps {
  value: number | null;
  onChange: (date: number | null) => void;
  onClose?: () => void;
  label?: string;
}

export function DatePicker({ value, onChange, onClose, label = 'Due date' }: DatePickerProps) {
  const [selectedDate, setSelectedDate] = useState<string>('');

  useEffect(() => {
    if (value) {
      const date = new Date(value);
      // Format as YYYY-MM-DD for input[type="date"]
      const formatted = date.toISOString().split('T')[0];
      setSelectedDate(formatted);
    } else {
      setSelectedDate('');
    }
  }, [value]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateStr = e.target.value;
    setSelectedDate(dateStr);
    
    if (dateStr) {
      const date = new Date(dateStr);
      // Set time to noon to avoid timezone issues
      date.setHours(12, 0, 0, 0);
      onChange(date.getTime());
    } else {
      onChange(null);
    }
  };

  const handleClear = () => {
    setSelectedDate('');
    onChange(null);
    onClose?.();
  };

  const handleToday = () => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const formatted = today.toISOString().split('T')[0];
    setSelectedDate(formatted);
    onChange(today.getTime());
  };

  const handleTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(12, 0, 0, 0);
    const formatted = tomorrow.toISOString().split('T')[0];
    setSelectedDate(formatted);
    onChange(tomorrow.getTime());
  };

  const handleNextWeek = () => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(12, 0, 0, 0);
    const formatted = nextWeek.toISOString().split('T')[0];
    setSelectedDate(formatted);
    onChange(nextWeek.getTime());
  };

  // Get today's date in YYYY-MM-DD format for min attribute
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="p-4 bg-white rounded-lg shadow-lg border border-gray-200">
      <label htmlFor="due-date-picker" className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      
      {/* Quick actions */}
      <div className="flex flex-wrap gap-2 mb-3">
        <button
          type="button"
          onClick={handleToday}
          className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
        >
          Today
        </button>
        <button
          type="button"
          onClick={handleTomorrow}
          className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
        >
          Tomorrow
        </button>
        <button
          type="button"
          onClick={handleNextWeek}
          className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
        >
          Next week
        </button>
      </div>

      {/* Date input - native on mobile, styled on desktop */}
      <input
        id="due-date-picker"
        type="date"
        value={selectedDate}
        onChange={handleDateChange}
        min={today}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        aria-label={label}
      />

      {/* Actions */}
      <div className="flex gap-2 mt-3">
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
          >
            Clear
          </button>
        )}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-3 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
}
