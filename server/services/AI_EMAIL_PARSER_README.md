# AI Email Parser Service

This service uses OpenAI's GPT models to automatically identify and extract actionable todos from email content.

## Features

- **Smart Todo Identification**: Analyzes email content to identify actionable items that require recipient action
- **Confidence Scoring**: Each identified todo includes a confidence score (0-1) indicating AI's certainty
- **Context Extraction**: Provides relevant context from the email for each todo
- **Priority Detection**: Automatically detects priority levels (high, medium, low, none)
- **Due Date Extraction**: Identifies and extracts due dates mentioned in the email
- **Tag Suggestions**: Suggests relevant tags/categories for each todo
- **Low False Positive Rate**: Designed to avoid creating todos from spam, newsletters, or general information
- **Graceful Error Handling**: Handles API failures, rate limits, and configuration issues gracefully

## Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# Required: OpenAI API Key
OPENAI_API_KEY=sk-your-api-key-here

# Optional: Feature flag (default: false)
AI_EMAIL_PARSING_ENABLED=true

# Optional: AI model to use (default: gpt-3.5-turbo)
AI_MODEL=gpt-3.5-turbo
# Other options: gpt-4, gpt-4-turbo-preview
```

### Getting an OpenAI API Key

1. Sign up at [OpenAI Platform](https://platform.openai.com/)
2. Navigate to [API Keys](https://platform.openai.com/api-keys)
3. Create a new API key
4. Add billing information (required for API usage)

### Cost Considerations

- **gpt-3.5-turbo**: ~$0.001 per 1K tokens (recommended for cost efficiency)
- **gpt-4**: ~$0.03 per 1K tokens (better accuracy, higher cost)
- Average email analysis: ~500-1000 tokens per email
- Content is truncated to 4000 characters to limit costs

## Usage

### Basic Usage

```typescript
import { identifyTodosFromEmail, extractTodoDetails, analyzeEmailForTodos } from './services/aiEmailParser';

// Example email content
const emailContent = `
Subject: Project Update and Action Items

Hi Team,

Great meeting today! Here are the action items:
1. Review the PR by Friday
2. Schedule client demo for next week
3. Update documentation

Thanks!
`;

// Identify todos
const todos = await identifyTodosFromEmail(emailContent);
console.log(todos);
// Output:
// [
//   {
//     text: "Review the PR by Friday",
//     confidence: 0.9,
//     context: "Action item from project meeting"
//   },
//   ...
// ]
```

### Extract Details

```typescript
// Extract priority, due date, and tags
const details = await extractTodoDetails(
  "Review the PR by Friday",
  "Review the PR by Friday - this is urgent for the release"
);

console.log(details);
// Output:
// {
//   priority: "high",
//   dueDate: "by Friday",
//   tags: ["review", "pr", "urgent"]
// }
```

### Combined Analysis

```typescript
// Analyze email and get todos with details in one call
const todosWithDetails = await analyzeEmailForTodos(emailContent);

console.log(todosWithDetails);
// Output:
// [
//   {
//     text: "Review the PR by Friday",
//     confidence: 0.9,
//     context: "Action item from project meeting",
//     priority: "high",
//     dueDate: "by Friday",
//     tags: ["review", "pr"]
//   },
//   ...
// ]
```

### Integration with Gmail

```typescript
import { getEmailContent } from './services/gmail';
import { analyzeEmailForTodos } from './services/aiEmailParser';

// Fetch email from Gmail
const email = await getEmailContent(userId, messageId);

// Analyze for todos
const emailContent = `Subject: ${email.subject}\n\n${email.body}`;
const todos = await analyzeEmailForTodos(emailContent);

