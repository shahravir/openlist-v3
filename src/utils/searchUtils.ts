/**
 * Filters todos based on search query (case-insensitive)
 */
export function filterTodosBySearch(
  text: string,
  searchQuery: string
): boolean {
  if (!searchQuery.trim()) return true;
  return text.toLowerCase().includes(searchQuery.toLowerCase());
}

/**
 * Highlights matching text in a string
 * Returns an array of segments with {text, highlight} objects
 */
export function highlightText(
  text: string,
  searchQuery: string
): Array<{ text: string; highlight: boolean }> {
  if (!searchQuery.trim()) {
    return [{ text, highlight: false }];
  }

  const regex = new RegExp(`(${escapeRegExp(searchQuery)})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part) => ({
    text: part,
    highlight: part.toLowerCase() === searchQuery.toLowerCase(),
  }));
}

/**
 * Escapes special regex characters in a string
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Debounces a function call
 */
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}
