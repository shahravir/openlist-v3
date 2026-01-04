import { test, expect } from '@playwright/test';
import { TodoPage } from './pages/TodoPage';
import { createTestUser } from './fixtures/test-user';
import { searchTestData } from './fixtures/test-data';
import {
  setupAuthenticatedSession,
  createMultipleTodos,
  clearLocalStorage,
} from './utils/helpers';
import {
  assertTodoCount,
  assertTodoExists,
  assertSearchHighlight,
} from './utils/assertions';

// test.describe('Search & Filter', () => {
//   test.beforeEach(async ({ page }) => {
//     // Setup authenticated session with test data
//     await clearLocalStorage(page);
//     const testUser = createTestUser();
//     await setupAuthenticatedSession(page, testUser);

//     // Add test todos for search and filter
//     const todoTexts = searchTestData.todos.map(t => t.text);
//     await createMultipleTodos(page, todoTexts);
//   });

//   test('user can search todos by text', async ({ page }) => {
//     const todoPage = new TodoPage(page);

//     // Initial state - all todos visible
//     await assertTodoCount(page, 5);

//     // Search for "milk"
//     await todoPage.fillSearch('milk');

//     // Only one todo should be visible
//     await assertTodoCount(page, 1);
//     await assertTodoExists(page, 'Buy milk and bread');
//   });

//   test('search is case insensitive', async ({ page }) => {
//     const todoPage = new TodoPage(page);

//     // Search with different cases
//     await todoPage.fillSearch('MILK');
//     await assertTodoCount(page, 1);
//     await assertTodoExists(page, 'Buy milk and bread');

//     await todoPage.clearSearch();
//     await todoPage.fillSearch('MiLk');
//     await assertTodoCount(page, 1);
//     await assertTodoExists(page, 'Buy milk and bread');
//   });

//   test('search shows partial matches', async ({ page }) => {
//     const todoPage = new TodoPage(page);

//     // Search for partial word
//     await todoPage.fillSearch('appoint');

//     // Should find "appointment"
//     await assertTodoCount(page, 1);
//     await assertTodoExists(page, 'Schedule dentist appointment');
//   });

//   test('search with no matches shows empty state', async ({ page }) => {
//     const todoPage = new TodoPage(page);

//     // Search for something that doesn't exist
//     await todoPage.fillSearch('xyzzz');

//     // Should show no results
//     await assertTodoCount(page, 0);

//     // Should show appropriate message
//     const emptyMessage = await todoPage.getEmptyStateMessage();
//     expect(emptyMessage).toContain('No todos match');
//   });

//   test('user can clear search', async ({ page }) => {
//     const todoPage = new TodoPage(page);

//     // Search for something
//     await todoPage.fillSearch('milk');
//     await assertTodoCount(page, 1);

//     // Clear search
//     await todoPage.clearSearch();

//     // All todos should be visible again
//     await assertTodoCount(page, 5);
//   });

//   test('search highlights matching text', async ({ page }) => {
//     const todoPage = new TodoPage(page);

//     // Search for "milk"
//     await todoPage.fillSearch('milk');

//     // Wait for debounce and rendering
//     await page.waitForTimeout(600);

//     // Check if highlighted
//     const isHighlighted = await todoPage.isSearchHighlighted('milk');
//     expect(isHighlighted).toBe(true);
//   });

//   test('keyboard shortcut focuses search', async ({ page }) => {
//     const todoPage = new TodoPage(page);

//     // Focus search with keyboard shortcut
//     await todoPage.focusSearchWithKeyboard();

//     // Search input should be focused
//     const searchInput = page.locator('input[aria-label="Search todos"]');
//     await expect(searchInput).toBeFocused();
//   });

//   test('user can filter by status - Active', async ({ page }) => {
//     const todoPage = new TodoPage(page);

//     // Complete some todos (use text-based lookup since they reorder)
//     const firstTodo = await todoPage.getTodoText(0);
//     const secondTodo = await todoPage.getTodoText(1);
//     await todoPage.toggleTodoByText(firstTodo || '');
//     await todoPage.toggleTodoByText(secondTodo || '');

//     // Filter by Active
//     await todoPage.selectFilter('Active');

//     // Should show only incomplete todos
//     await assertTodoCount(page, 3);
//   });

//   test('user can filter by status - Completed', async ({ page }) => {
//     const todoPage = new TodoPage(page);

//     // Complete some todos (use text-based lookup since they reorder)
//     const firstTodo = await todoPage.getTodoText(0);
//     const secondTodo = await todoPage.getTodoText(1);
//     await todoPage.toggleTodoByText(firstTodo || '');
//     await todoPage.toggleTodoByText(secondTodo || '');
//     await page.waitForTimeout(500);

//     // Filter by Completed
//     await todoPage.selectFilter('Completed');

//     // Should show only completed todos
//     await assertTodoCount(page, 2);

//     // Verify they are actually completed (after filtering, they're at indices 0 and 1)
//     expect(await todoPage.isTodoCompleted(0)).toBe(true);
//     expect(await todoPage.isTodoCompleted(1)).toBe(true);
//   });

//   test('user can filter by status - All', async ({ page }) => {
//     const todoPage = new TodoPage(page);

