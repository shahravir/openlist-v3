import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class RegisterPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await super.goto('/');
    // If login form is shown, switch to register
    const isLoginVisible = await this.page.isVisible('h2:has-text("Login")');
    if (isLoginVisible) {
      await this.page.click('button:has-text("Don\'t have an account? Register")');
    }
    await this.waitForRegisterForm();
  }

  async waitForRegisterForm() {
    await this.page.waitForSelector('h2:has-text("Register")', { timeout: 10000 });
  }

  async fillEmail(email: string) {
    await this.page.fill('#email', email);
  }

  async fillPassword(password: string) {
    await this.page.fill('#password', password);
  }

  async fillConfirmPassword(confirmPassword: string) {
    await this.page.fill('#confirmPassword', confirmPassword);
  }

  async clickRegisterButton() {
    // Click the register button
    await this.page.click('button[type="submit"]:has-text("Register")');
    
    // Wait for either success (navigation) or error message
    try {
      // Wait for network request to complete (success case)
      await this.page.waitForResponse(
        (resp) => resp.url().includes('/auth/register') && (resp.status() === 200 || resp.status() === 201),
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

  async register(email: string, password: string, confirmPassword?: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.fillConfirmPassword(confirmPassword || password);
    await this.clickRegisterButton();
  }

  async clickSwitchToLogin() {
    await this.page.click('button:has-text("Already have an account? Login")');
  }

  async getErrorMessage() {
    const errorElement = this.page.locator('.bg-red-50');
    if (await errorElement.isVisible()) {
      return await errorElement.textContent();
    }
    return null;
  }

  async isRegisterFormVisible() {
    return await this.page.isVisible('h2:has-text("Register")');
  }

  async waitForNavigation() {
    // Wait for either the app to load OR an error message
    // This handles both success and failure cases
    
    try {
      // First, check if we're still on the register form (error case)
      const stillOnRegister = await this.page.isVisible('h2:has-text("Register")', { timeout: 2000 }).catch(() => false);
      if (stillOnRegister) {
        // Check for error message
        const error = await this.getErrorMessage();
        if (error) {
          // Registration failed - this is expected in some test cases
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
      console.log('Page contains Register form:', pageContent.includes('Register'));
      console.log('Page contains Login form:', pageContent.includes('Login'));
      console.log('Page contains OpenList:', pageContent.includes('OpenList'));
      
      throw error;
    }
  }
}
