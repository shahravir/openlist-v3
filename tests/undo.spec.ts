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
  assertTodoDoesNotExist,
  assertTodoCount,
} from './utils/assertions';

// Test viewport constants
const MOBILE_VIEWPORT = { width: 375, height: 667 };
const DESKTOP_VIEWPORT = { width: 1920, height: 1080 };

// test.describe('Undo/Redo Functionality', () => {
//   test.beforeEach(async ({ page }) => {
//     // Setup authenticated session for each test
//     await clearLocalStorage(page);
//     const testUser = createTestUser();
//     await setupAuthenticatedSession(page, testUser);
//   });

//   test('user can undo delete action', async ({ page }) => {
//     const todoPage = new TodoPage(page);
//     const todoText = generateUniqueTodoText('Task to delete');

//     // Add a todo
//     await todoPage.addTodo(todoText);
//     await assertTodoExists(page, todoText);

//     // Delete the todo
//     const todoItem = page.locator(`[role="listitem"]:has-text("${todoText}")`);
//     const deleteButton = todoItem.locator('button[aria-label="Delete todo"]');
//     await deleteButton.click();

//     // Wait for toast to appear
//     const toast = page.locator('[role="alert"]');
//     await expect(toast).toBeVisible({ timeout: 5000 });
//     await expect(toast).toContainText('Task deleted');

//     // Verify todo is deleted
//     await assertTodoDoesNotExist(page, todoText);

//     // Click undo button
//     const undoButton = toast.locator('button:has-text("Undo")');
//     await undoButton.click();

//     // Wait for toast to disappear
//     await expect(toast).not.toBeVisible({ timeout: 2000 });

//     // Verify todo is restored
//     await assertTodoExists(page, todoText);
//   });

//   test('user can undo complete action', async ({ page }) => {
//     const todoPage = new TodoPage(page);
//     const todoText = generateUniqueTodoText('Task to complete');

//     // Add a todo
//     await todoPage.addTodo(todoText);
//     await assertTodoExists(page, todoText);

//     // Complete the todo
//     const todoItem = page.locator(`[role="listitem"]:has-text("${todoText}")`);
//     const checkbox = todoItem.locator('button[aria-label*="Mark as"]').first();
//     await checkbox.click();

//     // Wait for toast to appear
//     const toast = page.locator('[role="alert"]');
//     await expect(toast).toBeVisible({ timeout: 5000 });
//     await expect(toast).toContainText('Task marked as complete');

//     // Verify todo is completed
//     await expect(checkbox).toHaveAttribute('aria-label', 'Mark as incomplete');

//     // Click undo button
//     const undoButton = toast.locator('button:has-text("Undo")');
//     await undoButton.click();

//     // Wait for toast to disappear
//     await expect(toast).not.toBeVisible({ timeout: 2000 });

//     // Verify todo is uncompleted
//     await expect(checkbox).toHaveAttribute('aria-label', 'Mark as complete');
//   });

//   test('user can undo edit action', async ({ page }) => {
//     const todoPage = new TodoPage(page);
//     const originalText = generateUniqueTodoText('Original text');
//     const updatedText = generateUniqueTodoText('Updated text');

//     // Add a todo
//     await todoPage.addTodo(originalText);
//     await assertTodoExists(page, originalText);

//     // Edit the todo
//     const todoItem = page.locator(`[role="listitem"]:has-text("${originalText}")`);
//     const editButton = todoItem.locator('button[aria-label="Edit todo"]');
//     await editButton.click();

//     // Wait for edit mode
//     const editInput = page.locator('input[aria-label="Edit todo text"]');
//     await expect(editInput).toBeVisible({ timeout: 2000 });
    
//     // Update the text
//     await editInput.fill(updatedText);
//     const saveButton = todoItem.locator('button[aria-label="Save changes"]');
//     await saveButton.click();

//     // Wait for toast to appear
//     const toast = page.locator('[role="alert"]');
//     await expect(toast).toBeVisible({ timeout: 5000 });
//     await expect(toast).toContainText('Task updated');

//     // Verify todo is updated
//     await assertTodoExists(page, updatedText);
//     await assertTodoDoesNotExist(page, originalText);

