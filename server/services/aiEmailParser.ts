import OpenAI from 'openai';

// Configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const AI_ENABLED = process.env.AI_EMAIL_PARSING_ENABLED === 'true';
const AI_MODEL = process.env.AI_MODEL || 'gpt-3.5-turbo';

// Initialize OpenAI client (only if API key is provided)
let openaiClient: OpenAI | null = null;
if (OPENAI_API_KEY) {
  openaiClient = new OpenAI({
    apiKey: OPENAI_API_KEY,
  });
} else {
  console.warn('OPENAI_API_KEY not set. AI email parsing will be disabled.');
}

// Types for AI responses
export interface IdentifiedTodo {
  text: string;
  confidence: number;
  context: string;
}

export interface TodoDetails {
  priority?: 'none' | 'low' | 'medium' | 'high';
  dueDate?: string;
  tags?: string[];
}

/**
 * Check if AI email parsing is enabled and configured
 * @returns True if AI parsing is available
 */
export function isAIParsingEnabled(): boolean {
  return AI_ENABLED && openaiClient !== null;
}

/**
 * Identify todos from email content using AI
 * @param emailContent - Email subject and body combined
 * @returns Array of identified todos with confidence scores and context
 */
export async function identifyTodosFromEmail(emailContent: string): Promise<IdentifiedTodo[]> {
  // Check if AI parsing is enabled
  if (!isAIParsingEnabled()) {
    console.log('AI email parsing is disabled');
    return [];
  }

  if (!openaiClient) {
    console.error('OpenAI client not initialized');
    return [];
  }

  // Validate input
  if (!emailContent || emailContent.trim().length === 0) {
    console.warn('Empty email content provided');
    return [];
  }

  // Limit content length to avoid excessive token usage (max ~4000 chars)
  const maxContentLength = 4000;
  const truncatedContent = emailContent.length > maxContentLength 
    ? emailContent.substring(0, maxContentLength) + '...'
    : emailContent;

  try {
    console.log('Analyzing email content for todos using AI...');
    console.log(`Content length: ${truncatedContent.length} characters`);

    // Construct prompt for identifying todos
    const systemPrompt = `You are an AI assistant that analyzes email content and identifies actionable todos/tasks.

Your goal is to:
1. Identify items that require action from the email recipient
2. Distinguish between actionable items and general information
3. Avoid false positives from spam, newsletters, or non-actionable content
4. Extract relevant context for each todo

Return ONLY items that are:
- Clear action items or tasks
- Something the recipient needs to do
- Not general information or FYI content
- Not automated messages or spam

For each identified todo, provide:
- text: The todo text (clear and actionable)
- confidence: Confidence score between 0 and 1 (0.7+ for high confidence)
- context: Relevant context from the email (who, what, when, why)

Return your response as a JSON array. If no actionable todos are found, return an empty array.`;

    const userPrompt = `Analyze this email and identify actionable todos/tasks:\n\n${truncatedContent}`;

    // Call OpenAI API
    const response = await openaiClient.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3, // Lower temperature for more consistent results
      max_tokens: 1000,
      response_format: { type: 'json_object' }
    });

    // Parse response
    const content = response.choices[0]?.message?.content;
    
    if (!content) {
      console.warn('Empty response from OpenAI API');
      return [];
    }

    // Parse JSON response
    const parsed = JSON.parse(content);
    
    // Handle different response formats
    let todos: IdentifiedTodo[] = [];
    
    if (Array.isArray(parsed)) {
      todos = parsed;
    } else if (parsed.todos && Array.isArray(parsed.todos)) {
      todos = parsed.todos;
    } else if (parsed.items && Array.isArray(parsed.items)) {
      todos = parsed.items;
    } else {
      console.warn('Unexpected response format from OpenAI:', parsed);
      return [];
    }

    // Validate and normalize todos
    const validTodos = todos
      .filter((todo: any) => {
        return todo.text && 
               typeof todo.text === 'string' && 
               todo.text.trim().length > 0 &&
               typeof todo.confidence === 'number' &&
               todo.confidence >= 0 && 
               todo.confidence <= 1;
      })
      .map((todo: any) => ({
        text: todo.text.trim(),
        confidence: Math.min(Math.max(todo.confidence, 0), 1), // Clamp between 0 and 1
        context: (todo.context || '').trim()
      }));

    console.log(`Identified ${validTodos.length} todos from email`);
    
    return validTodos;
  } catch (error: any) {
    console.error('Error identifying todos from email:', error);
    
    // Handle specific error types
    if (error.status === 429) {
      console.error('OpenAI API rate limit exceeded');
      throw new Error('AI service rate limit exceeded. Please try again later.');
    }
    
    if (error.status === 401) {
      console.error('OpenAI API authentication failed');
      throw new Error('AI service authentication failed. Please check API key.');
    }
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      console.error('Network error connecting to OpenAI API');
      throw new Error('AI service unavailable. Please check network connection.');
    }
    
    // For other errors, return empty array (graceful fallback)
    console.error('Falling back to empty results due to error');
    return [];
  }
}

