import type { Page } from "@playwright/test";

export class SettingsPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  get lockCheckbox() {
    return this.page.locator('input[type="checkbox"]').first();
  }

  get saveButton() {
    return this.page.getByRole("button", { name: /save changes/i });
  }

  get firstNameInput() {
    return this.page.locator("#firstName");
  }

  get lastNameInput() {
    return this.page.locator("#lastName");
  }

  get systemPromptTextarea() {
    return this.page.locator("#systemPrompt");
  }

  async navigateToPersonalisationSettings() {
    await this.page.goto("/settings/personalisation");
  }

  async toggleLock() {
    await this.lockCheckbox.click();
  }

  async isLocked() {
    return this.lockCheckbox.isChecked();
  }

  async saveSettings() {
    await this.saveButton.click();
  }

  async waitForSaveComplete() {
    // Wait for the "Saving..." text to appear and then disappear
    await this.page.waitForTimeout(500);
  }
}
