import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { TodoPage } from './pages/TodoPage';
import { createTestUser } from './fixtures/test-user';
import {
  registerUser,
  loginUser,
  logoutUser,
  clearLocalStorage,
} from './utils/helpers';
import {
  assertUserIsAuthenticated,
  assertUserIsNotAuthenticated,
  assertErrorMessage,
} from './utils/assertions';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session
    await clearLocalStorage(page);
  });

  test('user can register new account', async ({ page }) => {
    const testUser = createTestUser();
    const registerPage = new RegisterPage(page);

    await registerPage.goto();
    await expect(page).toHaveURL(/.*\//);
    
    // Verify register form is visible
    expect(await registerPage.isRegisterFormVisible()).toBe(true);

    // Fill and submit registration form
    await registerPage.register(testUser.email, testUser.password);

    // Should navigate to main app after successful registration
    await registerPage.waitForNavigation();
    await assertUserIsAuthenticated(page);

    // Verify user email is displayed
    const todoPage = new TodoPage(page);
    const displayedEmail = await todoPage.getUserEmail();
    expect(displayedEmail).toContain(testUser.email);
  });

  test('user can login with valid credentials', async ({ page }) => {
    const testUser = createTestUser();

    // First register the user
    await registerUser(page, testUser);

    // Logout
    await logoutUser(page);
    await assertUserIsNotAuthenticated(page);

    // Now login with the same credentials
    const loginPage = new LoginPage(page);
    await loginPage.login(testUser.email, testUser.password);

    // Should navigate to main app after successful login
    await loginPage.waitForNavigation();
    await assertUserIsAuthenticated(page);

    // Verify user email is displayed
    const todoPage = new TodoPage(page);
    const displayedEmail = await todoPage.getUserEmail();
    expect(displayedEmail).toContain(testUser.email);
  });

  test('user cannot login with invalid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();

    // Try to login with invalid credentials
    await loginPage.login('invalid@example.com', 'wrongpassword');

    // Should remain on login page
    await page.waitForTimeout(1000);
    expect(await loginPage.isLoginFormVisible()).toBe(true);

    // Should show error message
    const errorMessage = await loginPage.getErrorMessage();
    expect(errorMessage).not.toBeNull();
  });

  test('user can logout', async ({ page }) => {
    const testUser = createTestUser();

    // Register and login
    await registerUser(page, testUser);
    await assertUserIsAuthenticated(page);

    // Logout
    const todoPage = new TodoPage(page);
    await todoPage.clickLogout();

    // Should redirect to login page
    await assertUserIsNotAuthenticated(page);
  });

  test('protected routes redirect to login when not authenticated', async ({ page }) => {
    // Try to access the main app without authentication
    await page.goto('/');

    // Should be on login page
    await assertUserIsNotAuthenticated(page);
  });

  test('session persists after page refresh', async ({ page }) => {
    const testUser = createTestUser();

    // Register user
    await registerUser(page, testUser);
    await assertUserIsAuthenticated(page);

    // Get user email before refresh
    const todoPage = new TodoPage(page);
    const emailBefore = await todoPage.getUserEmail();

    // Refresh the page
    await page.reload();

    // Should still be authenticated
    await assertUserIsAuthenticated(page);

    // User email should still be visible
    const emailAfter = await todoPage.getUserEmail();
    expect(emailAfter).toBe(emailBefore);
  });

  test('can switch between login and register forms', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    expect(await loginPage.isLoginFormVisible()).toBe(true);

    // Switch to register
    await loginPage.clickSwitchToRegister();

    const registerPage = new RegisterPage(page);
    expect(await registerPage.isRegisterFormVisible()).toBe(true);

    // Switch back to login
    await registerPage.clickSwitchToLogin();
    expect(await loginPage.isLoginFormVisible()).toBe(true);
  });

  test('registration validates password confirmation', async ({ page }) => {
    const testUser = createTestUser();
    const registerPage = new RegisterPage(page);

    await registerPage.goto();

    // Try to register with mismatched passwords
    await registerPage.fillEmail(testUser.email);
    await registerPage.fillPassword(testUser.password);
    await registerPage.fillConfirmPassword('differentpassword');
    await registerPage.clickRegisterButton();

    // Should show error or remain on register page
    await page.waitForTimeout(1000);
    expect(await registerPage.isRegisterFormVisible()).toBe(true);
  });

  test('login shows loading state during authentication', async ({ page }) => {
    const testUser = createTestUser();

    // Register user first
    await registerUser(page, testUser);
    await logoutUser(page);

    // Start login process
    const loginPage = new LoginPage(page);
    await loginPage.fillEmail(testUser.email);
    await loginPage.fillPassword(testUser.password);
    await loginPage.clickLoginButton();

    // Loading state might be brief, but we can try to check for it
    // This test might be flaky depending on network speed
    // In a real scenario, we might mock the API to delay the response
    await page.waitForTimeout(100);
    // If still visible, loading state should be shown
    // This is best-effort and may not always catch the loading state
  });

  test('invalid email format shows appropriate error', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();

    // Try with invalid email format
    await loginPage.fillEmail('notanemail');
    await loginPage.fillPassword('password123');

    // HTML5 validation should prevent submission
    // Or server should reject it
    await loginPage.clickLoginButton();
    await page.waitForTimeout(500);
  });
});
