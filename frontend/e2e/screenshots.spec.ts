import { test } from "@playwright/test";
import { mockAllApiRoutes } from "./fixtures";

const SHOT_DIR = "../docs/screenshots";

test.beforeEach(async ({ page }) => {
  await mockAllApiRoutes(page);
  await page.setViewportSize({ width: 1440, height: 900 });
});

test("capture all app screenshots", async ({ page }) => {
  // 1. Issue List (default view)
  await page.goto("/");
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${SHOT_DIR}/01-issue-list.png`, fullPage: false });

  // 2. Issue Detail Panel
  await page.getByRole("row", { name: /PROJ-1/ }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SHOT_DIR}/02-issue-detail.png`, fullPage: false });
  await page.keyboard.press("Escape");

  // 3. Sidebar Navigation
  await page.getByLabel("Toggle sidebar").click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SHOT_DIR}/03-sidebar.png`, fullPage: false });

  // 4. Dashboard
  const sidebar = page.locator("aside[aria-label='Sidebar navigation']").last();
  await sidebar.getByRole("button", { name: /^.?\s*Dashboard$/ }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${SHOT_DIR}/04-dashboard.png`, fullPage: false });

  // 5. Command Palette
  await page.getByLabel("Open command palette").click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SHOT_DIR}/05-command-palette-empty.png`, fullPage: false });
  await page.getByLabel("Search issues").fill("login");
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${SHOT_DIR}/06-command-palette-results.png`, fullPage: false });
  await page.keyboard.press("Escape");

  // 6. Create Issue Modal
  await page.getByLabel("Create issue").click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SHOT_DIR}/07-create-issue.png`, fullPage: false });
  await page.keyboard.press("Escape");

  // 7. Light Mode
  const themeBtn = page.locator("button[title='Light mode'], button[title='Dark mode']");
  await themeBtn.click();
  await page.waitForTimeout(500);
  // Go back to list view
  await page.getByLabel("Toggle sidebar").click();
  await sidebar.getByRole("button", { name: /List/ }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${SHOT_DIR}/08-light-mode.png`, fullPage: false });
  // Switch back to dark
  await themeBtn.click();
  await page.waitForTimeout(500);

  // 8. Keyboard Shortcuts
  await page.locator("body").click();
  await page.keyboard.press("?");
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SHOT_DIR}/09-keyboard-shortcuts.png`, fullPage: false });
  await page.keyboard.press("Escape");

  // 9. About Page
  await page.getByLabel("Toggle sidebar").click();
  await page.waitForTimeout(300);
  await page.locator("aside[aria-label='Sidebar navigation']").last().getByText("About").click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${SHOT_DIR}/10-about-page.png`, fullPage: true });

  // 10. Mobile view
  await page.setViewportSize({ width: 375, height: 812 });
  await page.getByLabel("Toggle sidebar").click();
  await page.waitForTimeout(300);
  await page.locator("aside[aria-label='Sidebar navigation']").last().getByRole("button", { name: /List/ }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${SHOT_DIR}/11-mobile-list.png`, fullPage: false });

  // 11. Mobile detail
  await page.getByRole("row", { name: /PROJ-1/ }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SHOT_DIR}/12-mobile-detail.png`, fullPage: false });
});
