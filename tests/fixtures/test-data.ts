/**
 * Test data fixture
 * Provides test todo data for CRUD tests
 */

export interface TestTodo {
  text: string;
}

/**
 * Sample todo items for testing
 */
export const sampleTodos: TestTodo[] = [
  { text: 'Buy groceries' },
  { text: 'Complete project report' },
  { text: 'Call dentist for appointment' },
  { text: 'Review code changes' },
  { text: 'Plan weekend trip' },
  { text: 'Update documentation' },
  { text: 'Fix bug in authentication' },
  { text: 'Organize team meeting' },
];

/**
 * Generate a unique todo text
 */
export function generateUniqueTodoText(prefix: string = 'Test todo'): string {
  const timestamp = Date.now();
  return `${prefix} ${timestamp}`;
}

/**
 * Create multiple test todos
 */
export function createTestTodos(count: number, prefix: string = 'Test todo'): TestTodo[] {
  return Array.from({ length: count }, (_, i) => ({
    text: `${prefix} ${i + 1} - ${Date.now()}`,
  }));
}

/**
 * Search test data
 */
export const searchTestData = {
  todos: [
    { text: 'Buy milk and bread' },
    { text: 'Schedule dentist appointment' },
    { text: 'Review pull request' },
    { text: 'Write unit tests' },
    { text: 'Update README documentation' },
  ],
  searchTerms: {
    single: 'milk',
    multiple: 'test',
    noMatch: 'xyzzz',
    partial: 'appoint',
  },
};

/**
 * Long text for testing validation
 */
export const validationTestData = {
  tooShort: '',
  valid: 'This is a valid todo',
  tooLong: 'A'.repeat(1000),
  specialChars: '!@#$%^&*()_+-=[]{}|;:\'",.<>?/`~',
  unicode: '🎉 Unicode todo 你好 مرحبا',
};
