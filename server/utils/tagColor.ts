/**
 * Tag color utility - Generates consistent colors for tags
 */

/**
 * Generate a consistent color for a tag based on its name
 * @param tagName - The name of the tag
 * @returns Hex color string
 */
export function generateTagColor(tagName: string): string {
  const colors = [
    '#EF4444', // red
    '#F59E0B', // amber
    '#10B981', // green
    '#3B82F6', // blue
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#06B6D4', // cyan
    '#F97316', // orange
    '#84CC16', // lime
    '#6366F1', // indigo
  ];
  
  // Generate a deterministic hash from tag name
  let hash = 0;
  for (let i = 0; i < tagName.length; i++) {
    hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}
