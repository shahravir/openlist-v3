/**
 * Date Parser Utility
 * Parses natural language dates from text and returns the parsed date and cleaned text
 */

export interface ParsedDate {
  date: Date;
  dateText: string; // The matched date string in the original text
}

export interface DateParseResult {
  cleanedText: string;
  parsedDate: ParsedDate | null;
}

/**
 * Parse natural language dates from text
 * Supports:
 * - Relative dates: today, tomorrow, next week, next month, next year
 * - Absolute dates: 26 jan 2026, jan 26, 26/01/2026, 2026-01-26
 * - Common formats: Jan 26, January 26, 26 Jan, 26 January
 */
export function parseDateFromText(text: string): DateParseResult {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Relative date patterns
  const relativePatterns: Array<{ pattern: RegExp; getDays: () => number }> = [
    { pattern: /\btoday\b/i, getDays: () => 0 },
    { pattern: /\btomorrow\b/i, getDays: () => 1 },
    { pattern: /\bnext week\b/i, getDays: () => 7 },
    { pattern: /\bnext month\b/i, getDays: () => 30 },
    { pattern: /\bnext year\b/i, getDays: () => 365 },
  ];

  // Check relative dates first
  for (const { pattern, getDays } of relativePatterns) {
    const match = text.match(pattern);
    if (match) {
      const date = new Date(today);
      date.setDate(date.getDate() + getDays());
      const cleanedText = text.replace(pattern, '').trim().replace(/\s+/g, ' ');
      return {
        cleanedText,
        parsedDate: {
          date,
          dateText: match[0],
        },
      };
    }
  }

  // Month names
  const months = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december',
    'jan', 'feb', 'mar', 'apr', 'jun',
    'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
  ];
  const monthsPattern = months.join('|');

  // Absolute date patterns
  const absolutePatterns: Array<{ pattern: RegExp; parse: (match: RegExpMatchArray) => Date | null }> = [
    // ISO format: 2026-01-26, 2026/01/26
    {
      pattern: /\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/,
      parse: (match) => {
        const year = parseInt(match[1]);
        const month = parseInt(match[2]) - 1;
        const day = parseInt(match[3]);
        const date = new Date(year, month, day);
        return isValidDate(date) ? date : null;
      },
    },
    // Format: DD/MM/YYYY, DD-MM-YYYY
    {
      pattern: /\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b/,
      parse: (match) => {
        const day = parseInt(match[1]);
        const month = parseInt(match[2]) - 1;
        const year = parseInt(match[3]);
        const date = new Date(year, month, day);
        return isValidDate(date) ? date : null;
      },
    },
    // Format: 26 jan 2026, 26 january 2026
    {
      pattern: new RegExp(`\\b(\\d{1,2})\\s+(${monthsPattern})\\s+(\\d{4})\\b`, 'i'),
      parse: (match) => {
        const day = parseInt(match[1]);
        const monthStr = match[2].toLowerCase();
        const year = parseInt(match[3]);
        const month = getMonthIndex(monthStr);
        if (month === -1) return null;
        const date = new Date(year, month, day);
        return isValidDate(date) ? date : null;
      },
    },
    // Format: jan 26 2026, january 26 2026
    {
      pattern: new RegExp(`\\b(${monthsPattern})\\s+(\\d{1,2})\\s+(\\d{4})\\b`, 'i'),
      parse: (match) => {
        const monthStr = match[1].toLowerCase();
        const day = parseInt(match[2]);
        const year = parseInt(match[3]);
        const month = getMonthIndex(monthStr);
        if (month === -1) return null;
        const date = new Date(year, month, day);
        return isValidDate(date) ? date : null;
      },
    },
    // Format: jan 26, january 26 (current or next year)
    {
      pattern: new RegExp(`\\b(${monthsPattern})\\s+(\\d{1,2})\\b`, 'i'),
      parse: (match) => {
        const monthStr = match[1].toLowerCase();
        const day = parseInt(match[2]);
        const month = getMonthIndex(monthStr);
        if (month === -1) return null;
        
        // Use current year, but if the date has passed, use next year
        let year = today.getFullYear();
        let date = new Date(year, month, day);
        if (date < today) {
          year++;
          date = new Date(year, month, day);
        }
        return isValidDate(date) ? date : null;
      },
    },
    // Format: 26 jan, 26 january (current or next year)
    {
      pattern: new RegExp(`\\b(\\d{1,2})\\s+(${monthsPattern})\\b`, 'i'),
      parse: (match) => {
        const day = parseInt(match[1]);
        const monthStr = match[2].toLowerCase();
        const month = getMonthIndex(monthStr);
        if (month === -1) return null;
        
        // Use current year, but if the date has passed, use next year
        let year = today.getFullYear();
        let date = new Date(year, month, day);
        if (date < today) {
          year++;
          date = new Date(year, month, day);
        }
        return isValidDate(date) ? date : null;
      },
    },
  ];

  // Check absolute dates
  for (const { pattern, parse } of absolutePatterns) {
    const match = text.match(pattern);
    if (match) {
      const date = parse(match);
      if (date) {
        const cleanedText = text.replace(match[0], '').trim().replace(/\s+/g, ' ');
        return {
          cleanedText,
          parsedDate: {
            date,
            dateText: match[0],
          },
        };
      }
    }
  }

  return {
    cleanedText: text,
    parsedDate: null,
  };
}

/**
 * Get month index (0-11) from month name
 */
function getMonthIndex(monthStr: string): number {
  const months = [
    ['january', 'jan'],
    ['february', 'feb'],
    ['march', 'mar'],
    ['april', 'apr'],
    ['may'],
    ['june', 'jun'],
    ['july', 'jul'],
    ['august', 'aug'],
    ['september', 'sep'],
    ['october', 'oct'],
    ['november', 'nov'],
    ['december', 'dec'],
  ];

  const lower = monthStr.toLowerCase();
  for (let i = 0; i < months.length; i++) {
    if (months[i].includes(lower)) {
      return i;
    }
  }
  return -1;
}

/**
 * Check if a date is valid
 */
function isValidDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Format date for display
 * Compact format for mobile: "Dec 25"
 * Full format for desktop: "December 25, 2024"
 */
export function formatDueDate(timestamp: number, compact: boolean = false): string {
  const date = new Date(timestamp);
  
  if (compact) {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }
  
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Get the status of a due date (overdue, today, upcoming)
 */
export type DueDateStatus = 'overdue' | 'today' | 'upcoming';

export function getDueDateStatus(timestamp: number): DueDateStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dueDate = new Date(timestamp);
  dueDate.setHours(0, 0, 0, 0);
  
  if (dueDate < today) {
    return 'overdue';
  } else if (dueDate.getTime() === today.getTime()) {
    return 'today';
  } else {
    return 'upcoming';
  }
}
