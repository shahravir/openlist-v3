import { expect, Page } from '@playwright/test';

/**
 * Custom assertion utilities for tests
 */

/**
 * Assert that a todo item exists with the given text
 */
export async function assertTodoExists(page: Page, text: string) {
  const todo = page.locator(`span:has-text("${text}")`);
  await expect(todo).toBeVisible();
}

/**
 * Assert that a todo item does not exist
 */
export async function assertTodoDoesNotExist(page: Page, text: string) {
  const todo = page.locator(`span:has-text("${text}")`);
  await expect(todo).not.toBeVisible();
}

/**
 * Assert that the todo count matches expected
 */
export async function assertTodoCount(page: Page, expectedCount: number) {
  const todos = page.locator('.group.flex.items-center.gap-3.px-4.py-3.bg-white.rounded-lg');
  await expect(todos).toHaveCount(expectedCount);
}

/**
 * Assert that the page title matches expected
 */
export async function assertPageTitle(page: Page, expectedTitle: string) {
  await expect(page).toHaveTitle(expectedTitle);
}

/**
 * Assert that an element has focus
 */
export async function assertElementHasFocus(page: Page, selector: string) {
  const focused = await page.evaluate((sel) => {
    const element = document.querySelector(sel);
    return element === document.activeElement;
  }, selector);
  expect(focused).toBe(true);
}

/**
 * Assert that an error message is displayed
 */
export async function assertErrorMessage(page: Page, message: string) {
  const error = page.locator('.bg-red-50');
  await expect(error).toBeVisible();
  await expect(error).toContainText(message);
}

/**
 * Assert that the user is authenticated (OpenList header visible)
 */
export async function assertUserIsAuthenticated(page: Page) {
  const header = page.locator('h1:has-text("OpenList")');
  await expect(header).toBeVisible();
}

/**
 * Assert that the user is not authenticated (login form visible)
 */
export async function assertUserIsNotAuthenticated(page: Page) {
  // Wait for the login form to appear (React needs time to re-render after logout)
  // First wait for the OpenList header to disappear (if it was visible)
  try {
    await page.waitForSelector('h1:has-text("OpenList")', { state: 'hidden', timeout: 5000 });
  } catch {
    // Header might not have been visible, that's okay
  }
  
  // After logout, the app should show the login form (authView is reset to 'login')
  const loginForm = page.locator('h2:has-text("Login")');
  await expect(loginForm).toBeVisible({ timeout: 10000 });
}

/**
 * Assert that empty state is visible
 */
export async function assertEmptyStateVisible(page: Page) {
  const emptyState = page.locator('text=No tasks yet');
  await expect(emptyState).toBeVisible();
}

/**
 * Assert that search highlights are visible
 */
export async function assertSearchHighlight(page: Page, searchTerm: string) {
  const highlighted = page.locator(`span.bg-yellow-200:has-text("${searchTerm}")`);
  await expect(highlighted).toBeVisible();
}

/**
 * Assert that sync status is displayed
 */
export async function assertSyncStatus(page: Page, status: string) {
  const syncStatus = page.locator(`.text-xs:has-text("${status}")`);
  await expect(syncStatus).toBeVisible();
}

/**
 * Assert that an element has an attribute
 */
export async function assertElementHasAttribute(
  page: Page,
  selector: string,
  attribute: string,
  expectedValue?: string
) {
  const element = page.locator(selector);
  if (expectedValue !== undefined) {
    await expect(element).toHaveAttribute(attribute, expectedValue);
  } else {
    const value = await element.getAttribute(attribute);
    expect(value).not.toBeNull();
  }
}

/**
 * Assert that an element is visible in viewport
 */
export async function assertElementInViewport(page: Page, selector: string) {
  const isInView = await page.evaluate((sel) => {
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
  expect(isInView).toBe(true);
}

/**
 * Assert that no horizontal scrollbar is present
 */
export async function assertNoHorizontalScroll(page: Page) {
  const hasHorizontalScroll = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  expect(hasHorizontalScroll).toBe(false);
}

/**
 * Assert that an element has ARIA attribute
 */
export async function assertAriaAttribute(
  page: Page,
  selector: string,
  attribute: string,
  expectedValue?: string
) {
  await assertElementHasAttribute(page, selector, `aria-${attribute}`, expectedValue);
}

/**
 * Assert that completed count matches expected
 */
export async function assertCompletedCount(page: Page, expectedCount: number) {
  const statsText = await page.locator('p.text-sm.text-gray-500').first().textContent();
  const match = statsText?.match(/(\d+) of (\d+) completed/);
  const completedCount = match ? parseInt(match[1]) : 0;
  expect(completedCount).toBe(expectedCount);
}
