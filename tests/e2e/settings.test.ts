import { expect, test } from "../fixtures";
import { SettingsPage } from "../pages/settings";

test.describe("Personalisation Settings", () => {
  let settingsPage: SettingsPage;

  test.beforeEach(async ({ page }) => {
    settingsPage = new SettingsPage(page);
    await settingsPage.navigateToPersonalisationSettings();
  });

  test("Save button should be enabled when lock checkbox is checked", async () => {
    // Verify save button is initially enabled
    await expect(settingsPage.saveButton).toBeEnabled();

    // Check the lock checkbox
    await settingsPage.toggleLock();

    // Verify the lock checkbox is now checked
    expect(await settingsPage.isLocked()).toBe(true);

    // CRITICAL: Save button should still be enabled so user can save the lock state
    await expect(settingsPage.saveButton).toBeEnabled();
  });

  test("Form fields should be disabled when locked", async () => {
    // Initially, form fields should be enabled
    await expect(settingsPage.firstNameInput).toBeEnabled();
    await expect(settingsPage.lastNameInput).toBeEnabled();
    await expect(settingsPage.systemPromptTextarea).toBeEnabled();

    // Check the lock checkbox
    await settingsPage.toggleLock();

    // Verify form fields are now disabled
    await expect(settingsPage.firstNameInput).toBeDisabled();
    await expect(settingsPage.lastNameInput).toBeDisabled();
    await expect(settingsPage.systemPromptTextarea).toBeDisabled();
  });

  test("User can save lock state and then unlock", async () => {
    // Check the lock
    await settingsPage.toggleLock();
    expect(await settingsPage.isLocked()).toBe(true);

    // Save should be enabled
    await expect(settingsPage.saveButton).toBeEnabled();

    // Save the settings
    await settingsPage.saveSettings();

    // Wait a moment for the save to process
    await settingsPage.waitForSaveComplete();

    // Now uncheck the lock
    await settingsPage.toggleLock();
    expect(await settingsPage.isLocked()).toBe(false);

    // Save button should still be enabled
    await expect(settingsPage.saveButton).toBeEnabled();

    // Save the unlocked state
    await settingsPage.saveSettings();
    await settingsPage.waitForSaveComplete();

    // Form fields should be enabled again
    await expect(settingsPage.firstNameInput).toBeEnabled();
    await expect(settingsPage.lastNameInput).toBeEnabled();
  });
});
