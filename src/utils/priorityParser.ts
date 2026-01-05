/**
 * Priority Parser Utility
 * Parses natural language priority from text and returns the parsed priority and cleaned text
 */

import { Priority } from '../components/PrioritySelector';

export interface ParsedPriority {
  priority: Priority;
  priorityText: string; // The matched priority string in the original text
}

export interface PriorityParseResult {
  cleanedText: string;
  parsedPriority: ParsedPriority | null;
}

/**
 * Parse natural language priority from text
 * Supports:
 * - High priority: "high priority", "high", "urgent", "important", "critical", "p1", "priority 1"
 * - Medium priority: "medium priority", "medium", "normal", "p2", "priority 2"
 * - Low priority: "low priority", "low", "minor", "p3", "priority 3"
 */
export function parsePriorityFromText(text: string): PriorityParseResult {
  // High priority patterns (most specific first)
  const highPriorityPatterns: RegExp[] = [
    /\b(high\s+priority|priority\s+high)\b/i,
    /\b(urgent|critical|important)\b/i,
    /\b(high|p1|priority\s*1)\b/i,
  ];

  // Medium priority patterns
  const mediumPriorityPatterns: RegExp[] = [
    /\b(medium\s+priority|priority\s+medium)\b/i,
    /\b(normal|p2|priority\s*2)\b/i,
    /\bmedium\b/i,
  ];

  // Low priority patterns
  const lowPriorityPatterns: RegExp[] = [
    /\b(low\s+priority|priority\s+low)\b/i,
    /\b(minor|p3|priority\s*3)\b/i,
    /\blow\b/i,
  ];

  // Check for high priority first (most specific)
  for (const pattern of highPriorityPatterns) {
    const match = text.match(pattern);
    if (match) {
      const cleanedText = text.replace(pattern, '').trim().replace(/\s+/g, ' ');
      return {
        cleanedText,
        parsedPriority: {
          priority: 'high',
          priorityText: match[0],
        },
      };
    }
  }

  // Check for medium priority
  for (const pattern of mediumPriorityPatterns) {
    const match = text.match(pattern);
    if (match) {
      const cleanedText = text.replace(pattern, '').trim().replace(/\s+/g, ' ');
      return {
        cleanedText,
        parsedPriority: {
          priority: 'medium',
          priorityText: match[0],
        },
      };
    }
  }

  // Check for low priority
  for (const pattern of lowPriorityPatterns) {
    const match = text.match(pattern);
    if (match) {
      const cleanedText = text.replace(pattern, '').trim().replace(/\s+/g, ' ');
      return {
        cleanedText,
        parsedPriority: {
          priority: 'low',
          priorityText: match[0],
        },
      };
    }
  }

  return {
    cleanedText: text,
    parsedPriority: null,
  };
}

