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
 * @deprecated Use waitForElement, waitForNetworkIdle, or waitForStateChange instead
 */
export async function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wait for an element to appear/disappear instead of using fixed timeouts
 */
export async function waitForElement(
  page: Page,
  selector: string,
  options?: { state?: 'visible' | 'hidden' | 'attached' | 'detached'; timeout?: number }
): Promise<void> {
  await page.waitForSelector(selector, {
    state: options?.state || 'visible',
    timeout: options?.timeout || 5000,
  });
}

/**
 * Wait for network to be idle (no requests for 500ms)
 * Useful after actions that trigger API calls
 */
export async function waitForNetworkIdle(page: Page, timeout: number = 5000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Wait for a specific number of todos to appear
 */
export async function waitForTodoCount(
  page: Page,
  expectedCount: number,
  timeout: number = 5000
): Promise<void> {
  const selector = '.group.flex.items-center.gap-3.px-4.py-3.bg-white.rounded-lg';
  let attempts = 0;
  const maxAttempts = timeout / 100;
  
  while (attempts < maxAttempts) {
    const count = await page.locator(selector).count();
    if (count === expectedCount) {
      return;
    }
    await wait(100);
    attempts++;
  }
  
  throw new Error(`Expected ${expectedCount} todos but found ${await page.locator(selector).count()}`);
}

/**
 * Wait for form to close (FAB button to reappear)
 */
export async function waitForFormToClose(page: Page, timeout: number = 5000): Promise<void> {
  await page.waitForSelector('button[aria-label="Add new todo"]', {
    state: 'visible',
    timeout,
  });
}

/**
 * Wait for sync to complete by checking sync status indicator
 */
export async function waitForSyncComplete(page: Page, timeout: number = 10000): Promise<void> {
  // Wait for sync status to show as synced or disappear
  try {
    await page.waitForSelector('[aria-label*="synced"], [aria-label*="Synced"]', {
      state: 'visible',
      timeout: 2000,
    });
  } catch {
    // Sync indicator might not be visible, that's okay
  }
  // Additional small wait for any pending operations
  await wait(200);
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
 * Note: Page must be navigated to the app first
 */
export async function getLocalStorageItem(page: Page, key: string): Promise<string | null> {
  try {
    return await page.evaluate((k) => {
      try {
        return localStorage.getItem(k);
      } catch (e) {
        console.warn('Could not access localStorage:', e);
        return null;
      }
    }, key);
  } catch (error) {
    console.warn('Error getting localStorage item:', error);
    return null;
  }
}

/**
 * Set local storage value
 * Note: Page must be navigated to the app first
 */
export async function setLocalStorageItem(page: Page, key: string, value: string): Promise<void> {
  try {
    await page.evaluate(
      ({ k, v }) => {
        try {
          localStorage.setItem(k, v);
        } catch (e) {
          console.warn('Could not set localStorage item:', e);
        }
      },
      { k: key, v: value }
    );
  } catch (error) {
    console.warn('Error setting localStorage item:', error);
  }
}

/**
 * Clear local storage
 * Note: Must navigate to the app first to access localStorage
 */
export async function clearLocalStorage(page: Page): Promise<void> {
  // Navigate to the app first to ensure we're on the correct origin
  // This is critical - localStorage can only be accessed from the same origin
  await page.goto('/');
  
  // Wait for page to be ready
  await page.waitForLoadState('domcontentloaded');
  
  // Clear localStorage with error handling
  await page.evaluate(() => {
    try {
      localStorage.clear();
    } catch (e) {
      // If localStorage access fails, log warning but don't throw
      // This can happen if:
      // 1. Page is in an iframe with different origin
      // 2. Browser security settings block localStorage
      // 3. Page is still loading
      console.warn('Could not clear localStorage:', e);
    }
  });
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
