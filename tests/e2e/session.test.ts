import { expect, test } from "../fixtures";
import { generateRandomTestUser } from "../helpers";
import { AuthPage } from "../pages/auth";

test.describe
  .serial("Authentication with Clerk", () => {
    let _authPage: AuthPage;
    const _testUser = generateRandomTestUser();

    test.beforeEach(({ page }) => {
      _authPage = new AuthPage(page);
    });

    test("Unauthenticated users are redirected to login", async ({ page }) => {
      await page.goto("/");
      await page.waitForURL("/login");
      await expect(page).toHaveURL("/login");
    });

    test("Login page is accessible", async ({ page }) => {
      await page.goto("/login");
      await page.waitForURL("/login");
      await expect(page).toHaveURL("/login");
    });

    test("Register page is accessible", async ({ page }) => {
      await page.goto("/register");
      await page.waitForURL("/register");
      await expect(page).toHaveURL("/register");
    });

    test("Authenticated users can access protected routes", async ({
      adaContext,
    }) => {
      const response = await adaContext.page.goto("/");

      if (!response) {
        throw new Error("Failed to load page");
      }

      // Should not redirect when authenticated
      await expect(adaContext.page).toHaveURL("/");
      await expect(
        adaContext.page.getByPlaceholder("Send a message...")
      ).toBeVisible();
    });

    test("Sign out button is available for authenticated users", async ({
      adaContext,
    }) => {
      await adaContext.page.goto("/");

      const sidebarToggleButton = adaContext.page.getByTestId(
        "sidebar-toggle-button"
      );
      await sidebarToggleButton.click();

      const userNavButton = adaContext.page.getByTestId("user-nav-button");
      await expect(userNavButton).toBeVisible();

      await userNavButton.click();
      const userNavMenu = adaContext.page.getByTestId("user-nav-menu");
      await expect(userNavMenu).toBeVisible();

      const authMenuItem = adaContext.page.getByTestId("user-nav-item-auth");
      await expect(authMenuItem).toContainText("Sign out");
    });

    test("Authenticated users cannot access login page", async ({
      adaContext,
    }) => {
      await adaContext.page.goto("/login");
      // Clerk redirects authenticated users away from login
      await expect(adaContext.page).not.toHaveURL("/login");
    });

    test("Authenticated users cannot access register page", async ({
      adaContext,
    }) => {
      await adaContext.page.goto("/register");
      // Clerk redirects authenticated users away from register
      await expect(adaContext.page).not.toHaveURL("/register");
    });
  });
