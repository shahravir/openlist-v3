import { test, expect } from '@playwright/test';
import { TodoPage } from './pages/TodoPage';
import { createTestUser } from './fixtures/test-user';
import { generateUniqueTodoText } from './fixtures/test-data';
import {
  setupAuthenticatedSession,
  clearLocalStorage,
} from './utils/helpers';
import {
  assertTodoExists,
  assertTodoCount,
} from './utils/assertions';

// test.describe('Sync Functionality', () => {
//   test.beforeEach(async ({ page }) => {
//     // Clear storage and setup session
//     await clearLocalStorage(page);
//   });

//   test('todos sync on initial load', async ({ page }) => {
//     const todoPage = new TodoPage(page);
//     const testUser = createTestUser();

//     // Register and add a todo
//     await setupAuthenticatedSession(page, testUser);
//     const todoText = generateUniqueTodoText('Sync test');
//     await todoPage.addTodo(todoText);

//     // Wait for sync
//     await page.waitForTimeout(2000);

//     // Verify todo exists
//     await assertTodoExists(page, todoText);

//     // Logout and login again
//     await todoPage.clickLogout();
//     await page.waitForTimeout(500);

//     // Login with same user
//     const { loginUser } = await import('./utils/helpers');
//     await loginUser(page, testUser);

//     // Wait for initial sync
//     await page.waitForTimeout(2000);

//     // Todo should still be there after sync
//     await assertTodoExists(page, todoText);
//   });

//   test('new todo syncs to server', async ({ page }) => {
//     const todoPage = new TodoPage(page);
//     const testUser = createTestUser();

//     await setupAuthenticatedSession(page, testUser);

//     const todoText = generateUniqueTodoText('Server sync test');
//     await todoPage.addTodo(todoText);

//     // Wait for background sync
//     await page.waitForTimeout(2000);

//     // Todo should be visible
//     await assertTodoExists(page, todoText);

//     // Check if sync status indicator shows synced
//     // Note: This depends on the sync status implementation
//     await page.waitForTimeout(1000);
//   });

//   test('edited todo syncs to server', async ({ page }) => {
//     const todoPage = new TodoPage(page);
//     const testUser = createTestUser();

//     await setupAuthenticatedSession(page, testUser);

//     // Add and edit a todo
//     const originalText = generateUniqueTodoText('Original');
//     const updatedText = generateUniqueTodoText('Updated');

//     await todoPage.addTodo(originalText);
//     await page.waitForTimeout(1000);

//     await todoPage.updateTodo(0, updatedText);

//     // Wait for sync
//     await page.waitForTimeout(2000);

//     // Verify the update persists
//     await assertTodoExists(page, updatedText);
//   });

//   test('deleted todo syncs to server', async ({ page }) => {
//     const todoPage = new TodoPage(page);
//     const testUser = createTestUser();

//     await setupAuthenticatedSession(page, testUser);

//     // Add a todo
//     const todoText = generateUniqueTodoText('To delete');
//     await todoPage.addTodo(todoText);
//     await page.waitForTimeout(1000);

//     // Delete it
//     await todoPage.deleteTodo(0);

//     // Wait for sync
//     await page.waitForTimeout(2000);

//     // Todo should be gone
//     await assertTodoCount(page, 0);
//   });

//   test('completed status syncs to server', async ({ page }) => {
//     const todoPage = new TodoPage(page);
//     const testUser = createTestUser();

//     await setupAuthenticatedSession(page, testUser);

//     // Add a todo
//     const todoText = generateUniqueTodoText('To complete');
//     await todoPage.addTodo(todoText);
//     await page.waitForTimeout(1000);

//     // Complete it
//     await todoPage.toggleTodo(0);

//     // Wait for sync
//     await page.waitForTimeout(2000);

//     // Verify completion status
//     expect(await todoPage.isTodoCompleted(0)).toBe(true);

//     // Reload and check if status persists
//     await page.reload();
//     await page.waitForTimeout(2000);

//     expect(await todoPage.isTodoCompleted(0)).toBe(true);
//   });

//   test('sync status indicator shows correct state', async ({ page }) => {
//     const todoPage = new TodoPage(page);
//     const testUser = createTestUser();

//     await setupAuthenticatedSession(page, testUser);

//     // Check if sync status is visible
//     const isSyncVisible = await todoPage.isSyncStatusVisible();
    