//     // Complete some todos (use text-based lookup since they reorder)
//     const firstTodo = await todoPage.getTodoText(0);
//     const secondTodo = await todoPage.getTodoText(1);
//     await todoPage.toggleTodoByText(firstTodo || '');
//     await todoPage.toggleTodoByText(secondTodo || '');

//     // Filter by Completed first
//     await todoPage.selectFilter('Completed');
//     await assertTodoCount(page, 2);

//     // Switch back to All
//     await todoPage.selectFilter('All');

//     // Should show all todos
//     await assertTodoCount(page, 5);
//   });

//   test('user can combine search and filter', async ({ page }) => {
//     const todoPage = new TodoPage(page);

//     // Complete one todo that contains "test"
//     // First find which index has "test"
//     const count = await todoPage.getTodoCount();
//     let testIndex = -1;
//     for (let i = 0; i < count; i++) {
//       const text = await todoPage.getTodoText(i);
//       if (text?.toLowerCase().includes('test')) {
//         testIndex = i;
//         break;
//       }
//     }

//     if (testIndex >= 0) {
//       await todoPage.toggleTodo(testIndex);
//     }

//     // Search for "test"
//     await todoPage.fillSearch('test');
//     await page.waitForTimeout(600);

//     const searchCount = await todoPage.getTodoCount();
//     expect(searchCount).toBeGreaterThan(0);

//     // Filter by Active
//     await todoPage.selectFilter('Active');

//     // Should show only incomplete todos that match "test"
//     const filteredCount = await todoPage.getTodoCount();
//     expect(filteredCount).toBeLessThan(searchCount);
//   });

//   test('search updates in real-time as user types', async ({ page }) => {
//     const todoPage = new TodoPage(page);

//     // Type search query character by character
//     await todoPage.fillSearch('m');
//     await page.waitForTimeout(600);
//     const count1 = await todoPage.getTodoCount();

//     await todoPage.fillSearch('mi');
//     await page.waitForTimeout(600);
//     const count2 = await todoPage.getTodoCount();

//     await todoPage.fillSearch('mil');
//     await page.waitForTimeout(600);
//     const count3 = await todoPage.getTodoCount();

//     // Results should be progressively more specific
//     expect(count3).toBeLessThanOrEqual(count2);
//     expect(count2).toBeLessThanOrEqual(count1);
//   });

//   test('filter persists after adding new todo', async ({ page }) => {
//     const todoPage = new TodoPage(page);

//     // Complete some todos (use text-based lookup since they reorder)
//     const firstTodo = await todoPage.getTodoText(0);
//     const secondTodo = await todoPage.getTodoText(1);
//     await todoPage.toggleTodoByText(firstTodo || '');
//     await todoPage.toggleTodoByText(secondTodo || '');

//     // Filter by Completed
//     await todoPage.selectFilter('Completed');
//     await assertTodoCount(page, 2);

//     // Add a new todo (which will be incomplete)
//     await todoPage.addTodo('New incomplete todo');

//     // Filter should still be Completed, so new todo shouldn't show
//     await assertTodoCount(page, 2);
//   });

//   test('search persists after completing todo', async ({ page }) => {
//     const todoPage = new TodoPage(page);

//     // Search for something
//     await todoPage.fillSearch('test');
//     await page.waitForTimeout(600);
//     const initialCount = await todoPage.getTodoCount();

//     if (initialCount > 0) {
//       // Complete a todo (use text-based lookup since it will reorder)
//       const firstTodo = await todoPage.getTodoText(0);
//       await todoPage.toggleTodoByText(firstTodo || '');

//       // Search should still be active and show same count
//       await page.waitForTimeout(300);
//       const afterCount = await todoPage.getTodoCount();
//       expect(afterCount).toBe(initialCount);
//     }
//   });

//   test('clearing search restores filter state', async ({ page }) => {
//     const todoPage = new TodoPage(page);

//     // Complete some todos (use text-based lookup since they reorder)
//     const firstTodo = await todoPage.getTodoText(0);
//     const secondTodo = await todoPage.getTodoText(1);
//     await todoPage.toggleTodoByText(firstTodo || '');
//     await todoPage.toggleTodoByText(secondTodo || '');

//     // Filter by Active
//     await todoPage.selectFilter('Active');
//     const activeCount = await todoPage.getTodoCount();

//     // Search for something
//     await todoPage.fillSearch('review');
//     await page.waitForTimeout(600);

//     // Clear search
//     await todoPage.clearSearch();
//     await page.waitForTimeout(300);

//     // Should still show Active filter applied
//     const finalCount = await todoPage.getTodoCount();
//     expect(finalCount).toBe(activeCount);
//   });

//   test('empty search shows all todos', async ({ page }) => {
//     const todoPage = new TodoPage(page);

//     // Type and then delete search
//     await todoPage.fillSearch('test');
//     await page.waitForTimeout(600);

//     await todoPage.fillSearch('');
//     await page.waitForTimeout(600);

//     // All todos should be visible
//     await assertTodoCount(page, 5);
//   });

//   test('search works with special characters', async ({ page }) => {
//     const todoPage = new TodoPage(page);

//     // Add a todo with special characters
//     await todoPage.addTodo('Todo with !@#$ special chars');

//     // Search for it
//     await todoPage.fillSearch('!@#$');
//     await page.waitForTimeout(600);

//     // Should find the todo
//     await assertTodoExists(page, 'special chars');
//   });
// });
