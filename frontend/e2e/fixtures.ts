/**
 * Shared mock data and route helpers for E2E tests.
 * All tests intercept /api/* routes so no real backend is needed.
 */
import { type Page } from "@playwright/test";

export const MOCK_PROJECTS = [
  { id: "10001", key: "PROJ", name: "My Project", avatarUrl: "https://jira.test/proj.png", style: "classic", description: "Test project" },
  { id: "10002", key: "DEMO", name: "Demo Project", avatarUrl: null, style: "next-gen", description: "" },
];

export const MOCK_PRIORITIES = [
  { id: "1", name: "Highest", iconUrl: "https://jira.test/highest.png" },
  { id: "2", name: "High", iconUrl: "https://jira.test/high.png" },
  { id: "3", name: "Medium", iconUrl: "https://jira.test/medium.png" },
  { id: "4", name: "Low", iconUrl: "https://jira.test/low.png" },
  { id: "5", name: "Lowest", iconUrl: "https://jira.test/lowest.png" },
];

export const MOCK_LABELS = ["bug", "feature", "urgent", "documentation"];

export const MOCK_MEMBERS = [
  { accountId: "user-1", displayName: "Alice Smith", avatarUrl: "https://jira.test/alice.png", active: true },
  { accountId: "user-2", displayName: "Bob Jones", avatarUrl: "https://jira.test/bob.png", active: true },
];

export const MOCK_ISSUE = {
  id: "10001",
  key: "PROJ-1",
  summary: "Fix login page",
  description: "The login page is broken",
  descriptionAdf: { type: "doc", version: 1, content: [{ type: "paragraph", content: [{ type: "text", text: "The login page is broken" }] }] },
  status: { name: "In Progress", category: "indeterminate" },
  priority: { name: "High", iconUrl: "" },
  type: { name: "Bug", iconUrl: "" },
  assignee: { accountId: "user-1", displayName: "Alice Smith", avatarUrl: "https://jira.test/alice.png" },
  reporter: { accountId: "user-2", displayName: "Bob Jones", avatarUrl: "https://jira.test/bob.png" },
  project: { key: "PROJ", name: "My Project" },
  labels: ["bug"],
  created: "2026-03-10T08:00:00.000+0000",
  updated: "2026-03-11T10:00:00.000+0000",
  dueDate: "2026-04-01",
  transitions: [
    { id: "11", name: "To Do" },
    { id: "21", name: "In Progress" },
    { id: "31", name: "Done" },
  ],
  timeTracking: { originalEstimate: "2h", remainingEstimate: "1h", timeSpent: "1h", originalEstimateSeconds: 7200, remainingEstimateSeconds: 3600, timeSpentSeconds: 3600 },
  subtasks: [],
  issuelinks: [],
  comment: { comments: [] },
};

export const MOCK_ISSUES_LIST = {
  issues: [
    {
      id: "10001", key: "PROJ-1", summary: "Fix login page",
      status: { name: "In Progress", statusCategory: { key: "indeterminate" } },
      priority: { name: "High" }, type: { name: "Bug" },
      assignee: { accountId: "user-1", displayName: "Alice Smith", avatarUrl: "" },
      labels: ["bug"], updated: "2026-03-11T10:00:00.000+0000", duedate: "2026-04-01",
    },
    {
      id: "10002", key: "PROJ-2", summary: "Add dark mode support",
      status: { name: "To Do", statusCategory: { key: "new" } },
      priority: { name: "Medium" }, type: { name: "Story" },
      assignee: null, labels: ["feature"], updated: "2026-03-10T15:30:00.000+0000", duedate: null,
    },
    {
      id: "10003", key: "PROJ-3", summary: "Update documentation",
      status: { name: "Done", statusCategory: { key: "done" } },
      priority: { name: "Low" }, type: { name: "Task" },
      assignee: { accountId: "user-2", displayName: "Bob Jones", avatarUrl: "" },
      labels: ["documentation"], updated: "2026-03-09T12:00:00.000+0000", duedate: null,
    },
  ],
  total: 3,
};

export const MOCK_BOARDS = [
  { id: 1, name: "PROJ board", type: "scrum", projectKey: "PROJ" },
];

export const MOCK_SPRINTS = {
  sprints: [
    { id: 1, name: "Sprint 1", state: "active", startDate: "2026-03-01", endDate: "2026-03-15", goal: "Deliver login fix", boardId: 1, boardName: "PROJ board" },
    { id: 2, name: "Sprint 2", state: "future", startDate: "2026-03-16", endDate: "2026-03-30", goal: "Dark mode & search", boardId: 1, boardName: "PROJ board" },
  ],
};

export const MOCK_BURNDOWN = {
  data: [
    { date: "2026-03-01", remaining: 20, ideal: 20 },
    { date: "2026-03-03", remaining: 18, ideal: 17 },
    { date: "2026-03-05", remaining: 15, ideal: 14 },
    { date: "2026-03-07", remaining: 12, ideal: 11 },
    { date: "2026-03-09", remaining: 10, ideal: 9 },
    { date: "2026-03-11", remaining: 7, ideal: 6 },
    { date: "2026-03-13", remaining: 5, ideal: 3 },
    { date: "2026-03-15", remaining: 2, ideal: 0 },
  ],
};

export const MOCK_VELOCITY = {
  sprints: [
    { name: "Sprint -2", committed: 15, completed: 13 },
    { name: "Sprint -1", committed: 18, completed: 16 },
    { name: "Sprint 1", committed: 20, completed: 14 },
  ],
};

