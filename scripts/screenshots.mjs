#!/usr/bin/env node
/**
 * Capture screenshots of the running application using Playwright.
 * Requires: backend on :35400, frontend on :5173, Playwright chromium installed.
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

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // 1. List view (default)
  await page.goto(BASE);
  await page.waitForSelector("table tbody tr", { timeout: 15000 });
  await page.waitForTimeout(500); // let styles settle
  await page.screenshot({ path: `${outDir}/03-list-view.png`, fullPage: false });
  console.log("✓ 03-list-view.png");

  // 2. List view with filters applied
  // Select a project if available
  const projectSelect = page.locator("header select").first();
  const projectOptions = await projectSelect.locator("option").allTextContents();
  if (projectOptions.length > 1) {
    await projectSelect.selectOption({ index: 1 });
    await page.waitForTimeout(1000);
  }
  // Apply a status filter if available
  const statusSelect = page.locator('select[aria-label="Filter by status"]');
  const statusOptions = await statusSelect.locator("option").allTextContents();
  if (statusOptions.length > 1) {
    await statusSelect.selectOption({ index: 1 });
    await page.waitForTimeout(1000);
  }
  await page.screenshot({ path: `${outDir}/05-list-filtered.png`, fullPage: false });
  console.log("✓ 05-list-filtered.png");

  // 3. List view sorted by a column (click Priority header)
  // Reset filters first
  const clearBtn = page.locator("text=Clear filters");
  if (await clearBtn.isVisible()) {
    await clearBtn.click();
    await page.waitForTimeout(500);
  }
  // Reset project
  await projectSelect.selectOption({ value: "" });
  await page.waitForTimeout(1000);
  // Click Priority header to sort
  const priorityHeader = page.locator("th", { hasText: "Priority" });
  await priorityHeader.click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${outDir}/06-list-sorted.png`, fullPage: false });
  console.log("✓ 06-list-sorted.png");

  await browser.close();
  console.log(`\nDone! Screenshots saved to docs/screenshots/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
