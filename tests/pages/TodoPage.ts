import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class TodoPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await super.goto('/');
    await this.waitForTodoApp();
  }

  async waitForTodoApp() {
    await this.page.waitForSelector('h1:has-text("OpenList")', { timeout: 10000 });
  }

  // Header and user info
  async getUserEmail() {
    const emailElement = this.page.locator('p.text-sm.text-gray-500');
    return await emailElement.textContent();
  }

  async clickLogout() {
    await this.page.click('button:has-text("Logout")');
  }

  // Floating Action Button
  async clickAddButton() {
    await this.page.click('button[aria-label="Add new todo"]');
  }

  async waitForAddTodoForm() {
    // Wait for the expanded form to appear
    await this.page.waitForSelector('textarea', { timeout: 5000 });
  }

  async fillTodoText(text: string) {
    await this.page.fill('textarea', text);
  }

  async submitTodo() {
    // Click the checkmark button in the expanded form
    await this.page.click('button[aria-label="Add todo"]');
  }

  async cancelAddTodo() {
    await this.page.click('button[aria-label="Cancel"]');
  }

  async addTodo(text: string) {
    await this.clickAddButton();
    await this.waitForAddTodoForm();
    await this.fillTodoText(text);
    await this.submitTodo();
    // Wait a bit for the todo to be added
    await this.page.waitForTimeout(500);
  }

  // Todo items
  getTodoItems(): Locator {
    return this.page.locator('.group.flex.items-center.gap-3.px-4.py-3.bg-white.rounded-lg');
  }

  async getTodoCount() {
    return await this.getTodoItems().count();
  }

  async getTodoText(index: number) {
    const todo = this.getTodoItems().nth(index);
    const textElement = todo.locator('span').first();
    return await textElement.textContent();
  }

  async toggleTodo(index: number) {
    const todo = this.getTodoItems().nth(index);
    const toggleButton = todo.locator('button').first();
    await toggleButton.click();
    // Wait for animation
    await this.page.waitForTimeout(300);
  }

  async isTodoCompleted(index: number) {
    const todo = this.getTodoItems().nth(index);
    const textElement = todo.locator('span').first();
    const className = await textElement.getAttribute('class');
    return className?.includes('line-through') || false;
  }

  async deleteTodo(index: number) {
    const todo = this.getTodoItems().nth(index);
    // Hover to show delete button on desktop
    await todo.hover();
    // Click the last button (delete button)
    const deleteButton = todo.locator('button[aria-label="Delete todo"]');
    await deleteButton.click();
    // Wait for animation
    await this.page.waitForTimeout(300);
  }

  async startEditTodo(index: number) {
    const todo = this.getTodoItems().nth(index);
    // Hover to show edit button
    await todo.hover();
    const editButton = todo.locator('button[aria-label="Edit todo"]');
    await editButton.click();
  }

  async doubleClickToEdit(index: number) {
    const todo = this.getTodoItems().nth(index);
    const textElement = todo.locator('span').first();
    await textElement.dblclick();
  }

  async editTodoText(newText: string) {
    // Find the input in edit mode
    const editInput = this.page.locator('input[aria-label="Edit todo text"]');
    await editInput.fill(newText);
  }

  async saveEdit() {
    await this.page.click('button[aria-label="Save changes"]');
    await this.page.waitForTimeout(300);
  }

  async cancelEdit() {
    await this.page.click('button[aria-label="Cancel editing"]');
  }

  async updateTodo(index: number, newText: string) {
    await this.startEditTodo(index);
    await this.editTodoText(newText);
    await this.saveEdit();
  }

  // Empty state
  async isEmptyStateVisible() {
    return await this.page.isVisible('text=No tasks yet');
  }

  async getEmptyStateMessage() {
    const emptyState = this.page.locator('p.text-gray-500:has-text("No tasks")');
    return await emptyState.textContent();
  }

  // Search
  async fillSearch(query: string) {
    await this.page.fill('input[aria-label="Search todos"]', query);
    // Wait for debounce
    await this.page.waitForTimeout(500);
  }

  async clearSearch() {
    const clearButton = this.page.locator('button[aria-label="Clear search"]');
    if (await clearButton.isVisible()) {
      await clearButton.click();
    }
  }

  async focusSearchWithKeyboard() {
    // Press Ctrl/Cmd+K
    const isMac = process.platform === 'darwin';
    if (isMac) {
      await this.page.keyboard.press('Meta+k');
    } else {
      await this.page.keyboard.press('Control+k');
    }
  }

  async isSearchHighlighted(searchTerm: string) {
    const highlighted = this.page.locator(`span.bg-yellow-200:has-text("${searchTerm}")`);
    return await highlighted.isVisible();
  }

  // Filter
  async clickFilterButton() {
    await this.page.click('button:has-text("All")');
  }

  async selectFilter(filter: 'All' | 'Active' | 'Completed') {
    await this.page.click(`button:has-text("${filter}")`);
    await this.page.waitForTimeout(300);
  }

  // Stats
  async getCompletedCount() {
    const statsText = await this.page.locator('p.text-sm.text-gray-500').first().textContent();
    const match = statsText?.match(/(\d+) of (\d+) completed/);
    return match ? parseInt(match[1]) : 0;
  }

  async getTotalCount() {
    const statsText = await this.page.locator('p.text-sm.text-gray-500').first().textContent();
    const match = statsText?.match(/(\d+) of (\d+) completed/);
    return match ? parseInt(match[2]) : 0;
  }

  // Sync status
  async getSyncStatus() {
    const syncStatusElement = this.page.locator('.text-xs').first();
    if (await syncStatusElement.isVisible()) {
      return await syncStatusElement.textContent();
    }
    return null;
  }

  async waitForSync(timeout: number = 5000) {
    // Wait for "Synced" status
    await this.page.waitForSelector('text=Synced', { timeout });
  }

  async isSyncStatusVisible() {
    return await this.page.isVisible('.text-xs');
  }

  // Viewport and responsive
  async setViewportSize(width: number, height: number) {
    await this.page.setViewportSize({ width, height });
  }
}
