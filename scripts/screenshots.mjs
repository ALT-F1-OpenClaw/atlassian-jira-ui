#!/usr/bin/env node
/**
 * Capture screenshots of the running frontend using mock data.
 * Uses Playwright route interception — no backend needed, no production data exposed.
 * Requires: frontend on :5173, Playwright chromium installed.
 * Usage: node scripts/screenshots.mjs
 */

import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "../docs/screenshots");
mkdirSync(outDir, { recursive: true });

const BASE = "http://localhost:5173";

// ---------------------------------------------------------------------------
// Mock data — mirrors test fixtures from App.test.tsx
// ---------------------------------------------------------------------------

const mockProjects = [
  { key: "PROJ", name: "My Project", id: "1" },
  { key: "ACME", name: "Acme Corp", id: "2" },
];

const mockIssues = {
  issues: [
    {
      id: "10001", key: "PROJ-1", summary: "Implement login page",
      status: { name: "In Progress", category: "indeterminate" },
      priority: { name: "High", iconUrl: "" },
      assignee: { accountId: "abc123", displayName: "Alice Martin", avatarUrl: "" },
      type: { name: "Story", iconUrl: "" },
      updated: "2026-03-09T14:30:00.000Z",
    },
    {
      id: "10002", key: "PROJ-2", summary: "Fix navigation bug",
      status: { name: "To Do", category: "new" },
      priority: { name: "Medium", iconUrl: "" },
      assignee: null,
      type: { name: "Bug", iconUrl: "" },
      updated: "2026-03-08T10:00:00.000Z",
    },
    {
      id: "10003", key: "PROJ-3", summary: "Update API documentation",
      status: { name: "Done", category: "done" },
      priority: { name: "Low", iconUrl: "" },
      assignee: { accountId: "def456", displayName: "Bob Chen", avatarUrl: "" },
      type: { name: "Task", iconUrl: "" },
      updated: "2026-03-07T08:15:00.000Z",
    },
    {
      id: "10004", key: "PROJ-4", summary: "Add dark mode toggle",
      status: { name: "To Do", category: "new" },
      priority: { name: "Highest", iconUrl: "" },
      assignee: { accountId: "abc123", displayName: "Alice Martin", avatarUrl: "" },
      type: { name: "Story", iconUrl: "" },
      updated: "2026-03-06T16:45:00.000Z",
    },
    {
      id: "10005", key: "PROJ-5", summary: "Refactor API client module",
      status: { name: "In Progress", category: "indeterminate" },
      priority: { name: "Medium", iconUrl: "" },
      assignee: { accountId: "def456", displayName: "Bob Chen", avatarUrl: "" },
      type: { name: "Task", iconUrl: "" },
      updated: "2026-03-05T09:20:00.000Z",
    },
    {
      id: "10006", key: "ACME-1", summary: "Set up CI/CD pipeline",
      status: { name: "Done", category: "done" },
      priority: { name: "High", iconUrl: "" },
      assignee: { accountId: "ghi789", displayName: "Carol Davis", avatarUrl: "" },
      type: { name: "Task", iconUrl: "" },
      updated: "2026-03-04T11:00:00.000Z",
    },
    {
      id: "10007", key: "ACME-2", summary: "Design system components",
      status: { name: "In Progress", category: "indeterminate" },
      priority: { name: "Low", iconUrl: "" },
      assignee: { accountId: "ghi789", displayName: "Carol Davis", avatarUrl: "" },
      type: { name: "Epic", iconUrl: "" },
      updated: "2026-03-03T14:10:00.000Z",
    },
  ],
  total: 7,
};

// ---------------------------------------------------------------------------
// Route handler — intercepts API calls and returns mock data
// ---------------------------------------------------------------------------

async function setupMockRoutes(page) {
  await page.route("**/api/projects", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockProjects) })
  );

  await page.route("**/api/issues**", (route) => {
    const url = new URL(route.request().url());
    const project = url.searchParams.get("project");
    const status = url.searchParams.get("status");

    let data = mockIssues;
    if (project || status) {
      const filtered = mockIssues.issues.filter((i) => {
        if (project && !i.key.startsWith(project)) return false;
        if (status && i.status.name !== status) return false;
        return true;
      });
      data = { issues: filtered, total: filtered.length };
    }

    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(data) });
  });
}

// ---------------------------------------------------------------------------
// Screenshot capture
// ---------------------------------------------------------------------------

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await setupMockRoutes(page);

  // 1. List view (default) — all mock issues
  await page.goto(BASE);
  await page.waitForSelector("table tbody tr", { timeout: 15000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${outDir}/03-list-view.png`, fullPage: false });
  console.log("✓ 03-list-view.png");

  // 2. List view with filters applied (project + status)
  const projectSelect = page.locator("header select").first();
  await projectSelect.selectOption("PROJ");
  await page.waitForTimeout(800);
  const statusSelect = page.locator('select[aria-label="Filter by status"]');
  await statusSelect.selectOption("To Do");
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${outDir}/05-list-filtered.png`, fullPage: false });
  console.log("✓ 05-list-filtered.png");

  // 3. List view sorted by Priority (reset filters first)
  const clearBtn = page.locator("text=Clear filters");
  if (await clearBtn.isVisible()) {
    await clearBtn.click();
    await page.waitForTimeout(500);
  }
  await projectSelect.selectOption({ value: "" });
  await page.waitForTimeout(800);
  const priorityHeader = page.locator("th", { hasText: "Priority" });
  await priorityHeader.click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${outDir}/06-list-sorted.png`, fullPage: false });
  console.log("✓ 06-list-sorted.png");

  await browser.close();
  console.log(`\nDone! Screenshots saved to docs/screenshots/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
