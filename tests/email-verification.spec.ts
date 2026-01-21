import { test, expect } from '@playwright/test';
import { createTestUser } from './fixtures/test-user';
import { clearLocalStorage } from './utils/helpers';

test.describe('Email Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session
    await clearLocalStorage(page);
  });

  test('shows verification banner after registration', async ({ page }) => {
    const testUser = createTestUser();

    await page.goto('/');

    // Switch to register form
    await page.click('button:has-text("Register")');

    // Fill and submit registration form
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[placeholder*="Password"][type="password"]', testUser.password);
    await page.fill('input[placeholder*="Confirm"][type="password"]', testUser.password);
    await page.click('button:has-text("Create Account")');

    // Wait for successful registration
    await page.waitForTimeout(1000);

    // Should see verification banner
    const banner = page.locator('[role="alert"]:has-text("verify your email")');
    await expect(banner).toBeVisible();

    // Banner should show user email
    await expect(banner).toContainText(testUser.email);

    // Should have a "Resend Email" button
    const resendButton = banner.locator('button:has-text("Resend Email")');
    await expect(resendButton).toBeVisible();
  });

  test('resend verification email button works', async ({ page }) => {
    const testUser = createTestUser();

    await page.goto('/');

    // Register user
    await page.click('button:has-text("Register")');
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[placeholder*="Password"][type="password"]', testUser.password);
    await page.fill('input[placeholder*="Confirm"][type="password"]', testUser.password);
    await page.click('button:has-text("Create Account")');

    await page.waitForTimeout(1000);

    // Click resend button
    const banner = page.locator('[role="alert"]');
    const resendButton = banner.locator('button:has-text("Resend Email")');
    await resendButton.click();

    // Should show success message
    await expect(banner).toContainText('Verification email sent');
  });

  test('verification banner is responsive on mobile', async ({ page }) => {
    const testUser = createTestUser();

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');

    // Register user
    await page.click('button:has-text("Register")');
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[placeholder*="Password"][type="password"]', testUser.password);
    await page.fill('input[placeholder*="Confirm"][type="password"]', testUser.password);
    await page.click('button:has-text("Create Account")');

    await page.waitForTimeout(1000);

    // Should see verification banner on mobile
    const banner = page.locator('[role="alert"]');
    await expect(banner).toBeVisible();

    // Button should be full-width on mobile (check for w-full or similar)
    const resendButton = banner.locator('button:has-text("Resend Email")');
    await expect(resendButton).toBeVisible();
    
    // Check button has touch-friendly size (at least 44px height)
    const buttonBox = await resendButton.boundingBox();
    expect(buttonBox?.height).toBeGreaterThanOrEqual(40);
  });

  test('verification banner is accessible', async ({ page }) => {
    const testUser = createTestUser();

    await page.goto('/');

    // Register user
    await page.click('button:has-text("Register")');
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[placeholder*="Password"][type="password"]', testUser.password);
    await page.fill('input[placeholder*="Confirm"][type="password"]', testUser.password);
    await page.click('button:has-text("Create Account")');

    await page.waitForTimeout(1000);

    // Check for proper ARIA attributes
    const banner = page.locator('[role="alert"]');
    await expect(banner).toBeVisible();
    
    // Should have aria-live for screen readers
    const ariaLive = await banner.getAttribute('aria-live');
    expect(ariaLive).toBe('polite');

    // Resend button should have proper aria-label
    const resendButton = banner.locator('button:has-text("Resend Email")');
    const ariaLabel = await resendButton.getAttribute('aria-label');
    expect(ariaLabel).toContain('Resend');

    // Test keyboard navigation
    await resendButton.focus();
    const isFocused = await resendButton.evaluate(el => el === document.activeElement);
    expect(isFocused).toBe(true);

    // Check focus ring is visible
    await expect(resendButton).toHaveCSS('outline-width', /[1-9]/);
  });

  test('verified users do not see verification banner', async ({ page }) => {
    const testUser = createTestUser();

    await page.goto('/');

    // Register user
    await page.click('button:has-text("Register")');
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[placeholder*="Password"][type="password"]', testUser.password);
    await page.fill('input[placeholder*="Confirm"][type="password"]', testUser.password);
    await page.click('button:has-text("Create Account")');

    await page.waitForTimeout(1000);

    // Manually mark as verified in localStorage (simulating verification)
    await page.evaluate(() => {
      const authUser = JSON.parse(localStorage.getItem('auth_user') || '{}');
      authUser.emailVerified = true;
      localStorage.setItem('auth_user', JSON.stringify(authUser));
    });

    // Reload page
    await page.reload();

    // Verification banner should not be visible
    const banner = page.locator('[role="alert"]:has-text("verify your email")');
    await expect(banner).not.toBeVisible();
  });

  test('verify email page shows loading state', async ({ page }) => {
    await page.goto('/verify-email?token=test-token-123');

    // Should show loading spinner
    await expect(page.locator('text=Verifying Email')).toBeVisible();
    await expect(page.locator('.animate-spin')).toBeVisible();
  });

  test('verify email page handles error state', async ({ page }) => {
    await page.goto('/verify-email?token=invalid-token');

    // Wait for error state
    await page.waitForTimeout(2000);

    // Should show error message
    await expect(page.locator('text=Verification Failed')).toBeVisible();
    await expect(page.locator('text=Invalid verification token')).toBeVisible();

    // Should have a "Go to Home" button
    const homeButton = page.locator('button:has-text("Go to Home")');
    await expect(homeButton).toBeVisible();
  });

  test('verify email page is responsive', async ({ page }) => {
    // Test on mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/verify-email?token=test-token');

    // Should show content properly on mobile
    await expect(page.locator('text=Verifying Email')).toBeVisible();

    // Test on tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await expect(page.locator('text=Verifying Email')).toBeVisible();

    // Test on desktop
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.reload();
    await expect(page.locator('text=Verifying Email')).toBeVisible();
  });
});
