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
    await this.page.click('button[type="submit"]:has-text("Login")');
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
    // Wait for the main app to load (OpenList header)
    await this.page.waitForSelector('h1:has-text("OpenList")', { timeout: 10000 });
  }
}
