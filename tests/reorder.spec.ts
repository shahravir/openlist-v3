import { test, expect } from '@playwright/test';
import { TodoPage } from './pages/TodoPage';
import { createTestUser } from './fixtures/test-user';
import { generateUniqueTodoText } from './fixtures/test-data';
import {
  setupAuthenticatedSession,
  clearLocalStorage,
} from './utils/helpers';

// test.describe('Todo Reordering', () => {
//   test.beforeEach(async ({ page }) => {
//     // Setup authenticated session for each test
//     await clearLocalStorage(page);
//     const testUser = createTestUser();
//     await setupAuthenticatedSession(page, testUser);
//   });

//   test('user can reorder todos using drag and drop', async ({ page }) => {
//     const todoPage = new TodoPage(page);
    
//     // Create three todos
//     const todo1 = generateUniqueTodoText('First task');
//     const todo2 = generateUniqueTodoText('Second task');
//     const todo3 = generateUniqueTodoText('Third task');
    
//     await todoPage.addTodo(todo1);
//     await page.locator('[role="listitem"]').first().waitFor({ state: 'visible' });
    
//     await todoPage.addTodo(todo2);
//     await page.locator('[role="listitem"]').nth(1).waitFor({ state: 'visible' });
    
//     await todoPage.addTodo(todo3);
//     await page.locator('[role="listitem"]').nth(2).waitFor({ state: 'visible' });

//     // Get initial order
//     const initialTodos = await page.locator('[role="listitem"]').allTextContents();
    
//     // Drag the first todo (index 0) to the third position (index 2)
//     const dragHandle = page.locator('[role="listitem"]').first().locator('[aria-label="Drag handle to reorder"]');
//     const targetItem = page.locator('[role="listitem"]').nth(2);
    
//     await dragHandle.hover();
//     await page.mouse.down();
//     await targetItem.hover();
//     await page.mouse.up();
    
//     // Wait for the reorder animation to complete
//     await page.waitForLoadState('networkidle');
    
//     // Get new order
//     const reorderedTodos = await page.locator('[role="listitem"]').allTextContents();
    
//     // Verify order has changed
//     expect(reorderedTodos).not.toEqual(initialTodos);
//   });

//   test('user can reorder todos using up button', async ({ page }) => {
//     const todoPage = new TodoPage(page);
    
//     // Create three todos
//     const todo1 = generateUniqueTodoText('First task');
//     const todo2 = generateUniqueTodoText('Second task');
//     const todo3 = generateUniqueTodoText('Third task');
    
//     await todoPage.addTodo(todo1);
//     await page.locator('[role="listitem"]').first().waitFor({ state: 'visible' });
    
//     await todoPage.addTodo(todo2);
//     await page.locator('[role="listitem"]').nth(1).waitFor({ state: 'visible' });
    
//     await todoPage.addTodo(todo3);
//     await page.locator('[role="listitem"]').nth(2).waitFor({ state: 'visible' });

//     // Get text of second item
//     const secondItemText = await page.locator('[role="listitem"]').nth(1).textContent();
    
//     // Click up button on the second item to move it up
//     const upButton = page.locator('[role="listitem"]').nth(1).locator('button[aria-label*="Move"][aria-label*="up"]');
//     await upButton.click();
    
//     // Wait for the reorder to complete
//     await page.waitForLoadState('networkidle');
    
//     // Verify the second item is now first
//     const firstItemText = await page.locator('[role="listitem"]').first().textContent();
//     expect(firstItemText).toContain(secondItemText || '');
//   });

//   test('user can reorder todos using down button', async ({ page }) => {
//     const todoPage = new TodoPage(page);
    
//     // Create three todos
//     const todo1 = generateUniqueTodoText('First task');
//     const todo2 = generateUniqueTodoText('Second task');
//     const todo3 = generateUniqueTodoText('Third task');
    
//     await todoPage.addTodo(todo1);
//     await page.locator('[role="listitem"]').first().waitFor({ state: 'visible' });
    
