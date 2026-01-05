import { Page, Locator, expect } from '@playwright/test';
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
    // Wait for the main app to load (OpenList header)
    await this.page.waitForSelector('h1:has-text("OpenList")', { timeout: 20000 });
    
    // Wait for loading to complete
    await this.page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 5000 }).catch(() => {
      // Loading spinner might not appear, that's okay
    });
    
    // Wait for FAB to be visible (indicates app is ready)
    await this.page.waitForSelector('button[aria-label="Add new todo"]', { timeout: 10000 });
  }

  // Header and user info
  async getUserEmail() {
    const emailElement = this.page.locator('p.text-sm.text-gray-500');
    return await emailElement.textContent();
  }

  async clickLogout() {
    await this.page.click('button:has-text("Logout")');
    // Wait for the login form to appear after logout
    // The app re-renders when isAuthenticated becomes false and resets to login view
    await this.page.waitForSelector('h2:has-text("Login")', { timeout: 10000 });
  }

  // Floating Action Button
  async clickAddButton() {
    // Wait for FAB to be visible first
    const fab = this.page.locator('button[aria-label="Add new todo"]');
    await fab.waitFor({ state: 'visible', timeout: 10000 });
    await fab.click();
  }

  async waitForAddTodoForm() {
    // Wait for the expanded form to appear
    // The form has an input with aria-label="Todo text"
    await this.page.waitForSelector('input[aria-label="Todo text"]', { timeout: 5000 });
  }

  async fillTodoText(text: string) {
    const input = this.page.locator('input[aria-label="Todo text"]');
    await input.waitFor({ state: 'visible' });
    await input.fill(text);
  }

  async submitTodo() {
    // Click the "Add Task" button in the expanded form
    await this.page.click('button[type="submit"]:has-text("Add Task")');
  }

  async cancelAddTodo() {
    // Click the Cancel button
    await this.page.click('button:has-text("Cancel")');
  }

  async addTodo(text: string) {
    // Ensure we're on the todo page and it's loaded
    await this.waitForTodoApp();
    
    await this.clickAddButton();
    await this.waitForAddTodoForm();
    await this.fillTodoText(text);
    await this.submitTodo();
    // Wait a bit for the todo to be added and form to close
    await this.page.waitForTimeout(500);
    
    // Wait for FAB to be visible again (form closed)
    await this.page.waitForSelector('button[aria-label="Add new todo"]', { timeout: 5000 }).catch(() => {
      // FAB might already be visible, that's okay
    });
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

  /**
   * Find the index of a todo by its text content
   * Returns -1 if not found
   */
  async findTodoIndexByText(text: string): Promise<number> {
    const todos = this.getTodoItems();
    const count = await todos.count();
    for (let i = 0; i < count; i++) {
      const todoText = await this.getTodoText(i);
      if (todoText?.includes(text)) {
        return i;
      }
    }
    return -1;
  }

  async toggleTodo(index: number) {
    const todo = this.getTodoItems().nth(index);
    // Use aria-label to target the toggle button specifically (not the reorder buttons)
    const toggleButton = todo.locator('button[aria-label*="Mark as"]');
    await toggleButton.click();
    // Wait for animation and reordering
    await this.page.waitForTimeout(500);
  }

  /**
   * Toggle a todo by its text content (useful after reordering)
   */
  async toggleTodoByText(text: string) {
    const index = await this.findTodoIndexByText(text);
    if (index === -1) {
      throw new Error(`Todo with text "${text}" not found`);
    }
    await this.toggleTodo(index);
  }

  async isTodoCompleted(index: number) {
    const todo = this.getTodoItems().nth(index);
    const textElement = todo.locator('span').first();
    const className = await textElement.getAttribute('class');
    return className?.includes('line-through') || false;
  }

  /**
   * Check if a todo is completed by its text content (useful after reordering)
   */
  async isTodoCompletedByText(text: string): Promise<boolean> {
    const index = await this.findTodoIndexByText(text);
    if (index === -1) {
      throw new Error(`Todo with text "${text}" not found`);
    }
    return await this.isTodoCompleted(index);
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

  /**
   * Update a todo by its current text content (useful after reordering)
   */
  async updateTodoByText(oldText: string, newText: string) {
    const index = await this.findTodoIndexByText(oldText);
    if (index === -1) {
      throw new Error(`Todo with text "${oldText}" not found`);
    }
    await this.updateTodo(index, newText);
  }

  /**
   * Delete a todo by its text content (useful after reordering)
   */
  async deleteTodoByText(text: string) {
    const index = await this.findTodoIndexByText(text);
    if (index === -1) {
      throw new Error(`Todo with text "${text}" not found`);
    }
    await this.deleteTodo(index);
  }

  // Empty state
  async isEmptyStateVisible() {
    return await this.page.isVisible('text=No tasks yet');
  }

  async getEmptyStateMessage() {
    const emptyState = this.page.locator('p.text-gray-500:has-text("No tasks")');
    return await emptyState.textContent();
  }

  // Sidebar and Menu
  async openSidebar() {
    // Click the burger menu button
    const burgerButton = this.page.locator('button[aria-label*="navigation menu"]');
    await burgerButton.waitFor({ state: 'visible', timeout: 5000 });
    await burgerButton.click();
    // Wait for sidebar to be visible
    await this.page.waitForSelector('[role="navigation"]', { timeout: 5000 });
  }

  async closeSidebar() {
    // Click the close button in sidebar
    const closeButton = this.page.locator('button[aria-label="Close navigation menu"]').last();
    if (await closeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeButton.click();
      // Wait for sidebar to be hidden
      await this.page.waitForTimeout(500);
    }
  }

  async isSidebarOpen() {
    const sidebar = this.page.locator('[role="navigation"]');
    if (!await sidebar.isVisible({ timeout: 1000 }).catch(() => false)) {
      return false;
    }
    // Check if sidebar has translated (not hidden by transform)
    const transform = await sidebar.evaluate((el) => 
      window.getComputedStyle(el).transform
    );
    return !transform.includes('matrix') || !transform.includes('-');
  }

  // Search
  async fillSearch(query: string) {
    // Open search modal by clicking the search button in sidebar
    // On mobile, need to open sidebar first
    const viewportWidth = this.page.viewportSize()?.width || 1920;
    if (viewportWidth < 1024) {
      const sidebarOpen = await this.isSidebarOpen();
      if (!sidebarOpen) {
        await this.openSidebar();
      }
    }

    // Click the search button to open modal
    const searchButton = this.page.locator('button[aria-label="Open search"]');
    await searchButton.waitFor({ state: 'visible', timeout: 5000 });
    await searchButton.click();
    
    // Wait for search modal to open
    await this.page.waitForTimeout(300);

    // Search input is now in the modal
    const searchInput = this.page.locator('input[aria-label="Search todos"]');
    await searchInput.waitFor({ state: 'visible', timeout: 5000 });
    await searchInput.fill(query);
    // Wait for debounce
    await this.page.waitForTimeout(500);
  }

  async clearSearch() {
    // If modal is not open, open it first
    if (!(await this.isSearchModalOpen())) {
      await this.openSearchModal();
    }

    // Clear the search input
    const searchInput = this.page.locator('input[aria-label="Search todos"]');
    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchInput.clear();
      // Wait for debounce
      await this.page.waitForTimeout(500);
    }

    // Close the modal after clearing
    await this.closeSearchModal();
  }

  async focusSearchWithKeyboard() {
    // Use Ctrl/Cmd+K to open search modal
    const isMac = process.platform === 'darwin';
    if (isMac) {
      await this.page.keyboard.press('Meta+k');
    } else {
      await this.page.keyboard.press('Control+k');
    }
    
    // Wait for modal to open
    await this.page.waitForTimeout(300);
    
    // Search input should be focused in the modal
    const searchInput = this.page.locator('input[aria-label="Search todos"]');
    const isVisible = await searchInput.isVisible({ timeout: 2000 }).catch(() => false);
    if (!isVisible) {
      throw new Error('Search modal did not open with keyboard shortcut.');
    }
  }
  
  async isSearchVisible() {
    return await this.page.isVisible('input[aria-label="Search todos"]', { timeout: 1000 }).catch(() => false);
  }

  async isSearchHighlighted(searchTerm: string) {
    const highlighted = this.page.locator(`span.bg-yellow-200:has-text("${searchTerm}")`);
    return await highlighted.isVisible();
  }

  /**
   * Check if search modal is open
   */
  async isSearchModalOpen(): Promise<boolean> {
    const modal = this.page.locator('[role="dialog"][aria-label="Search todos"]');
    return await modal.isVisible({ timeout: 1000 }).catch(() => false);
  }

  /**
   * Close the search modal
   */
  async closeSearchModal() {
    // Try clicking the close button
    const closeButton = this.page.locator('button[aria-label="Close search"]');
    if (await closeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeButton.click();
      // Wait for modal to close
      await this.page.waitForTimeout(300);
      return;
    }
    // If close button not found, try pressing Escape
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(300);
  }

  /**
   * Get todo count from search modal
   */
  async getTodoCountInModal(): Promise<number> {
    // Wait for modal to be visible
    const modal = this.page.locator('[role="dialog"][aria-label="Search todos"]');
    await modal.waitFor({ state: 'visible', timeout: 5000 });
    
    // Get todos from within the modal
    const todos = modal.locator('.group.flex.items-center.gap-3.px-4.py-3.bg-white.rounded-lg');
    return await todos.count();
  }

  /**
   * Open search modal (without filling search)
   */
  async openSearchModal() {
    const viewportWidth = this.page.viewportSize()?.width || 1920;
    if (viewportWidth < 1024) {
      const sidebarOpen = await this.isSidebarOpen();
      if (!sidebarOpen) {
        await this.openSidebar();
      }
    }

    // Click the search button to open modal
    const searchButton = this.page.locator('button[aria-label="Open search"]');
    await searchButton.waitFor({ state: 'visible', timeout: 5000 });
    await searchButton.click();
    
    // Wait for search modal to open
    await this.page.waitForSelector('[role="dialog"][aria-label="Search todos"]', { 
      state: 'visible', 
      timeout: 5000 
    });
    await this.page.waitForTimeout(300);
  }

  // Filter
  async clickFilterButton() {
    await this.page.click('button:has-text("All")');
  }

  async selectFilter(filter: 'All' | 'Active' | 'Completed') {
    // Filters are now in the sidebar - open sidebar if needed (on mobile)
    const sidebarOpen = await this.isSidebarOpen();
    if (!sidebarOpen) {
      await this.openSidebar();
    }
    
    // Map filter names to aria-labels
    const ariaLabels: Record<string, string> = {
      'All': 'Show all todos',
      'Active': 'Show active todos',
      'Completed': 'Show completed todos'
    };
    
    // Find the filter button in the sidebar by aria-label
    const filterButton = this.page.locator(`[role="navigation"] button[aria-label="${ariaLabels[filter]}"]`);
    await filterButton.waitFor({ state: 'visible', timeout: 5000 });
    await filterButton.click();
    
    // Wait for filter button to show active state (indicates filter has been applied)
    await expect(filterButton).toHaveAttribute('aria-pressed', 'true', { timeout: 5000 });
    
    // Wait for filter to apply and UI to update
    await this.page.waitForTimeout(500);
    
    // Wait for todos to be visible/updated (or empty state if no todos match)
    try {
      await this.page.waitForSelector('.group.flex.items-center.gap-3.px-4.py-3.bg-white.rounded-lg, text=No tasks yet', { 
        state: 'attached',
        timeout: 5000 
      });
    } catch {
      // If selector times out, that's okay - might be empty state or still loading
    }
  }

  // Stats
  async getCompletedCount() {
    // The stats text is in a paragraph that contains "completed"
    // Use a more specific selector to avoid matching the user email (which comes first)
    // The stats paragraph is the one that contains "completed" text
    const statsText = await this.page.locator('p.text-sm.text-gray-500:has-text("completed"), p.text-base.text-gray-500:has-text("completed")').first().textContent();
    const match = statsText?.match(/(\d+) of (\d+) completed/);
    return match ? parseInt(match[1]) : 0;
  }

  async getTotalCount() {
    // The stats text is in a paragraph that contains "completed"
    // Use a more specific selector to avoid matching the user email (which comes first)
    // The stats paragraph is the one that contains "completed" text
    const statsText = await this.page.locator('p.text-sm.text-gray-500:has-text("completed"), p.text-base.text-gray-500:has-text("completed")').first().textContent();
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
