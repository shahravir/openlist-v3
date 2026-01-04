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
    await this.page.click('button[type="submit"]:has-text("Register")');
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
    // Wait for the main app to load (OpenList header)
    await this.page.waitForSelector('h1:has-text("OpenList")', { timeout: 10000 });
  }
}