//     await todoPage.addTodo(todo2);
//     await page.locator('[role="listitem"]').nth(1).waitFor({ state: 'visible' });
    
//     await todoPage.addTodo(todo3);
//     await page.locator('[role="listitem"]').nth(2).waitFor({ state: 'visible' });

//     // Get text of first item
//     const firstItemText = await page.locator('[role="listitem"]').first().textContent();
    
//     // Click down button on the first item to move it down
//     const downButton = page.locator('[role="listitem"]').first().locator('button[aria-label*="Move"][aria-label*="down"]');
//     await downButton.click();
    
//     // Wait for the reorder to complete
//     await page.waitForLoadState('networkidle');
    
//     // Verify the first item is now second
//     const secondItemText = await page.locator('[role="listitem"]').nth(1).textContent();
//     expect(secondItemText).toContain(firstItemText || '');
//   });

//   test('order persists after page refresh', async ({ page }) => {
//     const todoPage = new TodoPage(page);
    
//     // Create three todos
//     const todo1 = generateUniqueTodoText('First task');
//     const todo2 = generateUniqueTodoText('Second task');
//     const todo3 = generateUniqueTodoText('Third task');
    
//     await todoPage.addTodo(todo1);
//     await page.locator('[role="listitem"]').first().waitFor({ state: 'visible' });
    
//     await todoPage.addTodo(todo2);
//     await page.locator('[role="listitem"]').nth(1).waitFor({ state: 'visible' });
    
//     await todoPage.addTodo(todo3);
//     await page.locator('[role="listitem"]').nth(2).waitFor({ state: 'visible' });

//     // Move second item up
//     const upButton = page.locator('[role="listitem"]').nth(1).locator('button[aria-label*="Move"][aria-label*="up"]');
//     await upButton.click();
//     await page.waitForLoadState('networkidle');
    
//     // Get order after reordering
//     const orderAfterReorder = await page.locator('[role="listitem"]').allTextContents();
    
//     // Refresh the page
//     await page.reload();
//     await page.locator('[role="listitem"]').first().waitFor({ state: 'visible' });
    
//     // Get order after refresh
//     const orderAfterRefresh = await page.locator('[role="listitem"]').allTextContents();
    
//     // Verify order is preserved
//     expect(orderAfterRefresh).toEqual(orderAfterReorder);
//   });

//   test('up button is disabled on first item', async ({ page }) => {
//     const todoPage = new TodoPage(page);
    
//     // Create two todos
//     const todo1 = generateUniqueTodoText('First task');
//     const todo2 = generateUniqueTodoText('Second task');
    
//     await todoPage.addTodo(todo1);
//     await page.locator('[role="listitem"]').first().waitFor({ state: 'visible' });
    
//     await todoPage.addTodo(todo2);
//     await page.locator('[role="listitem"]').nth(1).waitFor({ state: 'visible' });

//     // Check that up button on first item is disabled
//     const firstUpButton = page.locator('[role="listitem"]').first().locator('button[aria-label*="Move"][aria-label*="up"]');
//     await expect(firstUpButton).toHaveAttribute('aria-disabled', 'true');
//   });

//   test('down button is disabled on last item', async ({ page }) => {
//     const todoPage = new TodoPage(page);
    
//     // Create two todos
//     const todo1 = generateUniqueTodoText('First task');
//     const todo2 = generateUniqueTodoText('Second task');
    
//     await todoPage.addTodo(todo1);
//     await page.locator('[role="listitem"]').first().waitFor({ state: 'visible' });
    
//     await todoPage.addTodo(todo2);
//     await page.locator('[role="listitem"]').nth(1).waitFor({ state: 'visible' });

//     // Check that down button on last item is disabled
//     const lastDownButton = page.locator('[role="listitem"]').last().locator('button[aria-label*="Move"][aria-label*="down"]');
//     await expect(lastDownButton).toHaveAttribute('aria-disabled', 'true');
//   });
// });
