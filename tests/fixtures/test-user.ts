/**
 * Test user fixture
 * Provides test user credentials for authentication tests
 */

export interface TestUser {
  email: string;
  password: string;
}

/**
 * Generate a unique test user email
 */
export function generateTestUserEmail(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `test-${timestamp}-${random}@example.com`;
}

/**
 * Default test user credentials
 */
export const defaultTestUser: TestUser = {
  email: generateTestUserEmail(),
  password: 'TestPassword123!',
};

/**
 * Create a new test user with unique credentials
 */
export function createTestUser(overrides?: Partial<TestUser>): TestUser {
  return {
    email: generateTestUserEmail(),
    password: 'TestPassword123!',
    ...overrides,
  };
}

/**
 * Test users for different scenarios
 */
export const testUsers = {
  valid: createTestUser(),
  anotherValid: createTestUser(),
  invalidPassword: {
    email: generateTestUserEmail(),
    password: 'wrong',
  },
  weakPassword: {
    email: generateTestUserEmail(),
    password: '123',
  },
};
