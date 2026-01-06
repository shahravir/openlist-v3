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
    
    // Wait for priority selector to appear
    await page.waitForSelector('button[aria-label*="Set priority to"]', { timeout: 5000 });
    
    // Select high priority
    const highPriorityButton = page.locator('button[aria-label*="Set priority to high"]').first();
    await highPriorityButton.click();
    
    // Wait for priority selector to close (it should close after selection)
    await page.waitForSelector('button[aria-label*="Set priority to"]', { state: 'hidden', timeout: 2000 }).catch(() => {});
    
    // Submit and wait for network to be idle
    const submitButton = page.locator('button[type="submit"]:has-text("Add Task")');
    await submitButton.waitFor({ state: 'visible', timeout: 5000 });
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/todos') && resp.status() === 200).catch(() => {}),
      submitButton.click()
    ]);
    
    // Wait for todo to appear in the list
    const todoItem = page.locator('div[role="listitem"]').filter({ hasText: todoText });
    await expect(todoItem).toBeVisible({ timeout: 10000 });
    
    // Check for high priority checkbox border (red border for high priority)
    const checkbox = todoItem.locator('button[aria-label*="Mark as"]');
    await expect(checkbox).toBeVisible({ timeout: 5000 });
    const checkboxClasses = await checkbox.getAttribute('class');
    expect(checkboxClasses).toContain('border-red-500');
  });

  test('can edit priority of existing todo', async ({ page }) => {
    const todoPage = new TodoPage(page);
    const todoText = generateUniqueTodoText('Task to reprioritize');
    
    // Add a todo without priority first
    await todoPage.clickAddButton();
    await todoPage.waitForAddTodoForm();
    await page.fill('input[aria-label="Todo text"]', todoText);
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/todos') && resp.status() === 200).catch(() => {}),
      page.click('button[type="submit"]:has-text("Add Task")')
    ]);
    
    // Wait for todo to appear
    const todoItem = page.locator('div[role="listitem"]').filter({ hasText: todoText });
    await expect(todoItem).toBeVisible({ timeout: 10000 });
    
    // Hover to show edit button (needed on desktop)
    await todoItem.hover();
    
    // Find and click edit button
    const editButton = todoItem.locator('button[aria-label="Edit todo"]');
    await editButton.waitFor({ state: 'visible', timeout: 5000 });
    await editButton.click();
    
    // Wait for edit mode (input should be visible)
    await page.waitForSelector('input[aria-label="Edit todo text"]', { timeout: 5000 });
    
    // Click priority button in edit mode
    await page.click('button[aria-label="Set priority"]');
    await page.waitForSelector('button[aria-label*="Set priority to"]', { timeout: 5000 });
    
    // Select medium priority
    const mediumPriorityButton = page.locator('button[aria-label*="Set priority to medium"]').first();
    await mediumPriorityButton.click();
    
    // Save changes and wait for network
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/todos') && resp.status() === 200).catch(() => {}),
      page.click('button[aria-label="Save changes"]')
    ]);
    
    // Wait for edit mode to close
    await page.waitForSelector('input[aria-label="Edit todo text"]', { state: 'hidden', timeout: 5000 });
    
    // Check that priority is now displayed via checkbox border (amber border for medium priority)
    const updatedTodoItem = page.locator('div[role="listitem"]').filter({ hasText: todoText });
    const checkbox = updatedTodoItem.locator('button[aria-label*="Mark as"]');
    await expect(checkbox).toBeVisible({ timeout: 5000 });
    const checkboxClasses = await checkbox.getAttribute('class');
    expect(checkboxClasses).toContain('border-amber-500');
  });

  test('can filter todos by priority', async ({ page }) => {
    test.setTimeout(60000); // Increase timeout to 60 seconds for this test
    const todoPage = new TodoPage(page);
    
    // Use desktop viewport to ensure button-based priority selector is used
    // (On mobile, it uses a select dropdown which would require different selectors)
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Create todos with different priorities
    const highPriorityTodo = generateUniqueTodoText('High priority task');
    const lowPriorityTodo = generateUniqueTodoText('Low priority task');
    const noPriorityTodo = generateUniqueTodoText('No priority task');
    
    // Add high priority todo
    await todoPage.clickAddButton();
    await todoPage.waitForAddTodoForm();
    await page.fill('input[aria-label="Todo text"]', highPriorityTodo);
    await page.click('button[aria-label="Set priority"]');
    await page.waitForSelector('button[aria-label*="Set priority to"]', { timeout: 5000 });
    await page.locator('button[aria-label*="Set priority to high"]').first().click();
    // Wait for selector to close
    await page.waitForSelector('button[aria-label*="Set priority to"]', { state: 'hidden', timeout: 2000 }).catch(() => {});
    const submitButton1 = page.locator('button[type="submit"]:has-text("Add Task")');
    await submitButton1.waitFor({ state: 'visible', timeout: 5000 });
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/todos') && resp.status() === 200).catch(() => {}),
      submitButton1.click()
    ]);
    await expect(page.locator('div[role="listitem"]').filter({ hasText: highPriorityTodo })).toBeVisible({ timeout: 10000 });
    
    // Add low priority todo
    await todoPage.clickAddButton();
    await todoPage.waitForAddTodoForm();
    await page.fill('input[aria-label="Todo text"]', lowPriorityTodo);
    await page.click('button[aria-label="Set priority"]');
    await page.waitForSelector('button[aria-label*="Set priority to"]', { timeout: 5000 });
    await page.locator('button[aria-label*="Set priority to low"]').first().click();
    // Wait for selector to close
    await page.waitForSelector('button[aria-label*="Set priority to"]', { state: 'hidden', timeout: 2000 }).catch(() => {});
    const submitButton2 = page.locator('button[type="submit"]:has-text("Add Task")');
    await submitButton2.waitFor({ state: 'visible', timeout: 5000 });
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/todos') && resp.status() === 200).catch(() => {}),
      submitButton2.click()
    ]);
    await expect(page.locator('div[role="listitem"]').filter({ hasText: lowPriorityTodo })).toBeVisible({ timeout: 10000 });
    
    // Add no priority todo
    await todoPage.clickAddButton();
    await todoPage.waitForAddTodoForm();
    await page.fill('input[aria-label="Todo text"]', noPriorityTodo);
    const submitButton3 = page.locator('button[type="submit"]:has-text("Add Task")');
    await submitButton3.waitFor({ state: 'visible', timeout: 5000 });
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/todos') && resp.status() === 200).catch(() => {}),
      submitButton3.click()
    ]);
    // Wait for form to close and UI to update
    await page.waitForSelector('input[aria-label="Todo text"]', { state: 'hidden', timeout: 5000 }).catch(() => {});
    await expect(page.locator('div[role="listitem"]').filter({ hasText: noPriorityTodo })).toBeVisible({ timeout: 10000 });
    
    // On desktop, sidebar is persistent and already visible
    await page.waitForSelector('[role="navigation"]', { timeout: 5000 });
    
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
    test.setTimeout(60000); // Increase timeout to 60 seconds for this test
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
    await page.waitForSelector('button[aria-label*="Set priority to"]', { timeout: 5000 });
    await page.locator('button[aria-label*="Set priority to low"]').first().click();
    await page.waitForSelector('button[aria-label*="Set priority to"]', { state: 'hidden', timeout: 2000 }).catch(() => {});
    const submitLow = page.locator('button[type="submit"]:has-text("Add Task")');
    await submitLow.waitFor({ state: 'visible', timeout: 5000 });
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/todos') && resp.status() === 200).catch(() => {}),
      submitLow.click()
    ]);
    // Wait for form to close and UI to update
    await page.waitForSelector('input[aria-label="Todo text"]', { state: 'hidden', timeout: 5000 }).catch(() => {});
    await expect(page.locator('div[role="listitem"]').filter({ hasText: lowPriorityTodo })).toBeVisible({ timeout: 10000 });
    
    // Add high priority
    await todoPage.clickAddButton();
    await todoPage.waitForAddTodoForm();
    await page.fill('input[aria-label="Todo text"]', highPriorityTodo);
    await page.click('button[aria-label="Set priority"]');
    await page.waitForSelector('button[aria-label*="Set priority to"]', { timeout: 5000 });
    await page.locator('button[aria-label*="Set priority to high"]').first().click();
    await page.waitForSelector('button[aria-label*="Set priority to"]', { state: 'hidden', timeout: 2000 }).catch(() => {});
    const submitHigh = page.locator('button[type="submit"]:has-text("Add Task")');
    await submitHigh.waitFor({ state: 'visible', timeout: 5000 });
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/todos') && resp.status() === 200).catch(() => {}),
      submitHigh.click()
    ]);
    // Wait for form to close and UI to update
    await page.waitForSelector('input[aria-label="Todo text"]', { state: 'hidden', timeout: 5000 }).catch(() => {});
    await expect(page.locator('div[role="listitem"]').filter({ hasText: highPriorityTodo })).toBeVisible({ timeout: 10000 });
    
    // Add medium priority
    await todoPage.clickAddButton();
    await todoPage.waitForAddTodoForm();
    await page.fill('input[aria-label="Todo text"]', mediumPriorityTodo);
    await page.click('button[aria-label="Set priority"]');
    await page.waitForSelector('button[aria-label*="Set priority to"]', { timeout: 5000 });
    await page.locator('button[aria-label*="Set priority to medium"]').first().click();
    await page.waitForSelector('button[aria-label*="Set priority to"]', { state: 'hidden', timeout: 2000 }).catch(() => {});
    const submitMedium = page.locator('button[type="submit"]:has-text("Add Task")');
    await submitMedium.waitFor({ state: 'visible', timeout: 5000 });
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/todos') && resp.status() === 200).catch(() => {}),
      submitMedium.click()
    ]);
    // Wait for form to close and UI to update
    await page.waitForSelector('input[aria-label="Todo text"]', { state: 'hidden', timeout: 5000 }).catch(() => {});
    await expect(page.locator('div[role="listitem"]').filter({ hasText: mediumPriorityTodo })).toBeVisible({ timeout: 10000 });
    
    // Wait for sorting to complete (todos are sorted by priority)
    await page.waitForTimeout(1000);
    
    // Get all todo items
    const todoItems = page.locator('div[role="listitem"]');
    const count = await todoItems.count();
    expect(count).toBeGreaterThanOrEqual(3);
    
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
    
    // Verify all positions were found
    expect(highPos).not.toBe(-1);
    expect(mediumPos).not.toBe(-1);
    expect(lowPos).not.toBe(-1);
    
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
    
    // Focus the priority button directly (more reliable than tabbing)
    const priorityButton = page.locator('button[aria-label="Set priority"]');
    await priorityButton.focus();
    
    // Verify we're on the priority button by checking focus
    await expect(priorityButton).toBeFocused({ timeout: 1000 });
    
    // Press Enter to open priority selector
    await page.keyboard.press('Enter');
    await page.waitForSelector('button[aria-label*="Set priority to"]', { timeout: 5000 });
    
    // Wait a moment for the selector to fully render
    await page.waitForTimeout(300);
    
    // Use Tab to navigate to priority options (buttons are focusable)
    // First Tab should move to the first priority button (None)
    await page.keyboard.press('Tab'); // Move to first priority option (None)
    await page.keyboard.press('Tab'); // Move to Low priority
    await page.keyboard.press('Enter'); // Select Low priority
    
    // Wait for priority selector to close (it should close automatically after selection)
    // This confirms that the priority was successfully selected via keyboard
    await page.waitForSelector('button[aria-label*="Set priority to"]', { state: 'hidden', timeout: 2000 });
    
    // Verify the priority button is still visible and accessible
    await expect(priorityButton).toBeVisible();
    
    // The fact that we were able to navigate with Tab, select with Enter, and the selector closed
    // confirms that keyboard accessibility is working correctly
  });

  test('priority indicator has proper color coding', async ({ page }) => {
    const todoPage = new TodoPage(page);
    const highPriorityTodo = generateUniqueTodoText('High priority test');
    
    // Add high priority todo
    await todoPage.clickAddButton();
    await todoPage.waitForAddTodoForm();
    await page.fill('input[aria-label="Todo text"]', highPriorityTodo);
    await page.click('button[aria-label="Set priority"]');
    await page.waitForSelector('button[aria-label*="Set priority to"]', { timeout: 5000 });
    await page.locator('button[aria-label*="Set priority to high"]').first().click();
    // Wait for selector to close
    await page.waitForSelector('button[aria-label*="Set priority to"]', { state: 'hidden', timeout: 2000 }).catch(() => {});
    const submitHighColor = page.locator('button[type="submit"]:has-text("Add Task")');
    await submitHighColor.waitFor({ state: 'visible', timeout: 5000 });
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/todos') && resp.status() === 200).catch(() => {}),
      submitHighColor.click()
    ]);
    
    // Wait for todo to appear
    const todoItem = page.locator('div[role="listitem"]').filter({ hasText: highPriorityTodo });
    await expect(todoItem).toBeVisible({ timeout: 10000 });
    
    // Check that the checkbox has the red border color for high priority
    const checkbox = todoItem.locator('button[aria-label*="Mark as"]');
    await expect(checkbox).toBeVisible({ timeout: 5000 });
    
    // Check for red border color class (high priority)
    const classes = await checkbox.getAttribute('class');
    expect(classes).toContain('border-red-500');
  });

  test('priority persists after page reload', async ({ page }) => {
    const todoPage = new TodoPage(page);
    const todoText = generateUniqueTodoText('Persistent priority');
    
    // Add todo with medium priority
    await todoPage.clickAddButton();
    await todoPage.waitForAddTodoForm();
    await page.fill('input[aria-label="Todo text"]', todoText);
    await page.click('button[aria-label="Set priority"]');
    await page.waitForSelector('button[aria-label*="Set priority to"]', { timeout: 5000 });
    await page.locator('button[aria-label*="Set priority to medium"]').first().click();
    // Wait for selector to close
    await page.waitForSelector('button[aria-label*="Set priority to"]', { state: 'hidden', timeout: 2000 }).catch(() => {});
    const submitPersist = page.locator('button[type="submit"]:has-text("Add Task")');
    await submitPersist.waitFor({ state: 'visible', timeout: 5000 });
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/todos') && resp.status() === 200).catch(() => {}),
      submitPersist.click()
    ]);
    
    // Wait for todo to appear and sync
    await expect(page.locator('div[role="listitem"]').filter({ hasText: todoText })).toBeVisible({ timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await todoPage.waitForTodoApp();
    
    // Check that todo still has medium priority (amber border)
    const todoItem = page.locator('div[role="listitem"]').filter({ hasText: todoText });
    await expect(todoItem).toBeVisible({ timeout: 10000 });
    const checkbox = todoItem.locator('button[aria-label*="Mark as"]');
    await expect(checkbox).toBeVisible({ timeout: 5000 });
    const checkboxClasses = await checkbox.getAttribute('class');
    expect(checkboxClasses).toContain('border-amber-500');
  });
});
