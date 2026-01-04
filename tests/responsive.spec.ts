import { test, expect } from '@playwright/test';
import { TodoPage } from './pages/TodoPage';
import { createTestUser } from './fixtures/test-user';
import { generateUniqueTodoText } from './fixtures/test-data';
import {
  setupAuthenticatedSession,
  clearLocalStorage,
} from './utils/helpers';
import {
  assertNoHorizontalScroll,
  assertTodoCount,
} from './utils/assertions';

test.describe('Responsive Design', () => {
  test.beforeEach(async ({ page }) => {
    await clearLocalStorage(page);
    const testUser = createTestUser();
    await setupAuthenticatedSession(page, testUser);
  });

  test('layout works on mobile viewport (iPhone)', async ({ page }) => {
    const todoPage = new TodoPage(page);

    // Set mobile viewport (iPhone size)
    await page.setViewportSize({ width: 375, height: 667 });

    // Add some todos
    await todoPage.addTodo(generateUniqueTodoText('Mobile task 1'));
    await todoPage.addTodo(generateUniqueTodoText('Mobile task 2'));

    // Verify todos are visible
    await assertTodoCount(page, 2);

    // Check no horizontal scroll
    await assertNoHorizontalScroll(page);

    // Verify header is visible
    const header = page.locator('h1:has-text("OpenList")');
    await expect(header).toBeVisible();

    // Verify FAB is visible and positioned correctly
    const fab = page.locator('button[aria-label="Add new todo"]');
    await expect(fab).toBeVisible();
  });

  test('layout works on tablet viewport (iPad)', async ({ page }) => {
    const todoPage = new TodoPage(page);

    // Set tablet viewport (iPad size)
    await page.setViewportSize({ width: 768, height: 1024 });

    // Add some todos
    await todoPage.addTodo(generateUniqueTodoText('Tablet task 1'));
    await todoPage.addTodo(generateUniqueTodoText('Tablet task 2'));

    // Verify todos are visible
    await assertTodoCount(page, 2);

    // Check no horizontal scroll
    await assertNoHorizontalScroll(page);

    // Verify header is visible
    const header = page.locator('h1:has-text("OpenList")');
    await expect(header).toBeVisible();
  });

  test('layout works on desktop viewport', async ({ page }) => {
    const todoPage = new TodoPage(page);

    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Add some todos
    await todoPage.addTodo(generateUniqueTodoText('Desktop task 1'));
    await todoPage.addTodo(generateUniqueTodoText('Desktop task 2'));

    // Verify todos are visible
    await assertTodoCount(page, 2);

    // Check no horizontal scroll
    await assertNoHorizontalScroll(page);

    // Verify content is centered
    const container = page.locator('.max-w-2xl');
    await expect(container).toBeVisible();
  });

  test('touch interactions work on mobile', async ({ page }) => {
    const todoPage = new TodoPage(page);

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Add a todo
    const todoText = generateUniqueTodoText('Touch test');
    await todoPage.addTodo(todoText);

    // Tap to complete
    await todoPage.toggleTodo(0);
    expect(await todoPage.isTodoCompleted(0)).toBe(true);

    // Tap to uncomplete
    await todoPage.toggleTodo(0);
    expect(await todoPage.isTodoCompleted(0)).toBe(false);

    // Mobile should show action buttons without hover
    // Edit and delete buttons should be visible
    const todoItem = todoPage.getTodoItems().nth(0);
    const editButton = todoItem.locator('button[aria-label="Edit todo"]');
    const deleteButton = todoItem.locator('button[aria-label="Delete todo"]');

    await expect(editButton).toBeVisible();
    await expect(deleteButton).toBeVisible();
  });

  test('keyboard interactions work on desktop', async ({ page }) => {
    const todoPage = new TodoPage(page);

    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Add a todo
    const todoText = generateUniqueTodoText('Keyboard test');
    await todoPage.addTodo(todoText);

    // Use keyboard shortcut to focus search
    await todoPage.focusSearchWithKeyboard();

    // Search input should be focused
    const searchInput = page.locator('input[aria-label="Search todos"]');
    await expect(searchInput).toBeFocused();

    // Use keyboard to edit todo
    await todoPage.startEditTodo(0);
    const editInput = page.locator('input[aria-label="Edit todo text"]');

    // Type new text
    await editInput.fill('Updated with keyboard');

    // Press Enter to save
    await page.keyboard.press('Enter');

    // Wait for save
    await page.waitForTimeout(500);

    // Verify update
    const updatedText = await todoPage.getTodoText(0);
    expect(updatedText).toContain('Updated with keyboard');
  });

  test('no horizontal scrolling on any viewport', async ({ page }) => {
    const todoPage = new TodoPage(page);

    // Add a todo with long text
    const longText = 'A very long todo item that should wrap properly and not cause horizontal scrolling on any device size';
    await todoPage.addTodo(longText);

    // Test different viewports
    const viewports = [
      { width: 375, height: 667, name: 'Mobile' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 1920, height: 1080, name: 'Desktop' },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(300);

      // Check no horizontal scroll
      await assertNoHorizontalScroll(page);
    }
  });

  test('FAB is accessible on all viewports', async ({ page }) => {
    const todoPage = new TodoPage(page);

    const viewports = [
      { width: 375, height: 667, name: 'Mobile' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 1920, height: 1080, name: 'Desktop' },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(300);

      // FAB should be visible and clickable
      const fab = page.locator('button[aria-label="Add new todo"]');
      await expect(fab).toBeVisible();

      // Click FAB to verify it works
      await todoPage.clickAddButton();
      await todoPage.waitForAddTodoForm();

      // Close the form
      await todoPage.cancelAddTodo();
      await page.waitForTimeout(300);
    }
  });

  test('search bar adapts to viewport', async ({ page }) => {
    const todoPage = new TodoPage(page);

    // Add todos to show search
    await todoPage.addTodo(generateUniqueTodoText('Task 1'));
    await todoPage.addTodo(generateUniqueTodoText('Task 2'));

    const viewports = [
      { width: 375, height: 667, name: 'Mobile' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 1920, height: 1080, name: 'Desktop' },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(300);

      // Search bar should be visible
      const searchInput = page.locator('input[aria-label="Search todos"]');
      await expect(searchInput).toBeVisible();

      // Should be able to type in search
      await searchInput.fill('Task');
      await page.waitForTimeout(600);

      // Results should be filtered
      await assertTodoCount(page, 2);

      // Clear search for next iteration
      await todoPage.clearSearch();
    }
  });

  test('todo items adapt to viewport', async ({ page }) => {
    const todoPage = new TodoPage(page);

    // Add a todo
    const todoText = generateUniqueTodoText('Adaptive todo');
    await todoPage.addTodo(todoText);

    const viewports = [
      { width: 375, height: 667, name: 'Mobile' },
      { width: 1920, height: 1080, name: 'Desktop' },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(300);

      // Todo should be visible
      await assertTodoCount(page, 1);

      // Todo text should be readable
      const text = await todoPage.getTodoText(0);
      expect(text).toContain('Adaptive todo');
    }
  });

  test('modal/expanded form adapts to viewport', async ({ page }) => {
    const todoPage = new TodoPage(page);

    const viewports = [
      { width: 375, height: 667, name: 'Mobile' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 1920, height: 1080, name: 'Desktop' },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(300);

      // Open FAB
      await todoPage.clickAddButton();
      await todoPage.waitForAddTodoForm();

      // Form should be visible
      const textarea = page.locator('textarea');
      await expect(textarea).toBeVisible();

      // On mobile, backdrop should be visible
      if (viewport.width < 768) {
        const backdrop = page.locator('.fixed.inset-0.bg-black\\/50');
        await expect(backdrop).toBeVisible();
      }

      // Close form
      await todoPage.cancelAddTodo();
      await page.waitForTimeout(300);
    }
  });

  test('text truncation and wrapping works correctly', async ({ page }) => {
    const todoPage = new TodoPage(page);

    // Add todo with very long text
    const veryLongText = 'This is a very long todo item that should wrap properly on mobile devices and not overflow the container boundaries causing layout issues';
    await todoPage.addTodo(veryLongText);

    // Test on mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(300);

    // Todo should be visible and contained
    const todoItem = todoPage.getTodoItems().nth(0);
    await expect(todoItem).toBeVisible();

    // Check no horizontal scroll
    await assertNoHorizontalScroll(page);
  });

  test('header collapses appropriately on small viewports', async ({ page }) => {
    const todoPage = new TodoPage(page);

    // Add todos to show stats
    await todoPage.addTodo(generateUniqueTodoText('Task 1'));
    await todoPage.addTodo(generateUniqueTodoText('Task 2'));

    // Mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(300);

    // Header elements should be visible
    const header = page.locator('h1:has-text("OpenList")');
    await expect(header).toBeVisible();

    const logoutButton = page.locator('button:has-text("Logout")');
    await expect(logoutButton).toBeVisible();

    // Stats should be visible
    const stats = page.locator('p.text-sm.text-gray-500').first();
    await expect(stats).toBeVisible();
  });
});
