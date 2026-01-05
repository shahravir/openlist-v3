import { test, expect } from '@playwright/test';
import { TodoPage } from './pages/TodoPage';
import { createTestUser } from './fixtures/test-user';
import { generateUniqueTodoText } from './fixtures/test-data';
import {
  setupAuthenticatedSession,
  clearLocalStorage,
} from './utils/helpers';

test.describe('Priorities Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authenticated session for each test
    await clearLocalStorage(page);
    const testUser = createTestUser();
    await setupAuthenticatedSession(page, testUser);
  });

  test('can set priority when creating a todo', async ({ page }) => {
    const todoPage = new TodoPage(page);
    const todoText = generateUniqueTodoText('High priority task');
    
    // Open the expanded form
    await todoPage.clickAddButton();
    await todoPage.waitForAddTodoForm();
    
    // Type text
    await page.fill('input[aria-label="Todo text"]', todoText);
    
    // Click priority button to open selector
    await page.click('button[aria-label="Set priority"]');
    
    // Wait for priority selector
    await page.waitForTimeout(300);
    
    // Select high priority
    const highPriorityButton = page.locator('button[aria-label*="high"]').first();
    await highPriorityButton.click();
    
    // Submit
    await page.click('button[type="submit"]:has-text("Add Task")');
    
    // Wait for todo to appear
    await page.waitForTimeout(500);
    
    // Check that todo exists with high priority indicator
    const todoItem = page.locator('div[role="listitem"]').filter({ hasText: todoText });
    await expect(todoItem).toBeVisible();
    
    // Check for priority indicator
    const priorityIndicator = todoItem.locator('span[aria-label*="Priority"]');
    await expect(priorityIndicator).toBeVisible();
    await expect(priorityIndicator).toContainText('High');
  });

  test('can edit priority of existing todo', async ({ page }) => {
    const todoPage = new TodoPage(page);
    const todoText = generateUniqueTodoText('Task to reprioritize');
    
    // Add a todo without priority first
    await todoPage.clickAddButton();
    await todoPage.waitForAddTodoForm();
    await page.fill('input[aria-label="Todo text"]', todoText);
    await page.click('button[type="submit"]:has-text("Add Task")');
    await page.waitForTimeout(500);
    
    // Find the todo and click edit
    const todoItem = page.locator('div[role="listitem"]').filter({ hasText: todoText });
    await todoItem.locator('button[aria-label="Edit todo"]').click();
    
    // Wait for edit mode
    await page.waitForTimeout(300);
    
    // Click priority button in edit mode
    await page.click('button[aria-label="Set priority"]');
    await page.waitForTimeout(300);
    
    // Select medium priority
    const mediumPriorityButton = page.locator('button[aria-label*="medium"]').first();
    await mediumPriorityButton.click();
    
    // Save changes
    await page.click('button[aria-label="Save changes"]');
    await page.waitForTimeout(500);
    
    // Check that priority is now displayed
    const updatedTodoItem = page.locator('div[role="listitem"]').filter({ hasText: todoText });
    const priorityIndicator = updatedTodoItem.locator('span[aria-label*="Priority"]');
    await expect(priorityIndicator).toBeVisible();
    await expect(priorityIndicator).toContainText('Medium');
  });

  test('can filter todos by priority', async ({ page }) => {
    const todoPage = new TodoPage(page);
    
    // Create todos with different priorities
    const highPriorityTodo = generateUniqueTodoText('High priority task');
    const lowPriorityTodo = generateUniqueTodoText('Low priority task');
    const noPriorityTodo = generateUniqueTodoText('No priority task');
    
    // Add high priority todo
    await todoPage.clickAddButton();
    await todoPage.waitForAddTodoForm();
    await page.fill('input[aria-label="Todo text"]', highPriorityTodo);
    await page.click('button[aria-label="Set priority"]');
    await page.waitForTimeout(300);
    await page.locator('button[aria-label*="high"]').first().click();
    await page.click('button[type="submit"]:has-text("Add Task")');
    await page.waitForTimeout(500);
    
    // Add low priority todo
    await todoPage.clickAddButton();
    await todoPage.waitForAddTodoForm();
    await page.fill('input[aria-label="Todo text"]', lowPriorityTodo);
    await page.click('button[aria-label="Set priority"]');
    await page.waitForTimeout(300);
    await page.locator('button[aria-label*="low"]').first().click();
    await page.click('button[type="submit"]:has-text("Add Task")');
    await page.waitForTimeout(500);
    
    // Add no priority todo
    await todoPage.clickAddButton();
    await todoPage.waitForAddTodoForm();
    await page.fill('input[aria-label="Todo text"]', noPriorityTodo);
    await page.click('button[type="submit"]:has-text("Add Task")');
    await page.waitForTimeout(500);
    
    // Open sidebar
    await page.click('button[aria-label*="navigation menu"]');
    await page.waitForTimeout(500);
    
    // Filter by high priority
    await page.click('button[aria-label="Show high priority todos"]');
    await page.waitForTimeout(500);
    
    // Check that only high priority todo is visible
    await expect(page.locator('div[role="listitem"]').filter({ hasText: highPriorityTodo })).toBeVisible();
    await expect(page.locator('div[role="listitem"]').filter({ hasText: lowPriorityTodo })).not.toBeVisible();
    await expect(page.locator('div[role="listitem"]').filter({ hasText: noPriorityTodo })).not.toBeVisible();
    
    // Filter by low priority
    await page.click('button[aria-label="Show low priority todos"]');
    await page.waitForTimeout(500);
    
    // Check that only low priority todo is visible
    await expect(page.locator('div[role="listitem"]').filter({ hasText: highPriorityTodo })).not.toBeVisible();
    await expect(page.locator('div[role="listitem"]').filter({ hasText: lowPriorityTodo })).toBeVisible();
    await expect(page.locator('div[role="listitem"]').filter({ hasText: noPriorityTodo })).not.toBeVisible();
    
    // Filter to show all
    await page.click('button[aria-label="Show all priorities"]');
    await page.waitForTimeout(500);
    
    // Check that all todos are visible
    await expect(page.locator('div[role="listitem"]').filter({ hasText: highPriorityTodo })).toBeVisible();
    await expect(page.locator('div[role="listitem"]').filter({ hasText: lowPriorityTodo })).toBeVisible();
    await expect(page.locator('div[role="listitem"]').filter({ hasText: noPriorityTodo })).toBeVisible();
  });

  test('todos are sorted by priority (high to low)', async ({ page }) => {
    const todoPage = new TodoPage(page);
    
    // Create todos with different priorities in random order
    const lowPriorityTodo = generateUniqueTodoText('Low priority');
    const highPriorityTodo = generateUniqueTodoText('High priority');
    const mediumPriorityTodo = generateUniqueTodoText('Medium priority');
    
    // Add low priority first
    await todoPage.clickAddButton();
    await todoPage.waitForAddTodoForm();
    await page.fill('input[aria-label="Todo text"]', lowPriorityTodo);
    await page.click('button[aria-label="Set priority"]');
    await page.waitForTimeout(300);
    await page.locator('button[aria-label*="low"]').first().click();
    await page.click('button[type="submit"]:has-text("Add Task")');
    await page.waitForTimeout(500);
    
    // Add high priority
    await todoPage.clickAddButton();
    await todoPage.waitForAddTodoForm();
    await page.fill('input[aria-label="Todo text"]', highPriorityTodo);
    await page.click('button[aria-label="Set priority"]');
    await page.waitForTimeout(300);
    await page.locator('button[aria-label*="high"]').first().click();
    await page.click('button[type="submit"]:has-text("Add Task")');
    await page.waitForTimeout(500);
    
    // Add medium priority
    await todoPage.clickAddButton();
    await todoPage.waitForAddTodoForm();
    await page.fill('input[aria-label="Todo text"]', mediumPriorityTodo);
    await page.click('button[aria-label="Set priority"]');
    await page.waitForTimeout(300);
    await page.locator('button[aria-label*="medium"]').first().click();
    await page.click('button[type="submit"]:has-text("Add Task")');
    await page.waitForTimeout(1000);
    
    // Get all todo items
    const todoItems = page.locator('div[role="listitem"]');
    const count = await todoItems.count();
    
    // Find positions
    let highPos = -1;
    let mediumPos = -1;
    let lowPos = -1;
    
    for (let i = 0; i < count; i++) {
      const item = todoItems.nth(i);
      const text = await item.innerText();
      
      if (text.includes(highPriorityTodo)) {
        highPos = i;
      } else if (text.includes(mediumPriorityTodo)) {
        mediumPos = i;
      } else if (text.includes(lowPriorityTodo)) {
        lowPos = i;
      }
    }
    
    // Check that high priority comes before medium, which comes before low
    expect(highPos).toBeLessThan(mediumPos);
    expect(mediumPos).toBeLessThan(lowPos);
  });

  test('priority selector is accessible via keyboard', async ({ page }) => {
    const todoPage = new TodoPage(page);
    
    // Open the expanded form
    await todoPage.clickAddButton();
    await todoPage.waitForAddTodoForm();
    
    // Type text
    await page.fill('input[aria-label="Todo text"]', 'Accessibility test');
    
    // Tab to priority button
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab'); // Skip date button
    await page.keyboard.press('Tab'); // Should be on priority button
    
    // Press Enter to open priority selector
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    
    // Use Tab to navigate and Enter to select
    await page.keyboard.press('Tab'); // Move to first priority option
    await page.keyboard.press('Enter'); // Select it
    
    // Check that priority was selected
    const priorityButton = page.locator('button[aria-label="Set priority"]');
    const buttonText = await priorityButton.innerText();
    expect(buttonText).not.toContain('Priority: None');
  });

  test('priority indicator has proper color coding', async ({ page }) => {
    const todoPage = new TodoPage(page);
    const highPriorityTodo = generateUniqueTodoText('High priority test');
    
    // Add high priority todo
    await todoPage.clickAddButton();
    await todoPage.waitForAddTodoForm();
    await page.fill('input[aria-label="Todo text"]', highPriorityTodo);
    await page.click('button[aria-label="Set priority"]');
    await page.waitForTimeout(300);
    await page.locator('button[aria-label*="high"]').first().click();
    await page.click('button[type="submit"]:has-text("Add Task")');
    await page.waitForTimeout(500);
    
    // Check that the priority indicator has the red color class for high priority
    const todoItem = page.locator('div[role="listitem"]').filter({ hasText: highPriorityTodo });
    const priorityIndicator = todoItem.locator('span[aria-label*="Priority"]');
    
    // Check for red color class (high priority)
    const classes = await priorityIndicator.getAttribute('class');
    expect(classes).toContain('red');
  });

  test('priority persists after page reload', async ({ page }) => {
    const todoPage = new TodoPage(page);
    const todoText = generateUniqueTodoText('Persistent priority');
    
    // Add todo with medium priority
    await todoPage.clickAddButton();
    await todoPage.waitForAddTodoForm();
    await page.fill('input[aria-label="Todo text"]', todoText);
    await page.click('button[aria-label="Set priority"]');
    await page.waitForTimeout(300);
    await page.locator('button[aria-label*="medium"]').first().click();
    await page.click('button[type="submit"]:has-text("Add Task")');
    await page.waitForTimeout(1000);
    
    // Reload page
    await page.reload();
    await page.waitForTimeout(1000);
    
    // Check that todo still has medium priority
    const todoItem = page.locator('div[role="listitem"]').filter({ hasText: todoText });
    const priorityIndicator = todoItem.locator('span[aria-label*="Priority"]');
    await expect(priorityIndicator).toBeVisible();
    await expect(priorityIndicator).toContainText('Medium');
  });
});
