import { test, expect } from '@playwright/test';
import { TodoPage } from './pages/TodoPage';
import { createTestUser } from './fixtures/test-user';
import { generateUniqueTodoText, sampleTodos } from './fixtures/test-data';
import {
  setupAuthenticatedSession,
  createMultipleTodos,
  clearLocalStorage,
} from './utils/helpers';
import {
  assertTodoExists,
  assertTodoDoesNotExist,
  assertTodoCount,
  assertEmptyStateVisible,
  assertCompletedCount,
} from './utils/assertions';

// test.describe('Todo CRUD Operations', () => {
//   test.beforeEach(async ({ page }) => {
//     // Setup authenticated session for each test
//     await clearLocalStorage(page);
//     const testUser = createTestUser();
//     await setupAuthenticatedSession(page, testUser);
//   });

//   test('user can create new todo', async ({ page }) => {
//     const todoPage = new TodoPage(page);
//     const todoText = generateUniqueTodoText('New task');

//     // Initially should show empty state
//     await assertEmptyStateVisible(page);

//     // Add a new todo
//     await todoPage.addTodo(todoText);

//     // Verify todo was added
//     await assertTodoExists(page, todoText);
//     await assertTodoCount(page, 1);

//     // Empty state should no longer be visible
//     expect(await todoPage.isEmptyStateVisible()).toBe(false);
//   });

//   test('user can edit todo text', async ({ page }) => {
//     const todoPage = new TodoPage(page);
//     const originalText = generateUniqueTodoText('Original task');
//     const updatedText = generateUniqueTodoText('Updated task');

//     // Add a todo
//     await todoPage.addTodo(originalText);
//     await assertTodoExists(page, originalText);

//     // Edit the todo
//     await todoPage.updateTodo(0, updatedText);

//     // Verify the todo was updated
//     await assertTodoExists(page, updatedText);
//     await assertTodoDoesNotExist(page, originalText);
//   });

//   test('user can edit todo by double clicking', async ({ page }) => {
//     const todoPage = new TodoPage(page);
//     const originalText = generateUniqueTodoText('Double click task');
//     const updatedText = generateUniqueTodoText('Updated by double click');

//     // Add a todo
//     await todoPage.addTodo(originalText);

//     // Double click to edit
//     await todoPage.doubleClickToEdit(0);
//     await todoPage.editTodoText(updatedText);
//     await todoPage.saveEdit();

//     // Verify the update
//     await assertTodoExists(page, updatedText);
//     await assertTodoDoesNotExist(page, originalText);
//   });

//   test('user can cancel todo edit', async ({ page }) => {
//     const todoPage = new TodoPage(page);
//     const originalText = generateUniqueTodoText('Cancel edit task');

//     // Add a todo
//     await todoPage.addTodo(originalText);

//     // Start editing
//     await todoPage.startEditTodo(0);
//     await todoPage.editTodoText('This should be cancelled');
//     await todoPage.cancelEdit();

//     // Verify original text is still there
//     await assertTodoExists(page, originalText);
//   });

//   test('user can complete todo', async ({ page }) => {
//     const todoPage = new TodoPage(page);
//     const todoText = generateUniqueTodoText('Task to complete');

//     // Add a todo
//     await todoPage.addTodo(todoText);

//     // Complete the todo
//     await todoPage.toggleTodo(0);

//     // Verify todo is completed
//     const isCompleted = await todoPage.isTodoCompleted(0);
//     expect(isCompleted).toBe(true);

//     // Verify stats show 1 completed
//     await assertCompletedCount(page, 1);
//   });

//   test('user can uncomplete todo', async ({ page }) => {
//     const todoPage = new TodoPage(page);
//     const todoText = generateUniqueTodoText('Task to uncomplete');

//     // Add and complete a todo
//     await todoPage.addTodo(todoText);
//     await todoPage.toggleTodo(0);

//     // Verify it's completed
//     expect(await todoPage.isTodoCompleted(0)).toBe(true);

//     // Uncomplete the todo
//     await todoPage.toggleTodo(0);

//     // Verify todo is no longer completed
//     expect(await todoPage.isTodoCompleted(0)).toBe(false);

//     // Verify stats show 0 completed
//     await assertCompletedCount(page, 0);
//   });

//   test('user can delete todo', async ({ page }) => {
//     const todoPage = new TodoPage(page);
//     const todoText = generateUniqueTodoText('Task to delete');

//     // Add a todo
//     await todoPage.addTodo(todoText);
//     await assertTodoExists(page, todoText);
//     await assertTodoCount(page, 1);

//     // Delete the todo
//     await todoPage.deleteTodo(0);

//     // Verify todo was deleted
//     await assertTodoDoesNotExist(page, todoText);
//     await assertTodoCount(page, 0);

//     // Empty state should be visible
//     await assertEmptyStateVisible(page);
//   });

//   test('user sees empty state when no todos', async ({ page }) => {
//     const todoPage = new TodoPage(page);

//     // Should show empty state initially
//     await assertEmptyStateVisible(page);

//     const emptyMessage = await todoPage.getEmptyStateMessage();
//     expect(emptyMessage).toContain('No tasks yet');
//   });

//   test('todos persist after page refresh', async ({ page }) => {
//     const todoPage = new TodoPage(page);
//     const todoTexts = [
//       generateUniqueTodoText('Persistent task 1'),
//       generateUniqueTodoText('Persistent task 2'),
//       generateUniqueTodoText('Persistent task 3'),
//     ];

