import { test, expect } from "@playwright/test";
import { mockAllApiRoutes, MOCK_ISSUES_LIST } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await mockAllApiRoutes(page);
});

// ─── App Load & Header ─────────────────────────────────────────────────

test.describe("App Load", () => {
  test("Given the app loads, then the header shows app name and controls", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Jira UI")).toBeVisible();
    await expect(page.getByLabel("Toggle sidebar")).toBeVisible();
    await expect(page.getByLabel("Create issue")).toBeVisible();
  });

  test("Given the app loads, then the default view is the issue list with all issues", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("PROJ-1")).toBeVisible();
    await expect(page.getByText("PROJ-2")).toBeVisible();
    await expect(page.getByText("PROJ-3")).toBeVisible();
  });
});

// ─── Issue List ─────────────────────────────────────────────────────────

test.describe("Issue List", () => {
  test("Given the list view, then all issue summaries are visible", async ({ page }) => {
    await page.goto("/");
    for (const issue of MOCK_ISSUES_LIST.issues) {
      await expect(page.getByText(issue.summary)).toBeVisible();
    }
  });

  test("Given the list view, then issue count is shown", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/1–3 of 3/)).toBeVisible();
  });

  test("Given the list view, then filter select dropdowns are present", async ({ page }) => {
    await page.goto("/");
    // Selects are present (visible)
    const selects = page.locator("select");
    await expect(selects.first()).toBeVisible();
    // At least 3 filter dropdowns (Type, Status, Assignee) plus project
    expect(await selects.count()).toBeGreaterThanOrEqual(3);
  });

  test("Given the list view, when clicking an issue summary, then the detail panel opens", async ({ page }) => {
    await page.goto("/");
    // Click the issue row (the row contains the summary text)
    await page.getByRole("row", { name: /PROJ-1/ }).click();
    // Wait for detail to load — look for the issue key in the detail panel header
    await expect(page.getByText("PROJ-1").nth(1)).toBeVisible({ timeout: 10000 });
  });
});

// ─── Issue Detail ───────────────────────────────────────────────────────

test.describe("Issue Detail", () => {
  test("Given an issue row is clicked, then the detail panel shows issue info", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("row", { name: /PROJ-1/ }).click();
    // The detail panel should render — check for the description text from MOCK_ISSUE
    await expect(page.getByText("The login page is broken")).toBeVisible({ timeout: 10000 });
  });

  test("Given the detail panel is open, when pressing Escape, then it closes", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("row", { name: /PROJ-1/ }).click();
    await expect(page.getByText("The login page is broken")).toBeVisible({ timeout: 10000 });
    await page.keyboard.press("Escape");
    await expect(page.getByText("The login page is broken")).not.toBeVisible();
  });
});

// ─── Sidebar Navigation ────────────────────────────────────────────────

test.describe("Sidebar", () => {
  test("Given the hamburger is clicked, then the sidebar opens with projects", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Toggle sidebar").click();
    const sidebar = page.locator("aside[aria-label='Sidebar navigation']").last();
    await expect(sidebar.getByText("My Project")).toBeVisible();
    await expect(sidebar.getByText("Demo Project")).toBeVisible();
  });

  test("Given the sidebar is open, then view nav items are present", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Toggle sidebar").click();
    const sidebar = page.locator("aside[aria-label='Sidebar navigation']").last();
    await expect(sidebar.getByRole("button", { name: /^.?\s*Dashboard$/ })).toBeVisible();
    await expect(sidebar.getByRole("button", { name: /List/ })).toBeVisible();
    await expect(sidebar.getByRole("button", { name: /Board/ })).toBeVisible();
    await expect(sidebar.getByRole("button", { name: /About/ })).toBeVisible();
  });

  test("Given the sidebar is open, when clicking Dashboard, then the dashboard loads", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Toggle sidebar").click();
    const sidebar = page.locator("aside[aria-label='Sidebar navigation']").last();
    await sidebar.getByRole("button", { name: /^.?\s*Dashboard$/ }).click();
    await expect(page.getByText("Welcome to Jira UI")).toBeVisible({ timeout: 10000 });
  });

  test("Given the sidebar is open, when clicking About, then the about page loads", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Toggle sidebar").click();
    const sidebar = page.locator("aside[aria-label='Sidebar navigation']").last();
    await sidebar.getByText("About").click();
    await expect(page.getByTestId("about-page")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Modern alternative frontend")).toBeVisible();
  });
});

// ─── Command Palette ───────────────────────────────────────────────────

test.describe("Command Palette", () => {
  test("Given the search button is clicked, then the command palette opens", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Open command palette").click();
    await expect(page.getByLabel("Search issues")).toBeVisible();
  });

  test("Given the command palette is open, when pressing Escape, then it closes", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Open command palette").click();
    await expect(page.getByLabel("Search issues")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByLabel("Search issues")).not.toBeVisible();
  });

  test("Given the command palette is open, when typing a query, then results appear", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Open command palette").click();
    const input = page.getByLabel("Search issues");
    await input.fill("login");
    await expect(page.locator("[role='option']").first()).toBeVisible({ timeout: 10000 });
  });
});

// ─── Create Issue Modal ────────────────────────────────────────────────

test.describe("Create Issue", () => {
  test("Given the create button is clicked, then the create modal opens", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Create issue").click();
    await expect(page.getByText("Create Issue")).toBeVisible();
  });

  test("Given the create modal is open, when pressing Escape, then it closes", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Create issue").click();
    await expect(page.getByText("Create Issue")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByText("Create Issue")).not.toBeVisible();
  });

  test("Given no input is focused, when pressing 'c' key, then the create modal opens", async ({ page }) => {
    await page.goto("/");
    await page.locator("body").click();
    await page.keyboard.press("c");
    await expect(page.getByText("Create Issue")).toBeVisible();
  });
});

// ─── Theme Toggle ──────────────────────────────────────────────────────

test.describe("Theme", () => {
  test("Given the app renders, then the theme toggle button is clickable", async ({ page }) => {
    await page.goto("/");
    // Find by title attribute
    const themeBtn = page.locator("button[title='Light mode'], button[title='Dark mode']");
    await expect(themeBtn).toBeVisible();
    const initialTitle = await themeBtn.getAttribute("title");
    await themeBtn.click();
    // Title should change after toggle
    const newTitle = await themeBtn.getAttribute("title");
    expect(newTitle).not.toBe(initialTitle);
  });
});

// ─── Responsive ─────────────────────────────────────────────────────────

test.describe("Responsive", () => {
  test("Given a mobile viewport (375px), then the app renders issues", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await expect(page.getByText("Jira UI")).toBeVisible();
    await expect(page.getByText("PROJ-1")).toBeVisible();
  });

  test("Given a desktop viewport (1920px), then all columns are visible", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/");
    await expect(page.getByText("PROJ-1")).toBeVisible();
    await expect(page.getByText("Fix login page")).toBeVisible();
  });
});

// ─── Keyboard Shortcuts ────────────────────────────────────────────────

test.describe("Keyboard Shortcuts", () => {
  test("Given the app is loaded, when pressing '?' key, then shortcut help opens", async ({ page }) => {
    await page.goto("/");
    await page.locator("body").click();
    await page.keyboard.press("?");
    await expect(page.getByText(/keyboard shortcuts/i)).toBeVisible({ timeout: 5000 });
  });
});