/**
 * Extract todo details (priority, due date, tags) from todo text and email context
 * @param todoText - The identified todo text
 * @param emailContext - Context from the original email
 * @returns Extracted todo details (priority, due date, tags)
 */
export async function extractTodoDetails(
  todoText: string, 
  emailContext: string
): Promise<TodoDetails> {
  // Check if AI parsing is enabled
  if (!isAIParsingEnabled()) {
    console.log('AI email parsing is disabled');
    return {};
  }

  if (!openaiClient) {
    console.error('OpenAI client not initialized');
    return {};
  }

  // Validate input
  if (!todoText || todoText.trim().length === 0) {
    console.warn('Empty todo text provided');
    return {};
  }

  try {
    console.log('Extracting todo details using AI...');

    // Construct prompt for extracting details
    const systemPrompt = `You are an AI assistant that extracts structured details from todo text and email context.

Your goal is to extract:
1. Priority: Determine if the task is urgent, important, or normal
   - "high": urgent, critical, ASAP, immediately, deadline soon
   - "medium": important, should be done, upcoming
   - "low": nice to have, when you can, low priority
   - "none": no priority mentioned (default)

2. Due date: Extract any time-related information
   - Return as natural language string (e.g., "by Friday", "next week", "end of month")
   - Only include if explicitly mentioned
   - Do not infer dates

3. Tags: Identify relevant categories or labels
   - Common tags: work, personal, meeting, email, review, urgent, etc.
   - Max 3 tags
   - Only include if clearly relevant

Return your response as a JSON object with these optional fields:
- priority: "none" | "low" | "medium" | "high"
- dueDate: string (only if mentioned)
- tags: string[] (only if relevant)

If no details can be extracted, return an empty object.`;

    const userPrompt = `Extract details from this todo:\n\nTodo: ${todoText}\n\nContext: ${emailContext}`;

    // Call OpenAI API
    const response = await openaiClient.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2, // Very low temperature for consistent extraction
      max_tokens: 300,
      response_format: { type: 'json_object' }
    });

    // Parse response
    const content = response.choices[0]?.message?.content;
    
    if (!content) {
      console.warn('Empty response from OpenAI API');
      return {};
    }

    // Parse JSON response
    const parsed = JSON.parse(content);
    
    // Normalize and validate response
    const details: TodoDetails = {};
    
    // Validate priority
    if (parsed.priority && ['none', 'low', 'medium', 'high'].includes(parsed.priority)) {
      details.priority = parsed.priority;
    }
    
    // Validate due date
    if (parsed.dueDate && typeof parsed.dueDate === 'string' && parsed.dueDate.trim().length > 0) {
      details.dueDate = parsed.dueDate.trim();
    }
    
    // Validate tags
    if (parsed.tags && Array.isArray(parsed.tags)) {
      details.tags = parsed.tags
        .filter((tag: any) => typeof tag === 'string' && tag.trim().length > 0)
        .map((tag: string) => tag.trim().toLowerCase())
        .slice(0, 3); // Limit to 3 tags
    }

    console.log('Extracted todo details:', details);
    
    return details;
  } catch (error: any) {
    console.error('Error extracting todo details:', error);
    
    // Handle specific error types
    if (error.status === 429) {
      console.error('OpenAI API rate limit exceeded');
      throw new Error('AI service rate limit exceeded. Please try again later.');
    }
    
    if (error.status === 401) {
      console.error('OpenAI API authentication failed');
      throw new Error('AI service authentication failed. Please check API key.');
    }
    
    // For other errors, return empty object (graceful fallback)
    console.error('Falling back to empty details due to error');
    return {};
  }
}

/**
 * Analyze email and extract todos with details in a single call
 * This is a convenience function that combines identifyTodosFromEmail and extractTodoDetails
 * @param emailContent - Email subject and body combined
 * @returns Array of todos with details
 */
export async function analyzeEmailForTodos(emailContent: string): Promise<Array<IdentifiedTodo & TodoDetails>> {
  // First, identify todos
  const identifiedTodos = await identifyTodosFromEmail(emailContent);
  
  if (identifiedTodos.length === 0) {
    return [];
  }

  // Then, extract details for each todo
  const todosWithDetails = await Promise.all(
    identifiedTodos.map(async (todo) => {
      try {
        const details = await extractTodoDetails(todo.text, todo.context);
        return {
          ...todo,
          ...details
        };
      } catch (error) {
        console.error(`Error extracting details for todo "${todo.text}":`, error);
        // Return todo without details if extraction fails
        return todo;
      }
    })
  );

  return todosWithDetails;
}
