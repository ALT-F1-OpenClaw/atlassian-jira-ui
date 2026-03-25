import { test } from "@playwright/test";
import { mockAllApiRoutes } from "./fixtures";

const S = "../docs/screenshots";

test.beforeEach(async ({ page }) => {
  await mockAllApiRoutes(page);
});

test("capture desktop screenshots", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });

  // 1. Issue List (default view)
  await page.goto("/");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${S}/01-issue-list.png` });

  // 2. Issue Detail Panel
  await page.getByRole("row", { name: /PROJ-1/ }).click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${S}/02-issue-detail.png` });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);

  // 3. Sidebar Navigation
  await page.getByLabel("Toggle sidebar").click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${S}/03-sidebar.png` });

  // 4. Dashboard
  const sidebar = () => page.locator("aside[aria-label='Sidebar navigation']").last();
  await sidebar().getByRole("button", { name: /^.?\s*Dashboard$/ }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${S}/04-dashboard.png` });

  // 5. Board View (Kanban)
  await page.getByLabel("Toggle sidebar").click();
  await page.waitForTimeout(300);
  await sidebar().getByRole("button", { name: /Board/ }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${S}/05-kanban-board.png` });

  // 6. Sprint Dashboard
  await page.getByLabel("Toggle sidebar").click();
  await page.waitForTimeout(300);
  await sidebar().getByRole("button", { name: /Sprint/ }).click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${S}/06-sprint-dashboard.png`, fullPage: true });

  // 7. Command Palette (empty)
  await page.getByLabel("Open command palette").click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${S}/07-command-palette-empty.png` });

  // 8. Command Palette (with results)
  await page.getByLabel("Search issues").fill("login");
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${S}/08-command-palette-results.png` });
  await page.keyboard.press("Escape");

  // 9. Create Issue Modal (use 'c' shortcut to open directly)
  await page.keyboard.press("c");
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${S}/09-create-issue.png` });
  await page.keyboard.press("Escape");

  // 10. Keyboard Shortcuts
  await page.locator("body").click();
  await page.keyboard.press("?");
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${S}/10-keyboard-shortcuts.png` });
  await page.keyboard.press("Escape");

  // 11. Light Mode - Issue List
  const themeBtn = page.locator("button[title='Light mode'], button[title='Dark mode']");
  await themeBtn.click();
  await page.waitForTimeout(300);
  await page.getByLabel("Toggle sidebar").click();
  await page.waitForTimeout(300);
  await sidebar().getByRole("button", { name: /List/ }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${S}/11-light-mode-list.png` });

  // 12. Light Mode - Board
  await page.getByLabel("Toggle sidebar").click();
  await page.waitForTimeout(300);
  await sidebar().getByRole("button", { name: /Board/ }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${S}/12-light-mode-board.png` });

  // Switch back to dark
  await themeBtn.click();
  await page.waitForTimeout(300);

  // 13. About Page
  await page.getByLabel("Toggle sidebar").click();
  await page.waitForTimeout(300);
  await sidebar().getByText("About").click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${S}/13-about-page.png`, fullPage: true });
});

test("capture mobile screenshots", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });

  // 14. Mobile - Issue List
  await page.goto("/");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${S}/14-mobile-list.png` });

  // 15. Mobile - Issue Detail
  await page.getByRole("row", { name: /PROJ-1/ }).click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${S}/15-mobile-detail.png` });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);

  // 16. Mobile - Sidebar
  await page.getByLabel("Toggle sidebar").click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${S}/16-mobile-sidebar.png` });

  // 17. Mobile - Board View
  const sidebar = () => page.locator("aside[aria-label='Sidebar navigation']").last();
  await sidebar().getByRole("button", { name: /Board/ }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${S}/17-mobile-board.png` });
});