//     // Add a todo to trigger sync
//     const todoText = generateUniqueTodoText('Sync status test');
//     await todoPage.addTodo(todoText);

//     // Wait for sync to complete
//     await page.waitForTimeout(3000);

//     // Check sync status again
//     const syncStatus = await todoPage.getSyncStatus();
//     // Status could be "Synced", "Syncing", or "Offline"
//     // We just verify it's present and not null
//     if (syncStatus) {
//       expect(typeof syncStatus).toBe('string');
//     }
//   });

//   test('multiple changes sync correctly', async ({ page }) => {
//     const todoPage = new TodoPage(page);
//     const testUser = createTestUser();

//     await setupAuthenticatedSession(page, testUser);

//     // Make multiple changes rapidly
//     const todo1 = generateUniqueTodoText('Todo 1');
//     const todo2 = generateUniqueTodoText('Todo 2');
//     const todo3 = generateUniqueTodoText('Todo 3');

//     await todoPage.addTodo(todo1);
//     await todoPage.addTodo(todo2);
//     await todoPage.addTodo(todo3);

//     // Complete one
//     await todoPage.toggleTodo(1);

//     // Delete one
//     await todoPage.deleteTodo(0);

//     // Wait for all syncs
//     await page.waitForTimeout(3000);

//     // Verify final state
//     await assertTodoCount(page, 2);

//     // Reload to confirm sync
//     await page.reload();
//     await page.waitForTimeout(2000);

//     await assertTodoCount(page, 2);
//   });

//   test('sync persists across sessions', async ({ page }) => {
//     const todoPage = new TodoPage(page);
//     const testUser = createTestUser();

//     // First session
//     await setupAuthenticatedSession(page, testUser);
    
//     const todo1 = generateUniqueTodoText('Session 1 todo');
//     await todoPage.addTodo(todo1);
//     await page.waitForTimeout(2000);

//     // Logout
//     await todoPage.clickLogout();
//     await page.waitForTimeout(500);

//     // Clear storage to simulate new session
//     await clearLocalStorage(page);

//     // Second session - login again
//     const { loginUser } = await import('./utils/helpers');
//     await loginUser(page, testUser);
//     await page.waitForTimeout(2000);

//     // Todo from first session should be present
//     await assertTodoExists(page, todo1);

//     // Add another todo in second session
//     const todo2 = generateUniqueTodoText('Session 2 todo');
//     await todoPage.addTodo(todo2);
//     await page.waitForTimeout(2000);

//     // Both todos should be present
//     await assertTodoExists(page, todo1);
//     await assertTodoExists(page, todo2);
//   });

//   test('local changes are preserved during sync', async ({ page }) => {
//     const todoPage = new TodoPage(page);
//     const testUser = createTestUser();

//     await setupAuthenticatedSession(page, testUser);

//     // Add a todo
//     const todoText = generateUniqueTodoText('Local change');
//     await todoPage.addTodo(todoText);

//     // Immediately reload (before sync completes)
//     await page.waitForTimeout(500);
//     await page.reload();

//     // Wait for page to load and sync
//     await page.waitForTimeout(2000);

//     // Todo should still be present (from local storage or sync)
//     await assertTodoExists(page, todoText);
//   });

//   test('sync handles rapid updates', async ({ page }) => {
//     const todoPage = new TodoPage(page);
//     const testUser = createTestUser();

//     await setupAuthenticatedSession(page, testUser);

//     // Add a todo
//     const originalText = generateUniqueTodoText('Rapid update');
//     await todoPage.addTodo(originalText);
//     await page.waitForTimeout(500);

//     // Edit multiple times rapidly
//     await todoPage.updateTodo(0, generateUniqueTodoText('Update 1'));
//     await page.waitForTimeout(200);
//     await todoPage.updateTodo(0, generateUniqueTodoText('Update 2'));
//     await page.waitForTimeout(200);
//     const finalText = generateUniqueTodoText('Final update');
//     await todoPage.updateTodo(0, finalText);

//     // Wait for sync
//     await page.waitForTimeout(3000);

//     // Final state should be preserved
//     await assertTodoExists(page, finalText);

//     // Reload to verify sync
//     await page.reload();
//     await page.waitForTimeout(2000);
//     await assertTodoExists(page, finalText);
//   });
// });
