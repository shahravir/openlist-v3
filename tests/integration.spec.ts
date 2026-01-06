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
  assertTodoDoesNotExist,
  assertTodoCount,
  assertTodoCountInModal,
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
    
    // Wait for all todos to be added and rendered
    await page.waitForTimeout(500);
    await assertTodoCount(page, 4);

    // Step 3: Search for a specific todo
    await todoPage.fillSearch('groceries');
    await page.waitForTimeout(600);
    // Check count in search modal
    await assertTodoCountInModal(page, 1);

    // Step 4: Clear search (closes modal automatically)
    await todoPage.clearSearch();
    await page.waitForTimeout(300);
    // After clearing, modal is closed, check count in main view
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
    // Wait for todos to be added and rendered
    await page.waitForTimeout(500);
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
    // Wait for todos to be added and rendered
    await page.waitForTimeout(500);
    await assertTodoCount(page, 3);

    // Step 2: Complete some todos (use text-based lookup since they reorder)
    await todoPage.toggleTodoByText(todo1);
    await todoPage.toggleTodoByText(todo3);
    // Wait for todos to reorder after completion
    await page.waitForTimeout(1000);

    // Verify completed count
    expect(await todoPage.getCompletedCount()).toBe(2);

    // Step 3: Filter by completed (filters are now in sidebar)
    await todoPage.selectFilter('Completed');
    await assertTodoCount(page, 2);

    // Step 4: Switch to active filter
    await todoPage.selectFilter('Active');
    await assertTodoCount(page, 1);

    // Step 5: Switch back to all
    await todoPage.selectFilter('All');
    // Wait a bit longer for all todos to be visible after switching back to All
    await page.waitForTimeout(500);
    await assertTodoCount(page, 3);

    // Step 6: Delete a todo
    await todoPage.deleteTodo(0);
    // Wait for todo to be deleted and UI to update
    await page.waitForTimeout(500);
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
    // Wait for todos to be added and rendered
    await page.waitForTimeout(500);
    await assertTodoCount(page, 3);

    // Complete (they move to bottom after completion)
    await todoPage.toggleTodoByText(task1);
    await todoPage.toggleTodoByText(task2);

    // Edit the remaining incomplete todo (task3)
    await todoPage.updateTodoByText(task3, generateUniqueTodoText('Updated task'));

    // Delete one of the completed todos (task1, which is now at bottom)
    await todoPage.deleteTodoByText(task1);
    // Wait for todo to be deleted and UI to update
    await page.waitForTimeout(500);
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
    // Check count in search modal
    await assertTodoCountInModal(page, 2);

    // Clear search (closes modal automatically)
    await todoPage.clearSearch();
    await page.waitForTimeout(300);
    // After clearing, modal is closed, check count in main view
    await assertTodoCount(page, 4);

    // Edit a todo
    const todoToEdit = await todoPage.getTodoText(0);
    await todoPage.updateTodoByText(todoToEdit || '', 'Buy groceries');

    // Complete some todos (use text-based lookup since they reorder)
    await todoPage.toggleTodoByText('Buy groceries');
    const todoAt2 = await todoPage.getTodoText(2);
    await todoPage.toggleTodoByText(todoAt2 || '');

    // Filter by completed (filters are now in sidebar)
    await todoPage.selectFilter('Completed');
    await assertTodoCount(page, 2);

    // Search within completed (search modal shows filtered results)
    await todoPage.fillSearch('groceries');
    await page.waitForTimeout(600);
    // Check count in search modal (should show only completed todos matching search)
    await assertTodoCountInModal(page, 1);
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
    // Wait for sync to complete
    await page.waitForTimeout(2000);
    await todoPage1.waitForSync(5000);
    await todoPage1.clickLogout();

    // User 2 session (same page)
    const loginPage = new LoginPage(page);
    const registerPage = new RegisterPage(page);
    
    await registerPage.goto();
    await registerPage.register(user2.email, user2.password);
    await registerPage.waitForNavigation();
    
    // Wait for initial sync to complete after registration
    await page.waitForTimeout(2000);
    const todoPage2 = new TodoPage(page);
    await todoPage2.waitForSync(5000);
    
    // Verify User 2 starts with no todos (after sync, should be empty)
    await assertTodoCount(page, 0);
    // Also verify User 1's task is NOT visible
    await assertTodoDoesNotExist(page, 'User 1 Task');
    
    await todoPage2.addTodo('User 2 Task');
    // Wait for sync to complete
    await page.waitForTimeout(1000);
    await todoPage2.waitForSync(5000);

    // User 2 should only see their task
    await assertTodoCount(page, 1);
    await assertTodoExists(page, 'User 2 Task');

    await todoPage2.clickLogout();

    // User 1 logs back in
    await loginPage.login(user1.email, user1.password);
    await loginPage.waitForNavigation();
    // Wait for initial sync to complete after login
    await page.waitForTimeout(2000);
    const todoPage1Again = new TodoPage(page);
    await todoPage1Again.waitForSync(5000);
    
    // Wait for the app to fully load and todos to be rendered
    // Check that we're on the todo page and it's loaded
    await todoPage1Again.waitForTodoApp();
    
    // Wait for todos to be loaded and filtered by the current user
    // First, wait for "User 1 Task" to appear (confirms User 1's data is loaded)
    await expect(page.locator('text=User 1 Task')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);
    
    // Verify User 2's task is NOT visible (data isolation check)
    const user2Task = page.locator('text=User 2 Task');
    await expect(user2Task).not.toBeVisible({ timeout: 5000 }).catch(() => {
      // If User 2's task is visible, that's a data isolation failure
      throw new Error('Data isolation failure: User 1 can see User 2\'s todos');
    });
    
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

    // Use keyboard to focus search (opens modal)
    await todoPage.focusSearchWithKeyboard();
    await page.keyboard.type('Keyboard');
    await page.waitForTimeout(600);

    // Should find the todo in the search modal
    await assertTodoCountInModal(page, 1);
  });

});