//     // Add multiple todos
//     await createMultipleTodos(page, todoTexts);

//     // Verify all todos are present
//     await assertTodoCount(page, 3);
//     for (const text of todoTexts) {
//       await assertTodoExists(page, text);
//     }

//     // Refresh the page
//     await page.reload();
//     await page.waitForTimeout(1000);

//     // Verify todos are still present
//     await assertTodoCount(page, 3);
//     for (const text of todoTexts) {
//       await assertTodoExists(page, text);
//     }
//   });

//   test('completed todos show with strikethrough style', async ({ page }) => {
//     const todoPage = new TodoPage(page);
//     const todoText = generateUniqueTodoText('Styled task');

//     // Add and complete a todo
//     await todoPage.addTodo(todoText);
//     await todoPage.toggleTodo(0);

//     // Verify the visual style (strikethrough)
//     const todoItem = todoPage.getTodoItems().nth(0);
//     const textSpan = todoItem.locator('span').first();
//     const className = await textSpan.getAttribute('class');
    
//     expect(className).toContain('line-through');
//     expect(className).toContain('text-gray-400');
//   });

//   test('multiple todos can be managed independently', async ({ page }) => {
//     const todoPage = new TodoPage(page);
//     const todo1 = generateUniqueTodoText('Task 1');
//     const todo2 = generateUniqueTodoText('Task 2');
//     const todo3 = generateUniqueTodoText('Task 3');

//     // Add three todos
//     await todoPage.addTodo(todo1);
//     await todoPage.addTodo(todo2);
//     await todoPage.addTodo(todo3);

//     await assertTodoCount(page, 3);

//     // Complete the second todo (it will move to bottom after completion)
//     await todoPage.toggleTodoByText(todo2);
//     expect(await todoPage.isTodoCompletedByText(todo2)).toBe(true);
//     expect(await todoPage.isTodoCompletedByText(todo1)).toBe(false);
//     expect(await todoPage.isTodoCompletedByText(todo3)).toBe(false);

//     // Delete the first todo
//     await todoPage.deleteTodoByText(todo1);
//     await assertTodoCount(page, 2);

//     // Edit the remaining first todo (todo3, since todo2 moved to bottom)
//     const updatedText = generateUniqueTodoText('Updated task');
//     await todoPage.updateTodoByText(todo3, updatedText);
//     await assertTodoExists(page, updatedText);
//   });

//   test('completed count updates correctly', async ({ page }) => {
//     const todoPage = new TodoPage(page);

//     // Add three todos
//     const todo1 = generateUniqueTodoText('Task 1');
//     const todo2 = generateUniqueTodoText('Task 2');
//     const todo3 = generateUniqueTodoText('Task 3');

//     await todoPage.addTodo(todo1);
//     await todoPage.addTodo(todo2);
//     await todoPage.addTodo(todo3);

//     // Initially 0 completed
//     await assertCompletedCount(page, 0);
//     expect(await todoPage.getTotalCount()).toBe(3);

//     // Complete one (it moves to bottom)
//     await todoPage.toggleTodoByText(todo1);
//     await assertCompletedCount(page, 1);

//     // Complete another (it moves to bottom)
//     await todoPage.toggleTodoByText(todo2);
//     await assertCompletedCount(page, 2);

//     // Uncomplete one (it moves back to top)
//     await todoPage.toggleTodoByText(todo1);
//     await assertCompletedCount(page, 1);

//     // Complete all
//     await todoPage.toggleTodoByText(todo1);
//     await todoPage.toggleTodoByText(todo3);
//     await assertCompletedCount(page, 3);
//   });

//   test('FAB opens add todo form', async ({ page }) => {
//     const todoPage = new TodoPage(page);

//     // Click FAB
//     await todoPage.clickAddButton();

//     // Wait for form to appear
//     await todoPage.waitForAddTodoForm();

//     // Form should be visible
//     const textarea = page.locator('textarea');
//     await expect(textarea).toBeVisible();
//     await expect(textarea).toBeFocused();
//   });

//   test('can cancel adding a todo', async ({ page }) => {
//     const todoPage = new TodoPage(page);

//     // Open add form
//     await todoPage.clickAddButton();
//     await todoPage.waitForAddTodoForm();

//     // Type some text but cancel
//     await todoPage.fillTodoText('This should be cancelled');
//     await todoPage.cancelAddTodo();

//     // Form should close and no todo should be added
//     await assertEmptyStateVisible(page);
//     await assertTodoCount(page, 0);
//   });

//   test('todos are sorted correctly', async ({ page }) => {
//     const todoPage = new TodoPage(page);

//     // Add three todos
//     const todo1 = generateUniqueTodoText('First');
//     const todo2 = generateUniqueTodoText('Second');
//     const todo3 = generateUniqueTodoText('Third');

//     await todoPage.addTodo(todo1);
//     await todoPage.addTodo(todo2);
//     await todoPage.addTodo(todo3);

//     // Complete the second one
//     await todoPage.toggleTodo(1);

//     // Wait for reordering
//     await page.waitForTimeout(500);

//     // Completed todos should be at the bottom
//     // First two should be incomplete, last one should be completed
//     expect(await todoPage.isTodoCompleted(0)).toBe(false);
//     expect(await todoPage.isTodoCompleted(1)).toBe(false);
//     expect(await todoPage.isTodoCompleted(2)).toBe(true);
//   });
// });
