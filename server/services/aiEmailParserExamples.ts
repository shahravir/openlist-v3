// Example integration of AI Email Parser with Gmail service
// This file demonstrates how to use the AI email parser service with Gmail emails

import { getEmailContent, EmailContent } from './gmail.js';
import { analyzeEmailForTodos, identifyTodosFromEmail, extractTodoDetails } from './aiEmailParser.js';

/**
 * Example 1: Analyze a single email for todos
 * 
 * @param userId - User ID 
 * @param messageId - Gmail message ID
 * @returns Array of identified todos with details
 */
export async function analyzeSingleEmail(userId: string, messageId: string) {
  // Fetch email content from Gmail
  const email = await getEmailContent(userId, messageId);
  
  // Combine subject and body for analysis
  const emailContent = `Subject: ${email.subject}\n\n${email.body}`;
  
  // Analyze email for todos using AI
  const todos = await analyzeEmailForTodos(emailContent);
  
  return {
    email: {
      id: email.id,
      subject: email.subject,
      from: email.from,
      date: email.date,
    },
    todos,
  };
}

/**
 * Example 2: Just identify todos without details (faster)
 * 
 * @param emailContent - Email subject and body
 * @returns Array of identified todos
 */
export async function quickTodoIdentification(emailContent: string) {
  // This is faster as it only does one AI call
  const todos = await identifyTodosFromEmail(emailContent);
  
  // Filter by confidence threshold (e.g., only include high-confidence todos)
  const highConfidenceTodos = todos.filter(todo => todo.confidence >= 0.7);
  
  return highConfidenceTodos;
}

/**
 * Example 3: Extract details for a specific todo text
 * 
 * @param todoText - The todo text
 * @param emailContext - Original email context
 * @returns Todo details
 */
export async function getTodoDetailsForText(todoText: string, emailContext: string) {
  const details = await extractTodoDetails(todoText, emailContext);
  return details;
}

/**
 * Example 4: Process multiple emails in batch
 * Note: Be mindful of API rate limits and costs
 * 
 * @param userId - User ID
 * @param messageIds - Array of Gmail message IDs
 * @returns Array of results with todos for each email
 */
export async function batchAnalyzeEmails(userId: string, messageIds: string[]) {
  // Process emails sequentially to avoid rate limits
  const results = [];
  
  for (const messageId of messageIds) {
    try {
      const result = await analyzeSingleEmail(userId, messageId);
      results.push(result);
      
      // Add small delay between requests to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Error analyzing email ${messageId}:`, error);
      // Continue with next email even if one fails
      results.push({
        email: { id: messageId },
        todos: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
  
  return results;
}

/**
 * Example 5: Analyze email with custom filtering
 * 
 * @param email - Email content object
 * @returns Filtered todos based on business rules
 */
export async function analyzeEmailWithFiltering(email: EmailContent) {
  const emailContent = `Subject: ${email.subject}\n\nFrom: ${email.from}\n\n${email.body}`;
  
  // Get all todos
  const allTodos = await analyzeEmailForTodos(emailContent);
  
  // Apply custom filtering rules
  const filteredTodos = allTodos.filter(todo => {
    // Skip low confidence todos
    if (todo.confidence < 0.6) return false;
    
    // Skip todos that are too short (likely false positives)
    if (todo.text.length < 10) return false;
    
    // Could add more business logic here
    // e.g., filter by sender domain, keywords, etc.
    
    return true;
  });
  
  return filteredTodos;
}
