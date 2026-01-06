/**
 * Tag Parser - Detects and extracts tags from text using @ mentions
 * Example: "Buy groceries @shopping @urgent" => tags: ["shopping", "urgent"]
 */

export interface ParsedTag {
  tag: string;
  tagText: string; // Full matched text including @
}

export interface TagParseResult {
  parsedTags: ParsedTag[];
  cleanedText: string; // Text with tag mentions removed
}

/**
 * Parse tags from text using @mention syntax
 * @param text - The text to parse for tags
 * @returns Object containing parsed tags and cleaned text
 */
export function parseTagsFromText(text: string): TagParseResult {
  const parsedTags: ParsedTag[] = [];
  
  // Regex to match @tag patterns
  // Matches @word where word contains letters, numbers, hyphens, or underscores
  // Must not be followed by another @ (to avoid matching email addresses)
  const tagRegex = /@([a-zA-Z0-9_-]+)(?!\S)/g;
  
  let match;
  while ((match = tagRegex.exec(text)) !== null) {
    const tagText = match[0]; // Full match including @
    const tag = match[1]; // Tag name without @
    
    parsedTags.push({
      tag,
      tagText,
    });
  }
  
  // Remove tag mentions from text
  let cleanedText = text;
  for (const { tagText } of parsedTags) {
    // Use global regex to replace all occurrences
    const escapedTag = tagText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    cleanedText = cleanedText.replace(new RegExp(escapedTag, 'g'), '').trim();
  }
  
  // Clean up extra whitespace
  cleanedText = cleanedText.replace(/\s+/g, ' ').trim();
  
  return {
    parsedTags,
    cleanedText,
  };
}

/**
 * Extract unique tag names from parsed tags
 * @param parsedTags - Array of parsed tags
 * @returns Array of unique tag names (lowercase)
 */
export function extractUniqueTagNames(parsedTags: ParsedTag[]): string[] {
  const uniqueTags = new Set<string>();
  
  for (const { tag } of parsedTags) {
    // Normalize tag names to lowercase for consistency
    uniqueTags.add(tag.toLowerCase());
  }
  
  return Array.from(uniqueTags);
}

/**
 * Format tag names for display
 * @param tag - Tag name to format
 * @returns Formatted tag name (capitalized)
 */
export function formatTagName(tag: string): string {
  return tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase();
}

/**
 * Check if text contains any tag mentions
 * @param text - The text to check
 * @returns True if text contains @ mentions
 */
export function hasTagMentions(text: string): boolean {
  return /@[a-zA-Z0-9_-]+/.test(text);
}
