import { test, expect } from '@playwright/test';
import { TodoPage } from './pages/TodoPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { createTestUser } from './fixtures/test-user';
import { generateUniqueTodoText } from './fixtures/test-data';
import {
  setupAuthenticatedSession,
  loginUser,
  clearLocalStorage,
} from './utils/helpers';
import {
  assertTodoExists,
  assertTodoCount,
  assertUserIsAuthenticated,
  assertUserIsNotAuthenticated,
} from './utils/assertions';

test.describe('Integration Tests - Complete User Flows', () => {
  test.beforeEach(async ({ page }) => {
    await clearLocalStorage(page);
  });

  test('complete flow: register → add todos → search → logout', async ({ page }) => {
    const testUser = createTestUser();
    const registerPage = new RegisterPage(page);
    const todoPage = new TodoPage(page);

    // Step 1: Register
    await registerPage.goto();
    await registerPage.register(testUser.email, testUser.password);
    await registerPage.waitForNavigation();
    await assertUserIsAuthenticated(page);

    // Step 2: Add multiple todos
    const todos = [
      generateUniqueTodoText('Buy groceries'),
      generateUniqueTodoText('Write report'),
      generateUniqueTodoText('Call dentist'),
      generateUniqueTodoText('Review code'),
    ];

    for (const todoText of todos) {
      await todoPage.addTodo(todoText);
    }

    await assertTodoCount(page, 4);

    // Step 3: Search for a specific todo
    await todoPage.fillSearch('groceries');
    await page.waitForTimeout(600);
    await assertTodoCount(page, 1);

    // Step 4: Clear search
    await todoPage.clearSearch();
    await page.waitForTimeout(300);
    await assertTodoCount(page, 4);

    // Step 5: Logout
    await todoPage.clickLogout();
    await assertUserIsNotAuthenticated(page);
  });

  test('complete flow: login → edit todos → sync → logout', async ({ page }) => {
    const testUser = createTestUser();
    const todoPage = new TodoPage(page);

    // Setup: Register and add initial todos
    await setupAuthenticatedSession(page, testUser);
    const initialTodo = generateUniqueTodoText('Initial task');
    await todoPage.addTodo(initialTodo);
    await page.waitForTimeout(1000);

    // Logout
    await todoPage.clickLogout();
    await assertUserIsNotAuthenticated(page);

    // Step 1: Login
    const loginPage = new LoginPage(page);
    await loginPage.login(testUser.email, testUser.password);
    await loginPage.waitForNavigation();
    await assertUserIsAuthenticated(page);

    // Step 2: Wait for sync
    await page.waitForTimeout(2000);

    // Initial todo should be present
    await assertTodoExists(page, initialTodo);

    // Step 3: Edit todo
    const updatedText = generateUniqueTodoText('Updated task');
    await todoPage.updateTodo(0, updatedText);
    await assertTodoExists(page, updatedText);

    // Step 4: Add more todos
    await todoPage.addTodo(generateUniqueTodoText('New task 1'));
    await todoPage.addTodo(generateUniqueTodoText('New task 2'));
    await assertTodoCount(page, 3);

    // Step 5: Complete some todos (use text-based lookup since they reorder)
    const initialTodoText = await todoPage.getTodoText(0);
    const newTask1Text = await todoPage.getTodoText(1);
    
    await todoPage.toggleTodoByText(initialTodoText || '');
    await todoPage.toggleTodoByText(newTask1Text || '');

    // Step 6: Wait for sync
    await page.waitForTimeout(2000);

    // Step 7: Logout
    await todoPage.clickLogout();
    await assertUserIsNotAuthenticated(page);
  });

  test('complete flow: add → complete → filter → delete', async ({ page }) => {
    const testUser = createTestUser();
    const todoPage = new TodoPage(page);

    // Setup
    await setupAuthenticatedSession(page, testUser);

    // Step 1: Add multiple todos
    const todo1 = generateUniqueTodoText('Task 1');
    const todo2 = generateUniqueTodoText('Task 2');
    const todo3 = generateUniqueTodoText('Task 3');

    await todoPage.addTodo(todo1);
    await todoPage.addTodo(todo2);
    await todoPage.addTodo(todo3);
    await assertTodoCount(page, 3);

    // Step 2: Complete some todos (use text-based lookup since they reorder)
    await todoPage.toggleTodoByText(todo1);
    await todoPage.toggleTodoByText(todo3);
    await page.waitForTimeout(500);

    // Verify completed count
    expect(await todoPage.getCompletedCount()).toBe(2);

    // Step 3: Filter by completed
    await todoPage.selectFilter('Completed');
    await assertTodoCount(page, 2);

    // Step 4: Switch to active filter
    await todoPage.selectFilter('Active');
    await assertTodoCount(page, 1);

    // Step 5: Switch back to all
    await todoPage.selectFilter('All');
    await assertTodoCount(page, 3);

    // Step 6: Delete a todo
    await todoPage.deleteTodo(0);
    await assertTodoCount(page, 2);

    // Step 7: Verify final state
    expect(await todoPage.getTotalCount()).toBe(2);
  });

  test('complete flow: rapid CRUD operations', async ({ page }) => {
    const testUser = createTestUser();
    const todoPage = new TodoPage(page);

    // Setup
    await setupAuthenticatedSession(page, testUser);

    // Rapid operations
    const task1 = generateUniqueTodoText('Task 1');
    const task2 = generateUniqueTodoText('Task 2');
    const task3 = generateUniqueTodoText('Task 3');
    
    await todoPage.addTodo(task1);
    await todoPage.addTodo(task2);
    await todoPage.addTodo(task3);
    await assertTodoCount(page, 3);

    // Complete (they move to bottom after completion)
    await todoPage.toggleTodoByText(task1);
    await todoPage.toggleTodoByText(task2);

    // Edit the remaining incomplete todo (task3)
    await todoPage.updateTodoByText(task3, generateUniqueTodoText('Updated task'));

    // Delete one of the completed todos (task1, which is now at bottom)
    await todoPage.deleteTodoByText(task1);
    await assertTodoCount(page, 2);

    // Add more
    await todoPage.addTodo(generateUniqueTodoText('Task 4'));
    await assertTodoCount(page, 3);

    // Wait for sync
    await page.waitForTimeout(2000);

    // Verify data persists
    await page.reload();
    await page.waitForTimeout(2000);
    await assertTodoCount(page, 3);
  });

  test('complete flow: search → edit → complete → filter', async ({ page }) => {
    const testUser = createTestUser();
    const todoPage = new TodoPage(page);

    // Setup
    await setupAuthenticatedSession(page, testUser);

    // Add todos with searchable terms
    await todoPage.addTodo('Buy milk');
    await todoPage.addTodo('Buy bread');
    await todoPage.addTodo('Write report');
    await todoPage.addTodo('Review code');

    // Search for "buy"
    await todoPage.fillSearch('buy');
    await page.waitForTimeout(600);
    await assertTodoCount(page, 2);

    // Clear search
    await todoPage.clearSearch();
    await assertTodoCount(page, 4);

    // Edit a todo
    const todoToEdit = await todoPage.getTodoText(0);
    await todoPage.updateTodoByText(todoToEdit || '', 'Buy groceries');

    // Complete some todos (use text-based lookup since they reorder)
    await todoPage.toggleTodoByText('Buy groceries');
    const todoAt2 = await todoPage.getTodoText(2);
    await todoPage.toggleTodoByText(todoAt2 || '');

    // Filter by completed
    await todoPage.selectFilter('Completed');
    await assertTodoCount(page, 2);

    // Search within completed
    await todoPage.fillSearch('groceries');
    await page.waitForTimeout(600);
    await assertTodoCount(page, 1);
  });

  test('complete flow: session persistence across page refreshes', async ({ page }) => {
    const testUser = createTestUser();
    const todoPage = new TodoPage(page);

    // Register
    await setupAuthenticatedSession(page, testUser);

    // Add todos
    const todo1 = generateUniqueTodoText('Persistent 1');
    const todo2 = generateUniqueTodoText('Persistent 2');
    await todoPage.addTodo(todo1);
    await todoPage.addTodo(todo2);

    // Complete one (it moves to bottom after completion)
    await todoPage.toggleTodoByText(todo1);

    // Wait for sync
    await page.waitForTimeout(2000);

    // Refresh
    await page.reload();
    await page.waitForTimeout(2000);

    // Verify session persisted
    await assertUserIsAuthenticated(page);
    await assertTodoCount(page, 2);

    // Verify completion status persisted (todo1 moved to bottom, todo2 is at top)
    expect(await todoPage.isTodoCompletedByText(todo1)).toBe(true);
    expect(await todoPage.isTodoCompletedByText(todo2)).toBe(false);
  });

  test('complete flow: multiple users can maintain separate data', async ({ page, context }) => {
    const user1 = createTestUser();
    const user2 = createTestUser();

    // User 1 session
    await setupAuthenticatedSession(page, user1);
    const todoPage1 = new TodoPage(page);
    await todoPage1.addTodo('User 1 Task');
    await page.waitForTimeout(1000);
    await todoPage1.clickLogout();

    // User 2 session (same page)
    const loginPage = new LoginPage(page);
    const registerPage = new RegisterPage(page);
    
    await registerPage.goto();
    await registerPage.register(user2.email, user2.password);
    await registerPage.waitForNavigation();

    const todoPage2 = new TodoPage(page);
    await todoPage2.addTodo('User 2 Task');
    await page.waitForTimeout(1000);

    // User 2 should only see their task
    await assertTodoCount(page, 1);
    await assertTodoExists(page, 'User 2 Task');

    await todoPage2.clickLogout();

    // User 1 logs back in
    await loginPage.login(user1.email, user1.password);
    await loginPage.waitForNavigation();
    await page.waitForTimeout(2000);

    // User 1 should only see their task
    await assertTodoCount(page, 1);
    await assertTodoExists(page, 'User 1 Task');
  });

  test('complete flow: error recovery', async ({ page }) => {
    const testUser = createTestUser();
    const todoPage = new TodoPage(page);

    // Register
    await setupAuthenticatedSession(page, testUser);

    // Add a todo
    await todoPage.addTodo(generateUniqueTodoText('Recovery test'));

    // Start editing but cancel
    await todoPage.startEditTodo(0);
    await todoPage.editTodoText('This will be cancelled');
    await todoPage.cancelEdit();

    // Original text should remain
    const text = await todoPage.getTodoText(0);
    expect(text).toContain('Recovery test');

    // Try to add empty todo (should not work)
    await todoPage.clickAddButton();
    await todoPage.waitForAddTodoForm();
    await todoPage.cancelAddTodo();

    // Todo count should remain 1
    await assertTodoCount(page, 1);
  });

  test('complete flow: keyboard-only navigation', async ({ page }) => {
    const testUser = createTestUser();
    const todoPage = new TodoPage(page);

    // Register (using keyboard where possible)
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    // Fill form with Tab and Enter
    await page.keyboard.press('Tab');
    await page.keyboard.type(testUser.email);
    await page.keyboard.press('Tab');
    await page.keyboard.type(testUser.password);
    await page.keyboard.press('Tab');
    await page.keyboard.type(testUser.password);
    await page.keyboard.press('Enter');

    // Wait for registration
    await registerPage.waitForNavigation();
    await assertUserIsAuthenticated(page);

    // Add todo using keyboard shortcut
    // On some systems Ctrl+N might open new window, so we'll use the FAB
    await todoPage.clickAddButton();
    await todoPage.waitForAddTodoForm();
    await page.keyboard.type('Keyboard todo');
    await page.keyboard.press('Enter'); // Submit form

    // Wait for todo to be added
    await page.waitForTimeout(1000);

    // Use keyboard to focus search
    await todoPage.focusSearchWithKeyboard();
    await page.keyboard.type('Keyboard');
    await page.waitForTimeout(600);

    // Should find the todo
    await assertTodoCount(page, 1);
  });

  test('complete flow: mobile-like interaction', async ({ page }) => {
    const testUser = createTestUser();
    const todoPage = new TodoPage(page);

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Register
    await setupAuthenticatedSession(page, testUser);

    // Add todos with touch interactions
    const task1 = generateUniqueTodoText('Mobile task 1');
    const task2 = generateUniqueTodoText('Mobile task 2');
    
    await todoPage.addTodo(task1);
    await todoPage.addTodo(task2);

    // Tap to complete (it moves to bottom after completion)
    await todoPage.toggleTodoByText(task1);

    // Tap to delete the incomplete one (task2, which is now at index 0)
    await todoPage.deleteTodoByText(task2);

    // Verify final state - only task1 remains, and it should be completed
    await assertTodoCount(page, 1);
    expect(await todoPage.isTodoCompletedByText(task1)).toBe(true);

    // Logout
    await todoPage.clickLogout();
    await assertUserIsNotAuthenticated(page);
  });
});
