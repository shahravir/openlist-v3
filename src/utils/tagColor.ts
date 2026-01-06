/**
 * Tag Color Utility - Generates consistent colors for tags
 */

export interface TagColor {
  bg: string;
  text: string;
  border: string;
}

const TAG_COLORS: TagColor[] = [
  { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' }, // red
  { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' }, // amber
  { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7' }, // green
  { bg: '#DBEAFE', text: '#1E40AF', border: '#93C5FD' }, // blue
  { bg: '#EDE9FE', text: '#5B21B6', border: '#C4B5FD' }, // purple
  { bg: '#FCE7F3', text: '#9F1239', border: '#F9A8D4' }, // pink
  { bg: '#CFFAFE', text: '#155E75', border: '#67E8F9' }, // cyan
  { bg: '#FFEDD5', text: '#9A3412', border: '#FDBA74' }, // orange
  { bg: '#ECFCCB', text: '#3F6212', border: '#BEF264' }, // lime
  { bg: '#E0E7FF', text: '#3730A3', border: '#A5B4FC' }, // indigo
];

/**
 * Generate a consistent color for a tag based on its name
 * @param tagName - The name of the tag
 * @returns TagColor object with background, text, and border colors
 */
export function generateTagColor(tagName: string): TagColor {
  // Generate a deterministic hash from tag name
  let hash = 0;
  for (let i = 0; i < tagName.length; i++) {
    hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Use hash to select a color
  const index = Math.abs(hash) % TAG_COLORS.length;
  return TAG_COLORS[index];
}

/**
 * Get all available tag colors
 * @returns Array of all available tag colors
 */
export function getAllTagColors(): TagColor[] {
  return TAG_COLORS;
}

/**
 * Get color by index (for manual selection)
 * @param index - Index of the color
 * @returns TagColor object
 */
export function getTagColorByIndex(index: number): TagColor {
  return TAG_COLORS[index % TAG_COLORS.length];
}