//     // Click undo button
//     const undoButton = toast.locator('button:has-text("Undo")');
//     await undoButton.click();

//     // Wait for toast to disappear
//     await expect(toast).not.toBeVisible({ timeout: 2000 });

//     // Verify original text is restored
//     await assertTodoExists(page, originalText);
//     await assertTodoDoesNotExist(page, updatedText);
//   });

//   test('toast auto-dismisses after 5 seconds', async ({ page }) => {
//     const todoPage = new TodoPage(page);
//     const todoText = generateUniqueTodoText('Task to delete');

//     // Add a todo
//     await todoPage.addTodo(todoText);
    
//     // Delete the todo to trigger toast
//     const todoItem = page.locator(`[role="listitem"]:has-text("${todoText}")`);
//     const deleteButton = todoItem.locator('button[aria-label="Delete todo"]');
//     await deleteButton.click();

//     // Wait for toast to appear
//     const toast = page.locator('[role="alert"]');
//     await expect(toast).toBeVisible({ timeout: 5000 });

//     // Wait for auto-dismiss (5 seconds + animation time)
//     await expect(toast).not.toBeVisible({ timeout: 6000 });
//   });

//   test('user can manually dismiss toast', async ({ page }) => {
//     const todoPage = new TodoPage(page);
//     const todoText = generateUniqueTodoText('Task to delete');

//     // Add a todo
//     await todoPage.addTodo(todoText);
    
//     // Delete the todo to trigger toast
//     const todoItem = page.locator(`[role="listitem"]:has-text("${todoText}")`);
//     const deleteButton = todoItem.locator('button[aria-label="Delete todo"]');
//     await deleteButton.click();

//     // Wait for toast to appear
//     const toast = page.locator('[role="alert"]');
//     await expect(toast).toBeVisible({ timeout: 5000 });

//     // Click dismiss button
//     const dismissButton = toast.locator('button[aria-label="Dismiss notification"]');
//     await dismissButton.click();

//     // Verify toast is dismissed
//     await expect(toast).not.toBeVisible({ timeout: 2000 });
//   });

//   test('toast has proper accessibility attributes', async ({ page }) => {
//     const todoPage = new TodoPage(page);
//     const todoText = generateUniqueTodoText('Task to delete');

//     // Add a todo
//     await todoPage.addTodo(todoText);
    
//     // Delete the todo to trigger toast
//     const todoItem = page.locator(`[role="listitem"]:has-text("${todoText}")`);
//     const deleteButton = todoItem.locator('button[aria-label="Delete todo"]');
//     await deleteButton.click();

//     // Wait for toast to appear
//     const toast = page.locator('[role="alert"]');
//     await expect(toast).toBeVisible({ timeout: 5000 });

//     // Verify ARIA attributes
//     await expect(toast).toHaveAttribute('role', 'alert');
//     await expect(toast).toHaveAttribute('aria-live', 'polite');
//     await expect(toast).toHaveAttribute('aria-atomic', 'true');
//   });

//   test('undo button is keyboard accessible', async ({ page }) => {
//     const todoPage = new TodoPage(page);
//     const todoText = generateUniqueTodoText('Task to delete');

//     // Add a todo
//     await todoPage.addTodo(todoText);
    
//     // Delete the todo to trigger toast
//     const todoItem = page.locator(`[role="listitem"]:has-text("${todoText}")`);
//     const deleteButton = todoItem.locator('button[aria-label="Delete todo"]');
//     await deleteButton.click();

//     // Wait for toast to appear
//     const toast = page.locator('[role="alert"]');
//     await expect(toast).toBeVisible({ timeout: 5000 });

//     // Focus and activate undo button with keyboard
//     const undoButton = toast.locator('button:has-text("Undo")');
//     await undoButton.focus();
//     await page.keyboard.press('Enter');

//     // Verify toast is dismissed and todo is restored
//     await expect(toast).not.toBeVisible({ timeout: 2000 });
//     await assertTodoExists(page, todoText);
//   });

//   test('multiple deletes can be undone sequentially', async ({ page }) => {
//     const todoPage = new TodoPage(page);
//     const todo1Text = generateUniqueTodoText('Task 1');
//     const todo2Text = generateUniqueTodoText('Task 2');