/**
 * Intercept all API routes with mock data so E2E tests run without a backend.
 */
export async function mockAllApiRoutes(page: Page) {
  // Block service worker registration so Workbox doesn't intercept API calls
  await page.route("**/sw.js", (route) => route.fulfill({ body: "", contentType: "application/javascript" }));
  await page.route("**/registerSW.js", (route) => route.fulfill({ body: "", contentType: "application/javascript" }));
  await page.route("**/workbox-*.js", (route) => route.fulfill({ body: "", contentType: "application/javascript" }));

  // Settings + Auth — must return valid responses so the app doesn't show login page
  await page.route("**/api/settings", (route) =>
    route.fulfill({ json: {
      jira_host: "https://demo.atlassian.net",
      jira_email: "demo@example.com",
      jira_api_token_masked: "••••abcd",
      atlassian_client_id: "",
      atlassian_client_secret_masked: "",
      oauth_configured: false,
      auth_api_token_enabled: true,
      auth_oauth_enabled: false,
      app_env: "development",
    }})
  );
  await page.route("**/auth/me", (route) =>
    route.fulfill({ json: { authenticated: false } })
  );

  // Order matters — more specific patterns first
  await page.route("**/api/projects/*/members", (route) =>
    route.fulfill({ json: MOCK_MEMBERS })
  );
  await page.route("**/api/projects/*", (route) => {
    if (route.request().url().includes("/members")) return route.continue();
    return route.fulfill({
      json: { id: "10001", key: "PROJ", name: "My Project", issueTypes: [{ name: "Bug" }, { name: "Story" }, { name: "Task" }] },
    });
  });
  await page.route("**/api/projects", (route) =>
    route.fulfill({ json: MOCK_PROJECTS })
  );
  await page.route("**/api/priorities", (route) =>
    route.fulfill({ json: MOCK_PRIORITIES })
  );
  await page.route("**/api/labels", (route) =>
    route.fulfill({ json: MOCK_LABELS })
  );
  // Issues: unified handler for all /api/issues* endpoints
  await page.route(/\/api\/issues/, async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    // Sub-resources: comments, worklog, transition
    if (url.includes("/comments")) return route.fulfill({ json: [] });
    if (url.includes("/worklog")) return route.fulfill({ json: { worklogs: [] } });
    if (url.includes("/transition")) return route.fulfill({ json: { status: "ok" } });
    // Individual issue: /api/issues/PROJ-1
    if (/\/issues\/[A-Z]+-\d+/.test(url)) {
      if (method === "GET") return route.fulfill({ json: MOCK_ISSUE });
      return route.fulfill({ json: { status: "ok" } });
    }
    // List endpoint: /api/issues or /api/issues?...
    return route.fulfill({ json: MOCK_ISSUES_LIST });
  });
  await page.route("**/api/boards/*/sprints**", (route) =>
    route.fulfill({ json: MOCK_SPRINTS })
  );
  await page.route("**/api/boards**", (route) =>
    route.fulfill({ json: MOCK_BOARDS })
  );
  // Sprint sub-resources
  await page.route("**/api/sprints/*/burndown**", (route) =>
    route.fulfill({ json: MOCK_BURNDOWN })
  );
  await page.route("**/api/sprints/*/velocity**", (route) =>
    route.fulfill({ json: MOCK_VELOCITY })
  );
  await page.route("**/api/sprints/*/issues**", (route) =>
    route.fulfill({ json: { issues: MOCK_ISSUES_LIST.issues.slice(0, 2), total: 2 } })
  );
  // Sprint list (for dashboard /api/sprints?state=active and sprint dashboard)
  await page.route(/\/api\/sprints/, (route) => {
    const url = route.request().url();
    // Already handled sub-resources above via glob — this catches list only
    if (/\/sprints\/\d+/.test(url)) {
      // Individual sprint detail
      return route.fulfill({ json: MOCK_SPRINTS.sprints[0] });
    }
    return route.fulfill({ json: MOCK_SPRINTS });
  });
  await page.route("**/api/search**", (route) => {
    const url = route.request().url();
    if (url.includes("/quick")) {
      // Quick search returns simplified format
      return route.fulfill({ json: {
        issues: MOCK_ISSUES_LIST.issues.map(i => ({
          id: i.id, key: i.key, summary: i.summary,
          status: i.status.name, project: "PROJ",
        })),
        total: MOCK_ISSUES_LIST.total,
      }});
    }
    return route.fulfill({ json: { issues: MOCK_ISSUES_LIST.issues, total: MOCK_ISSUES_LIST.total } });
  });
  await page.route("**/api/health", (route) =>
    route.fulfill({ json: { status: "ok", version: "0.0.0-test" } })
  );
}

/**
 * Select a project via the sidebar.
 * Opens sidebar, clicks the project button, then waits for issues to load.
 */
export async function selectProject(page: Page, projectName: string) {
  // Open sidebar via hamburger menu
  const menuBtn = page.getByRole("button", { name: /toggle sidebar|menu/i }).or(
    page.locator("button[aria-label='Toggle sidebar']")
  );
  // Try clicking the sidebar hamburger — on large screens it may already show
  const sidebar = page.locator("aside[aria-label='Sidebar navigation']");
  if (!(await sidebar.locator("button", { hasText: projectName }).isVisible().catch(() => false))) {
    await menuBtn.first().click();
  }
  await sidebar.locator("button", { hasText: projectName }).click();
}
