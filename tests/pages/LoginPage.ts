import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await super.goto('/');
    await this.waitForLoginForm();
  }

  async waitForLoginForm() {
    await this.page.waitForSelector('h2:has-text("Login")', { timeout: 10000 });
  }

  async fillEmail(email: string) {
    await this.page.fill('#email', email);
  }

  async fillPassword(password: string) {
    await this.page.fill('#password', password);
  }

  async clickLoginButton() {
    // Click the login button
    await this.page.click('button[type="submit"]:has-text("Login")');
    
    // Wait for either success (navigation) or error message
    try {
      // Wait for network request to complete (success case)
      await this.page.waitForResponse(
        (resp) => resp.url().includes('/auth/login') && resp.status() === 200,
        { timeout: 10000 }
      );
    } catch (error) {
      // If network request fails or times out, check for error message
      await this.page.waitForTimeout(1000); // Wait for error to appear
      const errorMessage = await this.getErrorMessage();
      if (errorMessage) {
        // If there's an error message, that's expected - don't throw
        // The test will handle checking for errors
        return;
      }
      // If no error message and no response, might be offline or backend not running
      // Continue and let waitForNavigation handle it
    }
  }

  async login(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.clickLoginButton();
  }

  async clickSwitchToRegister() {
    await this.page.click('button:has-text("Don\'t have an account? Register")');
  }

  async getErrorMessage() {
    const errorElement = this.page.locator('.bg-red-50');
    if (await errorElement.isVisible()) {
      return await errorElement.textContent();
    }
    return null;
  }

  async isLoginFormVisible() {
    return await this.page.isVisible('h2:has-text("Login")');
  }

  async isLoadingButtonVisible() {
    return await this.page.isVisible('button:has-text("Logging in...")');
  }

  async waitForNavigation() {
    // Wait for either the app to load OR stay on login form (error case)
    
    try {
      // First, check if we're still on the login form (error case)
      const stillOnLogin = await this.page.isVisible('h2:has-text("Login")', { timeout: 2000 }).catch(() => false);
      if (stillOnLogin) {
        // Check for error message
        const error = await this.getErrorMessage();
        if (error) {
          // Login failed - this is expected in some test cases
          return;
        }
      }
      
      // Wait for loading state to complete first (if it appears)
      await this.page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 5000 }).catch(() => {
        // If loading spinner doesn't appear, that's okay - continue
      });
      
      // Wait for the main app to load (OpenList header)
      // This appears after loading completes
      await this.page.waitForSelector('h1:has-text("OpenList")', { timeout: 20000 });
      
      // Additional wait to ensure page is fully loaded
      await this.page.waitForLoadState('domcontentloaded');
    } catch (error) {
      // If we can't find the OpenList header, check what's on the page
      const currentUrl = this.page.url();
      const pageContent = await this.page.content();
      
      // Log helpful debug info
      console.log('Navigation wait failed. Current URL:', currentUrl);
      console.log('Page contains Login form:', pageContent.includes('Login'));
      console.log('Page contains OpenList:', pageContent.includes('OpenList'));
      
      throw error;
    }
  }
}