//     // Add two todos
//     await todoPage.addTodo(todo1Text);
//     await todoPage.addTodo(todo2Text);
//     await assertTodoCount(page, 2);

//     // Delete first todo
//     let todoItem = page.locator(`[role="listitem"]:has-text("${todo1Text}")`);
//     let deleteButton = todoItem.locator('button[aria-label="Delete todo"]');
//     await deleteButton.click();

//     // Wait for toast and dismiss it to test sequential undos
//     let toast = page.locator('[role="alert"]');
//     await expect(toast).toBeVisible({ timeout: 5000 });
//     const dismissButton = toast.locator('button[aria-label="Dismiss notification"]');
//     await dismissButton.click();
//     await expect(toast).not.toBeVisible({ timeout: 2000 });

//     // Delete second todo
//     todoItem = page.locator(`[role="listitem"]:has-text("${todo2Text}")`);
//     deleteButton = todoItem.locator('button[aria-label="Delete todo"]');
//     await deleteButton.click();

//     // Undo last delete (second todo)
//     toast = page.locator('[role="alert"]');
//     await expect(toast).toBeVisible({ timeout: 5000 });
//     const undoButton = toast.locator('button:has-text("Undo")');
//     await undoButton.click();

//     // Verify second todo is restored, first is still deleted
//     await assertTodoExists(page, todo2Text);
//     await assertTodoDoesNotExist(page, todo1Text);
//   });

//   test('toast positioning is responsive on mobile', async ({ page }) => {
//     // Set mobile viewport
//     const MOBILE_BOTTOM_THRESHOLD = MOBILE_VIEWPORT.height * 0.75; // Toast should be in bottom 25% of viewport
    
//     await page.setViewportSize(MOBILE_VIEWPORT);

//     const todoPage = new TodoPage(page);
//     const todoText = generateUniqueTodoText('Task to delete');

//     // Add and delete a todo
//     await todoPage.addTodo(todoText);
//     const todoItem = page.locator(`[role="listitem"]:has-text("${todoText}")`);
//     const deleteButton = todoItem.locator('button[aria-label="Delete todo"]');
//     await deleteButton.click();

//     // Wait for toast to appear
//     const toast = page.locator('[role="alert"]');
//     await expect(toast).toBeVisible({ timeout: 5000 });

//     // Verify toast is at bottom on mobile
//     const box = await toast.boundingBox();
//     expect(box).toBeTruthy();
//     if (box) {
//       // Toast should be near bottom of viewport on mobile
//       expect(box.y + box.height).toBeGreaterThan(MOBILE_BOTTOM_THRESHOLD);
//     }
//   });

//   test('toast positioning is responsive on desktop', async ({ page }) => {
//     // Set desktop viewport
//     const DESKTOP_TOP_THRESHOLD = DESKTOP_VIEWPORT.height * 0.2; // Toast should be in top 20% of viewport
//     const DESKTOP_RIGHT_THRESHOLD = DESKTOP_VIEWPORT.width * 0.7; // Toast should be in right 30% of viewport
    
//     await page.setViewportSize(DESKTOP_VIEWPORT);

//     const todoPage = new TodoPage(page);
//     const todoText = generateUniqueTodoText('Task to delete');

//     // Add and delete a todo
//     await todoPage.addTodo(todoText);
//     const todoItem = page.locator(`[role="listitem"]:has-text("${todoText}")`);
//     const deleteButton = todoItem.locator('button[aria-label="Delete todo"]');
//     await deleteButton.click();

//     // Wait for toast to appear
//     const toast = page.locator('[role="alert"]');
//     await expect(toast).toBeVisible({ timeout: 5000 });

//     // Verify toast is at top-right on desktop
//     const box = await toast.boundingBox();
//     expect(box).toBeTruthy();
//     if (box) {
//       // Toast should be near top of viewport on desktop
//       expect(box.y).toBeLessThan(DESKTOP_TOP_THRESHOLD);
//       // Toast should be on right side
//       expect(box.x).toBeGreaterThan(DESKTOP_RIGHT_THRESHOLD);
//     }
//   });
// });
