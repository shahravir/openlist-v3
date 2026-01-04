import { Page } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { TodoPage } from '../pages/TodoPage';
import { TestUser } from '../fixtures/test-user';

/**
 * Helper functions for common test operations
 */

/**
 * Register a new user and return to the todo page
 */
export async function registerUser(page: Page, user: TestUser): Promise<void> {
  const registerPage = new RegisterPage(page);
  await registerPage.goto();
  await registerPage.register(user.email, user.password);
  await registerPage.waitForNavigation();
}

/**
 * Login as an existing user
 */
export async function loginUser(page: Page, user: TestUser): Promise<void> {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(user.email, user.password);
  await loginPage.waitForNavigation();
}

/**
 * Setup authenticated session by registering a new user
 */
export async function setupAuthenticatedSession(page: Page, user: TestUser): Promise<void> {
  await registerUser(page, user);
}

/**
 * Logout the current user
 */
export async function logoutUser(page: Page): Promise<void> {
  const todoPage = new TodoPage(page);
  await todoPage.clickLogout();
  // Wait for login form to appear
  await page.waitForSelector('h2:has-text("Login")', { timeout: 5000 });
}

/**
 * Wait for a specific amount of time
 */
export async function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create multiple todos for testing
 */
export async function createMultipleTodos(page: Page, todos: string[]): Promise<void> {
  const todoPage = new TodoPage(page);
  for (const text of todos) {
    await todoPage.addTodo(text);
  }
}

/**
 * Clear all todos (useful for cleanup)
 */
export async function clearAllTodos(page: Page): Promise<void> {
  const todoPage = new TodoPage(page);
  let count = await todoPage.getTodoCount();
  while (count > 0) {
    await todoPage.deleteTodo(0);
    count = await todoPage.getTodoCount();
  }
}

/**
 * Check if an element is in viewport
 */
export async function isInViewport(page: Page, selector: string): Promise<boolean> {
  return await page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }, selector);
}

/**
 * Get local storage value
 */
export async function getLocalStorageItem(page: Page, key: string): Promise<string | null> {
  return await page.evaluate((k) => localStorage.getItem(k), key);
}

/**
 * Set local storage value
 */
export async function setLocalStorageItem(page: Page, key: string, value: string): Promise<void> {
  await page.evaluate(
    ({ k, v }) => localStorage.setItem(k, v),
    { k: key, v: value }
  );
}

/**
 * Clear local storage
 */
export async function clearLocalStorage(page: Page): Promise<void> {
  await page.evaluate(() => localStorage.clear());
}

/**
 * Retry an operation with exponential backoff
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await wait(delayMs * Math.pow(2, i));
      }
    }
  }
  throw lastError!;
}

/**
 * Take a screenshot with a descriptive name
 */
export async function takeScreenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `test-results/screenshots/${name}.png`, fullPage: true });
}

/**
 * Check if running on mobile viewport
 */
export function isMobileViewport(page: Page): boolean {
  const viewport = page.viewportSize();
  return viewport ? viewport.width < 768 : false;
}