// Create todos in database
for (const todo of todos) {
  if (todo.confidence >= 0.7) { // Only high-confidence todos
    await createTodo({
      userId,
      text: todo.text,
      priority: todo.priority || 'none',
      // Parse due date as needed
      tags: todo.tags || [],
    });
  }
}
```

## API Reference

### `isAIParsingEnabled(): boolean`

Checks if AI parsing is enabled and configured.

**Returns**: `true` if AI parsing is available, `false` otherwise.

### `identifyTodosFromEmail(emailContent: string): Promise<IdentifiedTodo[]>`

Analyzes email content and identifies actionable todos.

**Parameters**:
- `emailContent` (string): Email subject and body combined

**Returns**: Array of `IdentifiedTodo` objects:
```typescript
interface IdentifiedTodo {
  text: string;        // The todo text
  confidence: number;  // Confidence score (0-1)
  context: string;     // Relevant context from email
}
```

**Example**:
```typescript
const todos = await identifyTodosFromEmail(emailContent);
```

### `extractTodoDetails(todoText: string, emailContext: string): Promise<TodoDetails>`

Extracts priority, due date, and tags from a todo.

**Parameters**:
- `todoText` (string): The todo text to analyze
- `emailContext` (string): Original email context

**Returns**: `TodoDetails` object:
```typescript
interface TodoDetails {
  priority?: 'none' | 'low' | 'medium' | 'high';
  dueDate?: string;  // Natural language date
  tags?: string[];   // Array of suggested tags
}
```

**Example**:
```typescript
const details = await extractTodoDetails(
  "Complete the report by Friday",
  "Please complete the quarterly report by Friday for the board meeting"
);
```

### `analyzeEmailForTodos(emailContent: string): Promise<Array<IdentifiedTodo & TodoDetails>>`

Convenience function that combines identification and detail extraction.

**Parameters**:
- `emailContent` (string): Email subject and body combined

**Returns**: Array of todos with all details.

**Example**:
```typescript
const todos = await analyzeEmailForTodos(emailContent);
```

## Error Handling

The service handles errors gracefully and returns empty results on failure:

```typescript
try {
  const todos = await identifyTodosFromEmail(emailContent);
  // Process todos
} catch (error) {
  if (error.message.includes('rate limit')) {
    // Handle rate limit error
    console.log('Please try again later');
  } else if (error.message.includes('authentication')) {
    // Handle API key error
    console.log('Invalid API key');
  } else {
    // Other errors return empty array (graceful fallback)
    console.log('AI parsing unavailable, continuing without it');
  }
}
```

### Common Errors

- **Rate Limit Exceeded**: OpenAI API has rate limits. Implement exponential backoff or queuing.
- **Authentication Failed**: Check that `OPENAI_API_KEY` is valid.
- **Network Error**: Check internet connectivity.
- **Invalid Response**: AI returned unexpected format (handled automatically).

## Best Practices

### 1. Confidence Threshold

Only create todos with high confidence scores:

```typescript
const todos = await identifyTodosFromEmail(emailContent);
const highConfidenceTodos = todos.filter(t => t.confidence >= 0.7);
```

### 2. Batch Processing

Process multiple emails with delays to avoid rate limits:

```typescript
for (const email of emails) {
  const todos = await analyzeEmailForTodos(email.content);
  // Process todos...
  
  // Wait between requests
  await new Promise(resolve => setTimeout(resolve, 1000));
}
```

### 3. Caching

Cache results to reduce API calls:

```typescript
const cache = new Map<string, IdentifiedTodo[]>();

async function getCachedTodos(emailId: string, emailContent: string) {
  if (cache.has(emailId)) {
    return cache.get(emailId);
  }
  
  const todos = await identifyTodosFromEmail(emailContent);
  cache.set(emailId, todos);
  return todos;
}
```

### 4. User Confirmation

Consider requiring user confirmation before automatically creating todos:

```typescript
const suggestions = await analyzeEmailForTodos(emailContent);
// Show suggestions to user
// Create todos only after user confirms
```

## Limitations

1. **Cost**: Each API call costs money based on tokens used
2. **Rate Limits**: OpenAI has rate limits (tier-based)
3. **Accuracy**: AI is not 100% accurate, may have false positives/negatives
4. **Language**: Works best with English content
5. **Content Length**: Limited to ~4000 characters per email
6. **No Context Memory**: Each email is analyzed independently

## Testing

When testing locally without an API key:

```bash
# Service will gracefully return empty results
npm run dev
```

With an API key:

```bash
# Set environment variables
export OPENAI_API_KEY=sk-your-key
export AI_EMAIL_PARSING_ENABLED=true

# Run test script
npx tsx test-ai-parser.ts
```

## Troubleshooting

### "AI parsing is disabled"

- Check that `OPENAI_API_KEY` is set
- Check that `AI_EMAIL_PARSING_ENABLED=true`
- Restart the server after setting environment variables

### "Rate limit exceeded"

- Wait a few minutes before retrying
- Upgrade to higher OpenAI API tier
- Implement request queuing with delays

### "Empty response from OpenAI API"

- Check API key validity
- Check OpenAI service status
- Check network connectivity

### Poor accuracy / Many false positives

- Adjust confidence threshold (increase from 0.7 to 0.8+)
- Fine-tune prompts in the service
- Consider switching to GPT-4 for better accuracy

## Future Enhancements

- [ ] Support for other AI providers (Anthropic, Google, etc.)
- [ ] Streaming responses for real-time feedback
- [ ] Fine-tuned models for better accuracy
- [ ] Multi-language support
- [ ] Local caching with Redis
- [ ] Background job processing
- [ ] User feedback loop to improve accuracy
- [ ] Custom prompt templates per user
