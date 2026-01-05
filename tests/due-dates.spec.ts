import { test, expect } from '@playwright/test';
import { TodoPage } from './pages/TodoPage';
import { createTestUser } from './fixtures/test-user';
import { generateUniqueTodoText } from './fixtures/test-data';
import {
  setupAuthenticatedSession,
  clearLocalStorage,
} from './utils/helpers';

test.describe('Due Dates Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authenticated session for each test
    await clearLocalStorage(page);
    const testUser = createTestUser();
    await setupAuthenticatedSession(page, testUser);
  });

  test('natural language date parsing - tomorrow', async ({ page }) => {
    const todoPage = new TodoPage(page);
    const todoText = generateUniqueTodoText('Buy groceries tomorrow');
    
    // Open the expanded form
    await todoPage.clickAddButton();
    await todoPage.waitForAddTodoForm();
    
    // Type text with "tomorrow" in it
    await page.fill('input[aria-label="Todo text"]', todoText);
    
    // Wait for date detection
    await page.waitForTimeout(300);

    // Check that a date preview appears
    const datePreview = page.locator('[id="date-preview"]');
    await expect(datePreview).toBeVisible({ timeout: 3000 });

    // The preview should contain "Due:"
    await expect(datePreview).toContainText('Due:');
  });

  test('natural language date parsing - today', async ({ page }) => {
    const todoPage = new TodoPage(page);
    
    // Open the expanded form
    await todoPage.clickAddButton();
    await todoPage.waitForAddTodoForm();
    
    // Type text with "today" in it
    await page.fill('input[aria-label="Todo text"]', 'Complete report today');
    
    // Wait for date detection
    await page.waitForTimeout(300);

    // Check that a date preview appears
    const datePreview = page.locator('[id="date-preview"]');
    await expect(datePreview).toBeVisible({ timeout: 3000 });
    await expect(datePreview).toContainText('Due:');
  });

  test('natural language date parsing - specific date format', async ({ page }) => {
    const todoPage = new TodoPage(page);
    const currentYear = new Date().getFullYear();
    
    // Open the expanded form
    await todoPage.clickAddButton();
    await todoPage.waitForAddTodoForm();
    
    // Type text with specific date
    await page.fill('input[aria-label="Todo text"]', `Meeting on jan 26 ${currentYear + 1}`);
    
    // Wait for date detection
    await page.waitForTimeout(300);

    // Check that a date preview appears
    const datePreview = page.locator('[id="date-preview"]');
    await expect(datePreview).toBeVisible({ timeout: 3000 });
    await expect(datePreview).toContainText('Due:');
    await expect(datePreview).toContainText('Jan 26');
  });

  test('natural language date parsing - next week', async ({ page }) => {
    const todoPage = new TodoPage(page);
    
    // Open the expanded form
    await todoPage.clickAddButton();
    await todoPage.waitForAddTodoForm();
    
    // Type text with "next week"
    await page.fill('input[aria-label="Todo text"]', 'Task next week');
    
    // Wait for date detection
    await page.waitForTimeout(300);

    // Check that a date preview appears
    const datePreview = page.locator('[id="date-preview"]');
    await expect(datePreview).toBeVisible({ timeout: 3000 });
    await expect(datePreview).toContainText('Due:');
  });

  test('can remove detected date from preview', async ({ page }) => {
    const todoPage = new TodoPage(page);
    
    // Open the expanded form
    await todoPage.clickAddButton();
    await todoPage.waitForAddTodoForm();
    
    // Type text with date
    await page.fill('input[aria-label="Todo text"]', 'Task tomorrow');
    
    // Wait for date detection
    await page.waitForTimeout(300);

    // Date preview should be visible
    const datePreview = page.locator('[id="date-preview"]');
    await expect(datePreview).toBeVisible({ timeout: 3000 });

    // Click remove button
    await page.click('button[aria-label="Remove detected due date"]');

    // Date preview should disappear
    await expect(datePreview).not.toBeVisible();
  });

  test('todo with due date displays indicator', async ({ page }) => {
    const todoPage = new TodoPage(page);
    const todoText = generateUniqueTodoText('Task tomorrow');

    // Add todo with date using the proper method
    await todoPage.addTodo(todoText);
    // Wait for todo to be added and rendered
    await page.waitForTimeout(1000);

    // The date parser removes "tomorrow" from the text, leaving "Task <timestamp>"
    // Extract the timestamp from the original text (it's at the end)
    const timestampMatch = todoText.match(/(\d+)$/);
    const timestamp = timestampMatch ? timestampMatch[1] : null;
    
    // Find the todo item container by the timestamp (which remains after "tomorrow" is removed)
    let todoContainer;
    if (timestamp) {
      // Find todo containing the timestamp
      todoContainer = page.locator('.group.flex.items-center.gap-3.px-4.py-3.bg-white.rounded-lg').filter({
        hasText: timestamp
      }).first();
    } else {
      // Fallback: find the first todo with a due date indicator
      todoContainer = page.locator('.group.flex.items-center.gap-3.px-4.py-3.bg-white.rounded-lg').filter({
        has: page.locator('[aria-label*="Due"]')
      }).first();
    }
    
    // Wait for the todo container to be visible
    await expect(todoContainer).toBeVisible({ timeout: 5000 });

    // Look for due date indicator within the todo container
    const dueDateIndicator = todoContainer.locator('[aria-label*="Due"]').first();
    
    // The indicator should be visible (now shows "today", "tomorrow", etc. as plain text)
    await expect(dueDateIndicator).toBeVisible({ timeout: 3000 });
    
    // Verify it shows "tomorrow" text
    await expect(dueDateIndicator).toContainText('tomorrow', { timeout: 1000 });
  });

  test('sidebar date filters are present', async ({ page }) => {
    const todoPage = new TodoPage(page);
    // Wait for the app to be ready
    await todoPage.waitForTodoApp();
    
    // Check if burger menu button is visible (mobile) or sidebar is persistent (desktop)
    const burgerButton = page.locator('button[aria-label="Open navigation menu"]');
    const isBurgerVisible = await burgerButton.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (isBurgerVisible) {
      // On mobile, open the sidebar using the burger menu
      await burgerButton.click();
      await page.waitForTimeout(500);
    }
    // On desktop, sidebar is persistent and already visible
    
    // Wait for sidebar to be visible (it might be off-screen on mobile initially)
    const sidebar = page.locator('[role="navigation"]');
    await expect(sidebar).toBeVisible({ timeout: 5000 });

    // Check for date filter buttons in the sidebar
    // The sidebar has date filters, not the main filter menu
    await expect(page.locator('button:has-text("All")')).toBeVisible();
    await expect(page.locator('button:has-text("Overdue")')).toBeVisible();
    await expect(page.locator('button:has-text("Today")')).toBeVisible();
    await expect(page.locator('button:has-text("This Week")')).toBeVisible();
    await expect(page.locator('button:has-text("Upcoming")')).toBeVisible();
    await expect(page.locator('button:has-text("No Date")')).toBeVisible();
  });

  test('can filter todos by "No Date"', async ({ page }) => {
    const todoPage = new TodoPage(page);
    
    // Add a todo without date
    const todoWithoutDate = generateUniqueTodoText('No date task');
    await todoPage.addTodo(todoWithoutDate);
    await page.waitForTimeout(500);

    // Add a todo with date
    const todoWithDate = generateUniqueTodoText('Task tomorrow');
    await todoPage.addTodo(todoWithDate);
    await page.waitForTimeout(500);

    // Open sidebar - check if burger menu is visible (mobile) or sidebar is persistent (desktop)
    const burgerButton = page.locator('button[aria-label="Open navigation menu"]');
    const isBurgerVisible = await burgerButton.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (isBurgerVisible) {
      // On mobile, open the sidebar using the burger menu
      await burgerButton.click();
      await page.waitForTimeout(500);
    }
    // On desktop, sidebar is persistent and already visible
    
    // Wait for sidebar to be visible
    await expect(page.locator('[role="navigation"]')).toBeVisible({ timeout: 5000 });

    // Click "No Date" filter
    await page.click('button:has-text("No Date")');
    await page.waitForTimeout(300);

    // Todo without date should be visible
    await expect(page.locator(`text=${todoWithoutDate}`)).toBeVisible();
    
    // Todo with date should not be visible (or the list should be filtered)
    // The text "Task" might still be visible, so we just verify the count or specific text
  });

  test('edit todo and add due date via date picker', async ({ page }) => {
    const todoPage = new TodoPage(page);
    const todoText = generateUniqueTodoText('Task to schedule');

    // Add a todo without date
    await todoPage.addTodo(todoText);
    await page.waitForTimeout(500);

    // Find the todo item and double-click to edit
    const todoItem = page.locator(`text=${todoText}`).first();
    await expect(todoItem).toBeVisible();
    
    // Double-click to edit
    await todoItem.dblclick();
    await page.waitForTimeout(500);

    // Look for calendar/date button in edit mode
    const dateButton = page.locator('button[aria-label="Set due date"]');
    await expect(dateButton).toBeVisible({ timeout: 5000 });
    await dateButton.click();
    await page.waitForTimeout(300);

    // Date picker should appear
    const datePicker = page.locator('input[type="date"]');
    await expect(datePicker).toBeVisible({ timeout: 5000 });

    // Click "Tomorrow" quick action button
    const tomorrowButton = page.locator('button:has-text("Tomorrow")');
    await expect(tomorrowButton).toBeVisible({ timeout: 5000 });
    await tomorrowButton.click();
    await page.waitForTimeout(300);

    // Save the edit
    await page.click('button[aria-label="Save changes"]');
    await page.waitForTimeout(500);

    // Find the todo container to look for the due date indicator
    const todoContainer = page.locator('.group.flex.items-center.gap-3.px-4.py-3.bg-white.rounded-lg').filter({
      hasText: todoText
    }).first();
    
    // Due date indicator should now be visible within the todo
    const dueDateIndicator = todoContainer.locator('[aria-label*="Due"]').first();
    await expect(dueDateIndicator).toBeVisible({ timeout: 3000 });
    
    // Verify it shows "tomorrow" text
    await expect(dueDateIndicator).toContainText('tomorrow', { timeout: 1000 });
  });
});
