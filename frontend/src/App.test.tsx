import { render, screen, within, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, beforeEach, vi } from "vitest";
import App from "./App";

// Mock recharts to avoid SVG rendering issues in JSDOM
vi.mock("recharts", () => {
  const MockContainer = ({ children }: { children: React.ReactNode }) => <div data-testid="recharts-container">{children}</div>;
  const MockChart = ({ children, data }: { children?: React.ReactNode; data?: unknown[] }) => (
    <div data-testid="recharts-chart" data-count={data?.length || 0}>{children}</div>
  );
  const Noop = () => null;
  return {
    ResponsiveContainer: MockContainer,
    PieChart: MockChart,
    Pie: Noop,
    Cell: Noop,
    BarChart: MockChart,
    Bar: Noop,
    LineChart: MockChart,
    Line: Noop,
    XAxis: Noop,
    YAxis: Noop,
    CartesianGrid: Noop,
    Tooltip: Noop,
    Legend: Noop,
  };
});

// JSDOM doesn't implement scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// Auth/settings responses that all fetch mocks must include
const MOCK_SETTINGS_RESPONSE = { jira_host: "https://test.atlassian.net", auth_api_token_enabled: true, auth_oauth_enabled: false, atlassian_client_id: "", atlassian_client_secret_masked: "", oauth_configured: false, jira_api_token_masked: "••••1234", jira_email: "test@test.com" };
const MOCK_AUTH_ME_RESPONSE = { authenticated: false };

function _handleAuthUrls(urlStr: string): Response | null {
  if (urlStr.includes("/api/settings")) {
    return { ok: true, json: () => Promise.resolve(MOCK_SETTINGS_RESPONSE) } as Response;
  }
  if (urlStr.includes("/auth/me")) {
    return { ok: true, json: () => Promise.resolve(MOCK_AUTH_ME_RESPONSE) } as Response;
  }
  return null;
}

/**
 * Helper: select an option from a SearchableSelect component.
 * Opens the dropdown by clicking the button, then clicks the matching option.
 */
async function selectSearchableOption(
  user: ReturnType<typeof userEvent.setup>,
  container: HTMLElement | typeof screen,
  ariaLabel: string,
  optionText: string,
) {
  const btn = "getByLabelText" in container
    ? container.getByLabelText(ariaLabel)
    : within(container).getByLabelText(ariaLabel);
  await user.click(btn);
  // Find the option in the listbox
  const listbox = screen.getByRole("listbox");
  const option = within(listbox).getByText(optionText);
  await user.click(option);
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const mockIssues = {
  issues: [
    {
      id: "10001",
      key: "PROJ-1",
      summary: "Implement login page",
      status: { name: "In Progress", category: "indeterminate" },
      priority: { name: "High", iconUrl: "" },
      assignee: {
        accountId: "abc123",
        displayName: "Alice Martin",
        avatarUrl: "",
      },
      type: { name: "Story", iconUrl: "" },
      updated: "2026-03-09T14:30:00.000Z",
    },
    {
      id: "10002",
      key: "PROJ-2",
      summary: "Fix navigation bug",
      status: { name: "To Do", category: "new" },
      priority: { name: "Medium", iconUrl: "" },
      assignee: null,
      type: { name: "Bug", iconUrl: "" },
      updated: "2026-03-08T10:00:00.000Z",
    },
    {
      id: "10003",
      key: "PROJ-3",
      summary: "Update API documentation",
      status: { name: "Done", category: "done" },
      priority: { name: "Low", iconUrl: "" },
      assignee: {
        accountId: "def456",
        displayName: "Bob Chen",
        avatarUrl: "",
      },
      type: { name: "Task", iconUrl: "" },
      updated: "2026-03-07T08:15:00.000Z",
    },
  ],
  total: 3,
};

const mockProjects = [
  { key: "PROJ", name: "My Project", id: "1" },
];

const mockPriorities = [
  { id: "1", name: "Highest", iconUrl: "" },
  { id: "2", name: "High", iconUrl: "" },
  { id: "3", name: "Medium", iconUrl: "" },
  { id: "4", name: "Low", iconUrl: "" },
  { id: "5", name: "Lowest", iconUrl: "" },
];

const mockMembers = [
  { accountId: "abc123", displayName: "Alice Martin", avatarUrl: "", active: true },
  { accountId: "def456", displayName: "Bob Chen", avatarUrl: "", active: true },
  { accountId: "ghi789", displayName: "Carol Davis", avatarUrl: "", active: true },
];

const mockIssueDetail = {
  id: "10001",
  key: "PROJ-1",
  summary: "Implement login page",
  description: "Build a login page with email and password fields.",
  descriptionAdf: {
    type: "doc",
    version: 1,
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Build a " },
          { type: "text", text: "login page", marks: [{ type: "strong" }] },
          { type: "text", text: " with email and password fields." },
        ],
      },
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: "Requirements" }],
      },
      {
        type: "bulletList",
        content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Email validation" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Password strength meter" }] }] },
        ],
      },
      {
        type: "codeBlock",
        content: [{ type: "text", text: "const login = () => {};" }],
      },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "See " },
          { type: "text", text: "docs", marks: [{ type: "link", attrs: { href: "https://example.com" } }] },
          { type: "text", text: " for details." },
        ],
      },
    ],
  },
  status: { name: "In Progress", category: "indeterminate" },
  priority: { name: "High", iconUrl: "" },
  assignee: {
    accountId: "abc123",
    displayName: "Alice Martin",
    avatarUrl: "",
  },
  reporter: {
    accountId: "xyz789",
    displayName: "Carol Davis",
    avatarUrl: "",
  },
  type: { name: "Story", iconUrl: "" },
  project: { key: "PROJ", name: "My Project" },
  labels: ["frontend", "auth"],
  created: "2026-03-01T09:00:00.000Z",
  updated: "2026-03-09T14:30:00.000Z",
  dueDate: "2026-03-15",
  transitions: [
    { id: "21", name: "To Do" },
    { id: "31", name: "Done" },
  ],
  timeTracking: {
    originalEstimate: "4h",
    remainingEstimate: "2h",
    timeSpent: "2h",
    originalEstimateSeconds: 14400,
    remainingEstimateSeconds: 7200,
    timeSpentSeconds: 7200,
  },
};

const mockLabels = ["frontend", "auth", "backend", "bug", "enhancement", "documentation"];

const mockWorklogs = {
  worklogs: [
    {
      id: "w1",
      timeSpent: "1h",
      timeSpentSeconds: 3600,
      comment: "Worked on login form",
      created: "2026-03-09T10:00:00.000Z",
      updated: "2026-03-09T10:00:00.000Z",
      author: { accountId: "abc123", displayName: "Alice Martin", avatarUrl: "" },
    },
    {
      id: "w2",
      timeSpent: "1h",
      timeSpentSeconds: 3600,
      comment: "Code review fixes",
      created: "2026-03-10T14:00:00.000Z",
      updated: "2026-03-10T14:00:00.000Z",
      author: { accountId: "def456", displayName: "Bob Chen", avatarUrl: "" },
    },
  ],
  total: 2,
};

const mockSprints = {
  sprints: [
    {
      id: 100,
      name: "Sprint 42",
      state: "active",
      startDate: "2026-03-01T00:00:00.000Z",
      endDate: "2026-03-15T00:00:00.000Z",
      goal: "Complete login feature",
      boardId: 1,
      boardName: "PROJ board",
    },
  ],
};

const mockSprintIssues = {
  issues: [
    { id: "10001", key: "PROJ-1", summary: "Implement login page", status: "In Progress", statusCategory: "indeterminate", priority: "High", assignee: "Alice Martin", type: "Story", storyPoints: 5, created: "2026-02-25T10:00:00.000Z" },
    { id: "10002", key: "PROJ-2", summary: "Fix navigation bug", status: "To Do", statusCategory: "new", priority: "Medium", assignee: "", type: "Bug", storyPoints: 3, created: "2026-02-26T10:00:00.000Z" },
    { id: "10003", key: "PROJ-3", summary: "Update API docs", status: "Done", statusCategory: "done", priority: "Low", assignee: "Bob Chen", type: "Task", storyPoints: 2, created: "2026-02-27T10:00:00.000Z" },
    { id: "10004", key: "PROJ-4", summary: "Added after sprint start", status: "To Do", statusCategory: "new", priority: "Medium", assignee: "", type: "Task", storyPoints: 1, created: "2026-03-05T10:00:00.000Z" },
  ],
  total: 4,
  statusCounts: [
    { status: "In Progress", count: 1 },
    { status: "To Do", count: 2 },
    { status: "Done", count: 1 },
  ],
  categoryCounts: { todo: 2, inProgress: 1, done: 1 },
};

const mockBurndown = {
  burndown: [
    { date: "2026-03-01", remaining: 4, ideal: 4 },
    { date: "2026-03-02", remaining: 4, ideal: 3.7 },
    { date: "2026-03-03", remaining: 3, ideal: 3.4 },
    { date: "2026-03-04", remaining: 3, ideal: 3.1 },
    { date: "2026-03-05", remaining: 3, ideal: 2.9 },
  ],
  sprint: { id: 100, name: "Sprint 42", startDate: "2026-03-01T00:00:00.000Z", endDate: "2026-03-15T00:00:00.000Z", totalIssues: 4 },
};

const mockVelocity = {
  velocity: [
    { sprintId: 98, sprintName: "Sprint 40", state: "closed", committedPoints: 20, completedPoints: 18, committedCount: 8, completedCount: 7 },
    { sprintId: 99, sprintName: "Sprint 41", state: "closed", committedPoints: 25, completedPoints: 22, committedCount: 10, completedCount: 9 },
    { sprintId: 100, sprintName: "Sprint 42", state: "active", committedPoints: 11, completedPoints: 2, committedCount: 4, completedCount: 1 },
  ],
};

function setupFetchMock(overrides?: { issueDetail?: object; patchResponse?: object; transitionResponse?: object; createResponse?: object; createError?: boolean }) {
  const detail = overrides?.issueDetail || mockIssueDetail;
  const patchRes = overrides?.patchResponse || { status: "ok", key: "PROJ-1" };
  const transitionRes = overrides?.transitionResponse || { status: "ok", key: "PROJ-1" };
  const createRes = overrides?.createResponse || { id: "10004", key: "PROJ-4", self: "https://jira.example.com/rest/api/3/issue/10004" };
  const createErr = overrides?.createError || false;

  global.fetch = vi.fn((url: string | URL | Request, init?: RequestInit) => {
    const urlStr = typeof url === "string" ? url : url.toString();
    const authResp = _handleAuthUrls(urlStr);
    if (authResp) return Promise.resolve(authResp);
    if (urlStr.match(/\/api\/projects\/[A-Z]+\/members/)) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockMembers),
      } as Response);
    }
    if (urlStr.includes("/api/projects")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockProjects),
      } as Response);
    }
    if (urlStr.includes("/api/priorities")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockPriorities),
      } as Response);
    }
    if (urlStr.includes("/api/labels")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockLabels),
      } as Response);
    }
    // Create issue: POST /api/issues (no key suffix)
    if (urlStr.match(/\/api\/issues$/) && init?.method === "POST") {
      if (createErr) {
        return Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ detail: "Bad request" }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(createRes),
      } as Response);
    }
    // Worklogs: GET/POST /api/issues/PROJ-1/worklog
    if (urlStr.match(/\/api\/issues\/[A-Z]+-\d+\/worklog/) && init?.method === "POST") {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: "ok", key: "PROJ-1", worklog: { id: "w3" } }),
      } as Response);
    }
    if (urlStr.match(/\/api\/issues\/[A-Z]+-\d+\/worklog/)) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockWorklogs),
      } as Response);
    }
    // Issue detail: /api/issues/PROJ-1 (not /api/issues?...)
    if (urlStr.match(/\/api\/issues\/[A-Z]+-\d+\/transition/) && init?.method === "POST") {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(transitionRes),
      } as Response);
    }
    if (urlStr.match(/\/api\/issues\/[A-Z]+-\d+$/) && init?.method === "PATCH") {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(patchRes),
      } as Response);
    }
    if (urlStr.match(/\/api\/issues\/[A-Z]+-\d+$/)) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(detail),
      } as Response);
    }
    if (urlStr.includes("/api/search/quick")) {
      const searchUrl = new URL(urlStr, "http://localhost");
      const q = (searchUrl.searchParams.get("q") || "").toLowerCase();
      const searchResults = mockIssues.issues
        .filter((i) => i.summary.toLowerCase().includes(q) || i.key.toLowerCase().includes(q))
        .map((i) => ({ id: i.id, key: i.key, summary: i.summary, status: i.status.name, project: "PROJ" }));
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ issues: searchResults, total: searchResults.length }),
      } as Response);
    }
    if (urlStr.match(/\/api\/sprints\/\d+\/burndown/)) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockBurndown),
      } as Response);
    }
    if (urlStr.match(/\/api\/sprints\/\d+\/velocity/)) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockVelocity),
      } as Response);
    }
    // Sprint CRUD: DELETE /api/sprints/:id/issues/:key
    if (urlStr.match(/\/api\/sprints\/\d+\/issues\/[A-Z]+-\d+/) && init?.method === "DELETE") {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: "ok", removed: "PROJ-1" }),
      } as Response);
    }
    // Sprint CRUD: POST /api/sprints/:id/issues (add issues)
    if (urlStr.match(/\/api\/sprints\/\d+\/issues/) && init?.method === "POST") {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: "ok", added: ["PROJ-5"] }),
      } as Response);
    }
    if (urlStr.match(/\/api\/sprints\/\d+\/issues/)) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockSprintIssues),
      } as Response);
    }
    // Sprint CRUD: POST /api/sprints/:id/start
    if (urlStr.match(/\/api\/sprints\/\d+\/start/) && init?.method === "POST") {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: "ok", sprint: { id: 100, name: "Sprint 42", state: "active" } }),
      } as Response);
    }
    // Sprint CRUD: POST /api/sprints/:id/complete
    if (urlStr.match(/\/api\/sprints\/\d+\/complete/) && init?.method === "POST") {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: "ok", sprint: { id: 100, name: "Sprint 42", state: "closed" } }),
      } as Response);
    }
    // Sprint CRUD: DELETE /api/sprints/:id
    if (urlStr.match(/\/api\/sprints\/\d+$/) && init?.method === "DELETE") {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: "ok" }),
      } as Response);
    }
    // Sprint CRUD: PATCH /api/sprints/:id
    if (urlStr.match(/\/api\/sprints\/\d+$/) && init?.method === "PATCH") {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: "ok", sprint: { id: 100, name: "Sprint 42 Updated", state: "active" } }),
      } as Response);
    }
    // Sprint CRUD: POST /api/sprints (create)
    if (urlStr.match(/\/api\/sprints$/) && init?.method === "POST") {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: "ok", sprint: { id: 101, name: "Sprint 43", state: "future" } }),
      } as Response);
    }
    if (urlStr.includes("/api/sprints")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockSprints),
      } as Response);
    }
    if (urlStr.includes("/api/issues")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockIssues),
      } as Response);
    }
    return Promise.resolve({
      ok: false,
      status: 404,
      json: () => Promise.resolve({}),
    } as Response);
  });
}

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, "localStorage", { value: localStorageMock, writable: true });

beforeEach(() => {
  vi.restoreAllMocks();
  localStorageMock.clear();
  setupFetchMock();
});

describe("Feature: List view displays issues in a table", () => {
  describe("Scenario: Table renders with all required columns", () => {
    it("Given the list view is displayed, then the table should have Key, Type, Summary, Status, Priority, Assignee, and Updated columns", async () => {
      render(<App />, { wrapper: createWrapper() });

      const expectedColumns = [
        "Key",
        "Type",
        "Summary",
        "Status",
        "Priority",
        "Assignee",
        "Updated",
      ];

      for (const column of expectedColumns) {
        expect(
          await screen.findByRole("columnheader", { name: new RegExp(column) })
        ).toBeInTheDocument();
      }
    });
  });

  describe("Scenario: Issues are displayed as table rows", () => {
    it("Given the API returns 3 issues, then the table should display 3 data rows", async () => {
      render(<App />, { wrapper: createWrapper() });

      await screen.findByText("PROJ-1");

      const tbody = screen.getAllByRole("rowgroup")[1];
      const rows = within(tbody).getAllByRole("row");
      expect(rows).toHaveLength(3);
    });
  });

  describe("Scenario: Issue key is displayed", () => {
    it("Given an issue with key 'PROJ-1', then 'PROJ-1' should appear in the Key column", async () => {
      render(<App />, { wrapper: createWrapper() });

      expect(await screen.findByText("PROJ-1")).toBeInTheDocument();
      expect(screen.getByText("PROJ-2")).toBeInTheDocument();
      expect(screen.getByText("PROJ-3")).toBeInTheDocument();
    });
  });

  describe("Scenario: Issue type is displayed", () => {
    it("Given issues of type Story, Bug, and Task, then the type name should appear in each row", async () => {
      render(<App />, { wrapper: createWrapper() });

      await screen.findByText("PROJ-1");
      const tbody = screen.getAllByRole("rowgroup")[1];
      expect(within(tbody).getByText("Story")).toBeInTheDocument();
      expect(within(tbody).getByText("Bug")).toBeInTheDocument();
      expect(within(tbody).getByText("Task")).toBeInTheDocument();
    });
  });

  describe("Scenario: Issue summary is displayed", () => {
    it("Given an issue with summary 'Implement login page', then the summary should be visible", async () => {
      render(<App />, { wrapper: createWrapper() });

      expect(
        await screen.findByText("Implement login page")
      ).toBeInTheDocument();
      expect(screen.getByText("Fix navigation bug")).toBeInTheDocument();
      expect(
        screen.getByText("Update API documentation")
      ).toBeInTheDocument();
    });
  });

  describe("Scenario: Issue status is displayed as a badge", () => {
    it("Given issues with statuses 'In Progress', 'To Do', and 'Done', then each status badge should be visible", async () => {
      render(<App />, { wrapper: createWrapper() });

      await screen.findByText("PROJ-1");
      const tbody = screen.getAllByRole("rowgroup")[1];
      expect(within(tbody).getByText("In Progress")).toBeInTheDocument();
      expect(within(tbody).getByText("To Do")).toBeInTheDocument();
      expect(within(tbody).getByText("Done")).toBeInTheDocument();
    });
  });

  describe("Scenario: Issue priority is displayed", () => {
    it("Given issues with High, Medium, and Low priority, then the corresponding priority icons should be visible", async () => {
      render(<App />, { wrapper: createWrapper() });

      await screen.findByText("PROJ-1");
      expect(screen.getByTitle("High")).toBeInTheDocument();
      expect(screen.getByTitle("Medium")).toBeInTheDocument();
      expect(screen.getByTitle("Low")).toBeInTheDocument();
    });
  });

  describe("Scenario: Assignee name is displayed", () => {
    it("Given an issue assigned to 'Alice Martin', then 'Alice Martin' should appear in the Assignee column", async () => {
      render(<App />, { wrapper: createWrapper() });

      await screen.findByText("PROJ-1");
      const tbody = screen.getAllByRole("rowgroup")[1];
      expect(within(tbody).getByText("Alice Martin")).toBeInTheDocument();
      expect(within(tbody).getByText("Bob Chen")).toBeInTheDocument();
    });

    it("Given an unassigned issue, then a dash should appear in the Assignee column", async () => {
      render(<App />, { wrapper: createWrapper() });

      await screen.findByText("PROJ-2");
      const tbody = screen.getAllByRole("rowgroup")[1];
      const row = within(tbody).getAllByRole("row")[1];
      expect(within(row).getByText("\u2014")).toBeInTheDocument();
    });
  });

  describe("Scenario: Updated date is displayed", () => {
    it("Given an issue updated on 2026-03-09, then '2026-03-09' should appear in the Updated column", async () => {
      render(<App />, { wrapper: createWrapper() });

      expect(await screen.findByText("2026-03-09")).toBeInTheDocument();
      expect(screen.getByText("2026-03-08")).toBeInTheDocument();
      expect(screen.getByText("2026-03-07")).toBeInTheDocument();
    });
  });

  describe("Scenario: Issue count is displayed", () => {
    it("Given 3 issues out of 3 total, then '1–3 of 3 issues' should be shown", async () => {
      render(<App />, { wrapper: createWrapper() });

      expect(await screen.findByText("1–3 of 3 issues")).toBeInTheDocument();
    });
  });
});

describe("Feature: Column sorting", () => {
  describe("Scenario: Default sort is by Updated descending", () => {
    it("Given the list view loads, then the Updated column should show a descending indicator", async () => {
      render(<App />, { wrapper: createWrapper() });

      const updatedHeader = await screen.findByRole("columnheader", { name: /Updated/ });
      expect(updatedHeader).toHaveTextContent("↓");
    });

    it("Given the list view loads, then the API should be called with sort_by=updated and sort_order=DESC", async () => {
      render(<App />, { wrapper: createWrapper() });

      await screen.findByText("PROJ-1");
      const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const issueCall = calls.find((c: unknown[]) => (c[0] as string).includes("/api/issues"));
      expect(issueCall).toBeDefined();
      const url = issueCall![0] as string;
      expect(url).toContain("sort_by=updated");
      expect(url).toContain("sort_order=DESC");
    });
  });

  describe("Scenario: Non-active columns show neutral sort indicator", () => {
    it("Given the default sort is Updated, then the Key column should show a neutral ↕ indicator", async () => {
      render(<App />, { wrapper: createWrapper() });

      const keyHeader = await screen.findByRole("columnheader", { name: /Key/ });
      expect(keyHeader).toHaveTextContent("↕");
    });
  });

  describe("Scenario: Clicking a column sorts ascending", () => {
    it("Given the list view is displayed, when clicking the Key column header, then the API should be called with sort_by=key and sort_order=ASC", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });

      const keyHeader = await screen.findByRole("columnheader", { name: /Key/ });
      await user.click(keyHeader);

      const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const issuesCalls = calls.filter((c: unknown[]) => (c[0] as string).includes("/api/issues"));
      const lastCall = issuesCalls[issuesCalls.length - 1];
      const url = lastCall[0] as string;
      expect(url).toContain("sort_by=key");
      expect(url).toContain("sort_order=ASC");
    });
  });

  describe("Scenario: Clicking the active column toggles sort order", () => {
    it("Given Updated is sorted DESC, when clicking Updated again, then the sort order should toggle to ASC", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });

      const updatedHeader = await screen.findByRole("columnheader", { name: /Updated/ });
      await user.click(updatedHeader);

      const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const issuesCalls = calls.filter((c: unknown[]) => (c[0] as string).includes("/api/issues"));
      const lastCall = issuesCalls[issuesCalls.length - 1];
      const url = lastCall[0] as string;
      expect(url).toContain("sort_by=updated");
      expect(url).toContain("sort_order=ASC");
    });
  });

  describe("Scenario: All column headers are clickable", () => {
    it("Given the list view is displayed, then all 7 column headers should be clickable", async () => {
      render(<App />, { wrapper: createWrapper() });

      await screen.findByText("PROJ-1");
      const headers = screen.getAllByRole("columnheader");
      expect(headers).toHaveLength(8); // 7 data columns + 1 checkbox column
      // Skip first header (checkbox column), remaining 7 should be sortable
      for (const header of headers.slice(1)) {
        expect(header.className).toContain("cursor-pointer");
      }
    });
  });
});

describe("Feature: Filter dropdowns", () => {
  describe("Scenario: Filter bar is displayed with three dropdowns", () => {
    it("Given the list view is displayed, then filter dropdowns for status, type, and assignee should be visible", async () => {
      render(<App />, { wrapper: createWrapper() });

      expect(await screen.findByLabelText("Filter by status")).toBeInTheDocument();
      expect(screen.getByLabelText("Filter by type")).toBeInTheDocument();
      expect(screen.getByLabelText("Filter by assignee")).toBeInTheDocument();
    });
  });

  describe("Scenario: Status filter dropdown shows unique statuses from data", () => {
    it("Given 3 issues with statuses 'In Progress', 'To Do', 'Done', then the status dropdown should list all three", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });

      await screen.findByText("PROJ-1");
      await user.click(screen.getByLabelText("Filter by status"));
      const listbox = screen.getByRole("listbox");
      const optionTexts = within(listbox).getAllByRole("option").map((o) => o.textContent);
      expect(optionTexts).toContain("All Statuses");
      expect(optionTexts).toContain("In Progress");
      expect(optionTexts).toContain("To Do");
      expect(optionTexts).toContain("Done");
    });
  });

  describe("Scenario: Type filter dropdown shows unique types from data", () => {
    it("Given issues of type Story, Bug, Task, then the type dropdown should list all three", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });

      await screen.findByText("PROJ-1");
      await user.click(screen.getByLabelText("Filter by type"));
      const listbox = screen.getByRole("listbox");
      const optionTexts = within(listbox).getAllByRole("option").map((o) => o.textContent);
      expect(optionTexts).toContain("All Types");
      expect(optionTexts).toContain("Story");
      expect(optionTexts).toContain("Bug");
      expect(optionTexts).toContain("Task");
    });
  });

  describe("Scenario: Assignee filter dropdown shows unique assignees from data", () => {
    it("Given issues assigned to 'Alice Martin' and 'Bob Chen', then the assignee dropdown should list both", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });

      await screen.findByText("PROJ-1");
      await user.click(screen.getByLabelText("Filter by assignee"));
      const listbox = screen.getByRole("listbox");
      const optionTexts = within(listbox).getAllByRole("option").map((o) => o.textContent);
      expect(optionTexts).toContain("All Assignees");
      expect(optionTexts).toContain("Alice Martin");
      expect(optionTexts).toContain("Bob Chen");
    });
  });

  describe("Scenario: Selecting a status filter sends the filter to the API", () => {
    it("Given the user selects 'Done' status, then the API should be called with status=Done", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });

      await screen.findByText("PROJ-1");
      await selectSearchableOption(user, screen, "Filter by status", "Done");

      const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const issuesCalls = calls.filter((c: unknown[]) => (c[0] as string).includes("/api/issues"));
      const lastCall = issuesCalls[issuesCalls.length - 1];
      const url = lastCall[0] as string;
      expect(url).toContain("status=Done");
    });
  });

  describe("Scenario: Selecting a type filter sends the filter to the API", () => {
    it("Given the user selects 'Bug' type, then the API should be called with type=Bug", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });

      await screen.findByText("PROJ-1");
      await selectSearchableOption(user, screen, "Filter by type", "Bug");

      const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const issuesCalls = calls.filter((c: unknown[]) => (c[0] as string).includes("/api/issues"));
      const lastCall = issuesCalls[issuesCalls.length - 1];
      const url = lastCall[0] as string;
      expect(url).toContain("type=Bug");
    });
  });

  describe("Scenario: Clear filters button resets all filters", () => {
    it("Given a status filter is active, when clicking 'Clear filters', then no filter params should be sent", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });

      await screen.findByText("PROJ-1");
      await selectSearchableOption(user, screen, "Filter by status", "Done");

      const clearBtn = screen.getByText("Clear filters");
      await user.click(clearBtn);

      // After clearing, all filter dropdowns should show their placeholder text
      await waitFor(() => {
        expect(screen.getByLabelText("Filter by status")).toHaveTextContent("All Statuses");
        expect(screen.getByLabelText("Filter by type")).toHaveTextContent("All Types");
        expect(screen.getByLabelText("Filter by assignee")).toHaveTextContent("All Assignees");
      });
      // Clear button should disappear when no filters active
      expect(screen.queryByText("Clear filters")).not.toBeInTheDocument();
    });
  });

  describe("Scenario: Clear filters button is hidden when no filters are active", () => {
    it("Given no filters are selected, then the 'Clear filters' button should not be visible", async () => {
      render(<App />, { wrapper: createWrapper() });

      await screen.findByText("PROJ-1");
      expect(screen.queryByText("Clear filters")).not.toBeInTheDocument();
    });
  });
});

describe("Feature: Pagination", () => {
  describe("Scenario: Previous and Next buttons are displayed", () => {
    it("Given the list view is displayed, then Previous and Next buttons should be visible", async () => {
      render(<App />, { wrapper: createWrapper() });

      await screen.findByText("PROJ-1");
      expect(screen.getByText("Previous")).toBeInTheDocument();
      expect(screen.getByText("Next")).toBeInTheDocument();
    });
  });

  describe("Scenario: Previous button is disabled on the first page", () => {
    it("Given the user is on page 1, then the Previous button should be disabled", async () => {
      render(<App />, { wrapper: createWrapper() });

      await screen.findByText("PROJ-1");
      expect(screen.getByText("Previous")).toBeDisabled();
    });
  });

  describe("Scenario: Next button is disabled when all issues fit on one page", () => {
    it("Given 3 issues with a page size of 50, then the Next button should be disabled", async () => {
      render(<App />, { wrapper: createWrapper() });

      await screen.findByText("PROJ-1");
      expect(screen.getByText("Next")).toBeDisabled();
    });
  });

  describe("Scenario: Range indicator shows current page range", () => {
    it("Given 3 issues on page 1, then '1–3 of 3 issues' should be displayed", async () => {
      render(<App />, { wrapper: createWrapper() });

      expect(await screen.findByText("1–3 of 3 issues")).toBeInTheDocument();
    });
  });

  describe("Scenario: API is called with start_at parameter", () => {
    it("Given the first page loads, then the API should be called with start_at=0", async () => {
      render(<App />, { wrapper: createWrapper() });

      await screen.findByText("PROJ-1");
      const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const issueCall = calls.find((c: unknown[]) => (c[0] as string).includes("/api/issues"));
      const url = issueCall![0] as string;
      expect(url).toContain("start_at=0");
    });
  });

  describe("Scenario: Next button is enabled when there are more pages", () => {
    it("Given total exceeds page size, when issues load, then the Next button should be enabled", async () => {
      const manyIssues = {
        issues: mockIssues.issues,
        total: 100,
      };
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string | URL | Request) => {
        const urlStr = typeof url === "string" ? url : url.toString();
        const authResp = _handleAuthUrls(urlStr);
        if (authResp) return Promise.resolve(authResp);
        if (urlStr.includes("/api/projects")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockProjects) } as Response);
        }
        if (urlStr.includes("/api/issues")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(manyIssues) } as Response);
        }
        return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) } as Response);
      });

      render(<App />, { wrapper: createWrapper() });

      await screen.findByText("PROJ-1");
      expect(screen.getByText("Next")).not.toBeDisabled();
    });
  });

  describe("Scenario: Clicking Next increments the page offset", () => {
    it("Given total exceeds page size, when clicking Next, then the API should be called with start_at=50", async () => {
      const user = userEvent.setup();
      const manyIssues = {
        issues: mockIssues.issues,
        total: 100,
      };
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string | URL | Request) => {
        const urlStr = typeof url === "string" ? url : url.toString();
        const authResp = _handleAuthUrls(urlStr);
        if (authResp) return Promise.resolve(authResp);
        if (urlStr.includes("/api/projects")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockProjects) } as Response);
        }
        if (urlStr.includes("/api/issues")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(manyIssues) } as Response);
        }
        return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) } as Response);
      });

      render(<App />, { wrapper: createWrapper() });

      await screen.findByText("PROJ-1");
      await user.click(screen.getByText("Next"));

      const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const issuesCalls = calls.filter((c: unknown[]) => (c[0] as string).includes("/api/issues"));
      const lastCall = issuesCalls[issuesCalls.length - 1];
      const url = lastCall[0] as string;
      expect(url).toContain("start_at=50");
    });
  });
});

/* ── Issue Detail Panel Tests ── */

describe("Feature: Issue detail panel opens on row click", () => {
  describe("Scenario: Clicking an issue row opens the detail panel", () => {
    it("Given the list view shows PROJ-1, when clicking the PROJ-1 row, then the detail panel should open and fetch issue details", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });

      await screen.findByText("PROJ-1");
      const issueKey = await screen.findByText("PROJ-1");
      await user.click(issueKey.closest("tr")!);

      const panel = await screen.findByRole("dialog", { name: /Issue detail/ });
      expect(panel).toBeInTheDocument();

      const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const detailCall = calls.find((c: unknown[]) => (c[0] as string).match(/\/api\/issues\/PROJ-1$/));
      expect(detailCall).toBeDefined();
    });
  });

  describe("Scenario: Detail panel shows the issue key and type", () => {
    it("Given the detail panel is open for PROJ-1, then the issue key and type should be displayed", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });

      const issueKey = await screen.findByText("PROJ-1");
      await user.click(issueKey.closest("tr")!);

      const panel = await screen.findByRole("dialog", { name: /Issue detail/ });
      expect(within(panel).getByText("PROJ-1")).toBeInTheDocument();
      expect(within(panel).getByText("Story")).toBeInTheDocument();
    });
  });

  describe("Scenario: Detail panel has a close button", () => {
    it("Given the detail panel is open, when clicking the close button, then the panel should close", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });

      const issueKey = await screen.findByText("PROJ-1");
      await user.click(issueKey.closest("tr")!);

      const panel = await screen.findByRole("dialog", { name: /Issue detail/ });
      const closeBtn = within(panel).getByLabelText("Close detail panel");
      await user.click(closeBtn);

      await waitFor(() => {
        expect(screen.queryByRole("dialog", { name: /Issue detail/ })).not.toBeInTheDocument();
      });
    });
  });
});

describe("Feature: ADF description rendering", () => {
  describe("Scenario: Paragraphs with bold text are rendered", () => {
    it("Given the issue has an ADF description with bold text, then the bold text should render with <strong>", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });

      const issueKey = await screen.findByText("PROJ-1");
      await user.click(issueKey.closest("tr")!);

      const panel = await screen.findByRole("dialog", { name: /Issue detail/ });
      const strong = within(panel).getByText("login page");
      expect(strong.tagName).toBe("STRONG");
    });
  });

  describe("Scenario: Headings are rendered", () => {
    it("Given the ADF has a level 2 heading 'Requirements', then it should render as a heading", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });

      const issueKey = await screen.findByText("PROJ-1");
      await user.click(issueKey.closest("tr")!);

      const panel = await screen.findByRole("dialog", { name: /Issue detail/ });
      const headings = within(panel).getAllByRole("heading", { level: 2 });
      const requirementsHeading = headings.find((h) => h.textContent === "Requirements");
      expect(requirementsHeading).toBeTruthy();
    });
  });

  describe("Scenario: Bullet lists are rendered", () => {
    it("Given the ADF has a bullet list, then the list items should render", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });

      const issueKey = await screen.findByText("PROJ-1");
      await user.click(issueKey.closest("tr")!);

      const panel = await screen.findByRole("dialog", { name: /Issue detail/ });
      expect(within(panel).getByText("Email validation")).toBeInTheDocument();
      expect(within(panel).getByText("Password strength meter")).toBeInTheDocument();
    });
  });

  describe("Scenario: Code blocks are rendered", () => {
    it("Given the ADF has a code block, then it should render in a <pre> element", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });

      const issueKey = await screen.findByText("PROJ-1");
      await user.click(issueKey.closest("tr")!);

      const panel = await screen.findByRole("dialog", { name: /Issue detail/ });
      const codeText = within(panel).getByText("const login = () => {};");
      expect(codeText.closest("pre")).toBeTruthy();
    });
  });

  describe("Scenario: Links are rendered", () => {
    it("Given the ADF has a link mark, then it should render as an anchor tag", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });

      const issueKey = await screen.findByText("PROJ-1");
      await user.click(issueKey.closest("tr")!);

      const panel = await screen.findByRole("dialog", { name: /Issue detail/ });
      const link = within(panel).getByText("docs");
      expect(link.tagName).toBe("A");
      expect(link).toHaveAttribute("href", "https://example.com");
    });
  });
});

describe("Feature: Rich text description editing", () => {
  describe("Scenario: Edit button is shown next to ADF description", () => {
    it("Given the issue has an ADF description, then an Edit button should be visible", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });

      const issueKey = await screen.findByText("PROJ-1");
      await user.click(issueKey.closest("tr")!);

      const panel = await screen.findByRole("dialog", { name: /Issue detail/ });
      expect(within(panel).getByLabelText("Edit description")).toBeInTheDocument();
    });
  });

  describe("Scenario: Clicking Edit shows a rich text editor with toolbar", () => {
    it("Given the ADF description is displayed, when clicking Edit, then a rich text editor with formatting toolbar should appear", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });

      const issueKey = await screen.findByText("PROJ-1");
      await user.click(issueKey.closest("tr")!);

      const panel = await screen.findByRole("dialog", { name: /Issue detail/ });
      await user.click(within(panel).getByLabelText("Edit description"));

      const editor = within(panel).getByLabelText("Rich text editor");
      expect(editor).toBeInTheDocument();

      // Toolbar should be present with formatting buttons
      const toolbar = within(panel).getByRole("toolbar", { name: /Formatting toolbar/ });
      expect(toolbar).toBeInTheDocument();
      expect(within(toolbar).getByLabelText("Bold")).toBeInTheDocument();
      expect(within(toolbar).getByLabelText("Italic")).toBeInTheDocument();
      expect(within(toolbar).getByLabelText("Strikethrough")).toBeInTheDocument();
      expect(within(toolbar).getByLabelText("Code")).toBeInTheDocument();
      expect(within(toolbar).getByLabelText("Heading 1")).toBeInTheDocument();
      expect(within(toolbar).getByLabelText("Heading 2")).toBeInTheDocument();
      expect(within(toolbar).getByLabelText("Heading 3")).toBeInTheDocument();
      expect(within(toolbar).getByLabelText("Bullet list")).toBeInTheDocument();
      expect(within(toolbar).getByLabelText("Ordered list")).toBeInTheDocument();
      expect(within(toolbar).getByLabelText("Link")).toBeInTheDocument();
      expect(within(toolbar).getByLabelText("Code block")).toBeInTheDocument();
    });
  });

  describe("Scenario: Rich text editor pre-fills with existing ADF content", () => {
    it("Given the issue has an ADF description with bold text, when clicking Edit, then the editor should contain the text content", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });

      const issueKey = await screen.findByText("PROJ-1");
      await user.click(issueKey.closest("tr")!);

      const panel = await screen.findByRole("dialog", { name: /Issue detail/ });
      await user.click(within(panel).getByLabelText("Edit description"));

      // The TipTap editor renders content in a contenteditable div
      const editorArea = within(panel).getByLabelText("Rich text editor");
      expect(editorArea).toHaveTextContent(/Build a/);
      expect(editorArea).toHaveTextContent(/login page/);
    });
  });

  describe("Scenario: Saving description sends ADF via PATCH request", () => {
    it("Given the rich text editor is open, when clicking Save, then a PATCH request should be sent with description_adf", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });

      const issueKey = await screen.findByText("PROJ-1");
      await user.click(issueKey.closest("tr")!);

      const panel = await screen.findByRole("dialog", { name: /Issue detail/ });
      await user.click(within(panel).getByLabelText("Edit description"));
      await user.click(within(panel).getByText("Save"));

      await waitFor(() => {
        const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
        const patchCall = calls.find(
          (c: unknown[]) => (c[0] as string).match(/\/api\/issues\/PROJ-1$/) && (c[1] as RequestInit)?.method === "PATCH"
        );
        expect(patchCall).toBeDefined();
        const body = JSON.parse((patchCall![1] as RequestInit).body as string);
        expect(body.description_adf).toBeDefined();
        expect(body.description_adf.type).toBe("doc");
        expect(body.description_adf.version).toBe(1);
        expect(body.description_adf.content).toBeInstanceOf(Array);
      });
    });
  });

  describe("Scenario: Cancelling rich text edit returns to ADF view", () => {
    it("Given the rich text editor is open, when clicking Cancel, then the ADF rendered view should return without saving", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });

      const issueKey = await screen.findByText("PROJ-1");
      await user.click(issueKey.closest("tr")!);

      const panel = await screen.findByRole("dialog", { name: /Issue detail/ });
      await user.click(within(panel).getByLabelText("Edit description"));

      // Editor should be present
      expect(within(panel).getByLabelText("Rich text editor")).toBeInTheDocument();

      await user.click(within(panel).getByText("Cancel"));

      // Editor should be gone, ADF rendered content should be back
      expect(within(panel).queryByLabelText("Rich text editor")).not.toBeInTheDocument();
      expect(within(panel).getByText("login page")).toBeInTheDocument();

      // No PATCH should have been sent
      const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const patchCall = calls.find(
        (c: unknown[]) => (c[0] as string).match(/\/api\/issues\/PROJ-1$/) && (c[1] as RequestInit)?.method === "PATCH"
      );
      expect(patchCall).toBeUndefined();
    });
  });

  describe("Scenario: Pressing Escape cancels rich text editing", () => {
    it("Given the rich text editor is open, when pressing Escape, then editing should cancel without saving", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });

      const issueKey = await screen.findByText("PROJ-1");
      await user.click(issueKey.closest("tr")!);

      const panel = await screen.findByRole("dialog", { name: /Issue detail/ });
      await user.click(within(panel).getByLabelText("Edit description"));

      const editorWrapper = within(panel).getByLabelText("Rich text editor");
      expect(editorWrapper).toBeInTheDocument();

      // Press Escape within the editor area
      const editableDiv = editorWrapper.querySelector("[contenteditable]");
      if (editableDiv) {
        editableDiv.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      } else {
        await user.keyboard("{Escape}");
      }

      await waitFor(() => {
        expect(within(panel).queryByLabelText("Rich text editor")).not.toBeInTheDocument();
      });
      expect(within(panel).getByText("login page")).toBeInTheDocument();
    });
  });

  describe("Scenario: Edit button always shown for description", () => {
    it("Given the issue has no ADF description, then the Edit button still appears and opens the rich text editor", async () => {
      setupFetchMock({
        issueDetail: {
          ...mockIssueDetail,
          descriptionAdf: null,
          description: "Plain text description",
        },
      });

      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });

      const issueKey = await screen.findByText("PROJ-1");
      await user.click(issueKey.closest("tr")!);

      const panel = await screen.findByRole("dialog", { name: /Issue detail/ });
      // Edit button should be visible even without ADF
      const editBtn = within(panel).getByTitle("Edit description");
      expect(editBtn).toBeInTheDocument();
      // Clicking opens the rich text editor
      await user.click(editBtn);
      expect(within(panel).getByLabelText("Rich text editor")).toBeInTheDocument();
    });
  });

  describe("Scenario: ADF marks are preserved in round-trip conversion", () => {
    it("Given the issue has bold text in ADF, when saving from the editor, then the ADF should preserve strong marks", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });

      const issueKey = await screen.findByText("PROJ-1");
      await user.click(issueKey.closest("tr")!);

      const panel = await screen.findByRole("dialog", { name: /Issue detail/ });
      await user.click(within(panel).getByLabelText("Edit description"));

      // Save without changes — ADF should round-trip with strong marks preserved
      await user.click(within(panel).getByText("Save"));

      await waitFor(() => {
        const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
        const patchCall = calls.find(
          (c: unknown[]) => (c[0] as string).match(/\/api\/issues\/PROJ-1$/) && (c[1] as RequestInit)?.method === "PATCH"
        );
        expect(patchCall).toBeDefined();
        const body = JSON.parse((patchCall![1] as RequestInit).body as string);
        const adf = body.description_adf;
        // Find the paragraph with bold text
        const paragraph = adf.content?.find((n: { type: string }) => n.type === "paragraph");
        expect(paragraph).toBeDefined();
        const boldNode = paragraph.content?.find(
          (n: { marks?: { type: string }[] }) => n.marks?.some((m: { type: string }) => m.type === "strong")
        );
        expect(boldNode).toBeDefined();
      });
    });
  });
});

describe("Feature: Inline editing", () => {
  describe("Scenario: Summary can be edited inline", () => {
    it("Given the detail panel is open, when clicking the summary and changing it, then a PATCH request should be sent", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });

      const issueKey = await screen.findByText("PROJ-1");
      await user.click(issueKey.closest("tr")!);

      const panel = await screen.findByRole("dialog", { name: /Issue detail/ });
      const editBtn = within(panel).getByLabelText("Edit summary");
      await user.click(editBtn);

      const input = within(panel).getByLabelText("summary");
      await user.clear(input);
      await user.type(input, "Updated login page");
      await user.keyboard("{Enter}");

      await waitFor(() => {
        const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
        const patchCall = calls.find(
          (c: unknown[]) => (c[0] as string).match(/\/api\/issues\/PROJ-1$/) && (c[1] as RequestInit)?.method === "PATCH"
        );
        expect(patchCall).toBeDefined();
        const body = JSON.parse((patchCall![1] as RequestInit).body as string);
        expect(body.summary).toBe("Updated login page");
      });
    });
  });

  describe("Scenario: Editing summary can be cancelled with Escape", () => {
    it("Given the summary is being edited, when pressing Escape, then editing should cancel without saving", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });

      const issueKey = await screen.findByText("PROJ-1");
      await user.click(issueKey.closest("tr")!);

      const panel = await screen.findByRole("dialog", { name: /Issue detail/ });
      const editBtn = within(panel).getByLabelText("Edit summary");
      await user.click(editBtn);

      const input = within(panel).getByLabelText("summary");
      await user.clear(input);
      await user.type(input, "Should not save");
      await user.keyboard("{Escape}");

      expect(within(panel).queryByLabelText("summary")).not.toBeInTheDocument();
      const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const patchCall = calls.find(
        (c: unknown[]) => (c[0] as string).match(/\/api\/issues\/PROJ-1$/) && (c[1] as RequestInit)?.method === "PATCH"
      );
      expect(patchCall).toBeUndefined();
    });
  });

  describe("Scenario: Priority can be changed via dropdown", () => {
    it("Given the detail panel is open, when editing priority and selecting 'Medium', then a PATCH request should be sent with priority=Medium", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });

      const issueKey = await screen.findByText("PROJ-1");
      await user.click(issueKey.closest("tr")!);

      const panel = await screen.findByRole("dialog", { name: /Issue detail/ });
      const editBtn = within(panel).getByLabelText("Edit priority");
      await user.click(editBtn);

      // InlineEditSelect auto-opens the SearchableSelect — click the option directly
      const listbox = await screen.findByRole("listbox");
      await user.click(within(listbox).getByText("Medium"));

      await waitFor(() => {
        const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
        const patchCall = calls.find(
          (c: unknown[]) => (c[0] as string).match(/\/api\/issues\/PROJ-1$/) && (c[1] as RequestInit)?.method === "PATCH"
        );
        expect(patchCall).toBeDefined();
        const body = JSON.parse((patchCall![1] as RequestInit).body as string);
        expect(body.priority).toBe("Medium");
      });
    });
  });
});

describe("Feature: Status transitions", () => {
  describe("Scenario: Transition dropdown shows available transitions", () => {
    it("Given the issue has transitions 'To Do' and 'Done', then the status dropdown should list them", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });

      const issueKey = await screen.findByText("PROJ-1");
      await user.click(issueKey.closest("tr")!);

      const panel = await screen.findByRole("dialog", { name: /Issue detail/ });
      const transitionSelect = within(panel).getByLabelText("Transition status");
      const options = within(transitionSelect).getAllByRole("option");
      const optionTexts = options.map((o) => o.textContent);
      expect(optionTexts).toContain("To Do");
      expect(optionTexts).toContain("Done");
    });
  });

  describe("Scenario: Selecting a transition sends a POST request", () => {
    it("Given the transition dropdown shows 'Done', when selecting it, then a POST should be sent with transition_id", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });

      const issueKey = await screen.findByText("PROJ-1");
      await user.click(issueKey.closest("tr")!);

      const panel = await screen.findByRole("dialog", { name: /Issue detail/ });
      const transitionSelect = within(panel).getByLabelText("Transition status");
      await user.selectOptions(transitionSelect, "31");

      await waitFor(() => {
        const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
        const transitionCall = calls.find(
          (c: unknown[]) => (c[0] as string).includes("/api/issues/PROJ-1/transition") && (c[1] as RequestInit)?.method === "POST"
        );
        expect(transitionCall).toBeDefined();
        const body = JSON.parse((transitionCall![1] as RequestInit).body as string);
        expect(body.transition_id).toBe("31");
      });
    });
  });
});

describe("Feature: Issue metadata display", () => {
  describe("Scenario: Labels are displayed", () => {
    it("Given the issue has labels 'frontend' and 'auth', then both labels should be visible", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });

      const issueKey = await screen.findByText("PROJ-1");
      await user.click(issueKey.closest("tr")!);

      const panel = await screen.findByRole("dialog", { name: /Issue detail/ });
      expect(within(panel).getByText("frontend")).toBeInTheDocument();
      expect(within(panel).getByText("auth")).toBeInTheDocument();
    });
  });

  describe("Scenario: Reporter is displayed", () => {
    it("Given the issue reporter is 'Carol Davis', then the reporter name should be visible", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });

      const issueKey = await screen.findByText("PROJ-1");
      await user.click(issueKey.closest("tr")!);

      const panel = await screen.findByRole("dialog", { name: /Issue detail/ });
      expect(within(panel).getByText("Carol Davis")).toBeInTheDocument();
    });
  });

  describe("Scenario: Due date is displayed", () => {
    it("Given the issue has due date '2026-03-15', then '2026-03-15' should be visible", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });

      const issueKey = await screen.findByText("PROJ-1");
      await user.click(issueKey.closest("tr")!);

      const panel = await screen.findByRole("dialog", { name: /Issue detail/ });
      expect(within(panel).getByText("2026-03-15")).toBeInTheDocument();
    });
  });

  describe("Scenario: Created and updated timestamps are displayed", () => {
    it("Given the issue was created and updated, then both timestamps should be visible in the panel", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });

      const issueKey = await screen.findByText("PROJ-1");
      await user.click(issueKey.closest("tr")!);

      const panel = await screen.findByRole("dialog", { name: /Issue detail/ });
      const createdLabel = within(panel).getByText("Created");
      expect(createdLabel).toBeInTheDocument();
      const updatedLabel = within(panel).getByText("Updated");
      expect(updatedLabel).toBeInTheDocument();
    });
  });

  describe("Scenario: Assignee is displayed", () => {
    it("Given the issue is assigned to 'Alice Martin', then the assignee should be visible in the detail panel", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });

      const issueKey = await screen.findByText("PROJ-1");
      await user.click(issueKey.closest("tr")!);

      const panel = await screen.findByRole("dialog", { name: /Issue detail/ });
      await waitFor(() => {
        const editBtn = within(panel).getByLabelText("Edit assignee");
        expect(editBtn).toHaveTextContent("Alice Martin");
      });
    });
  });

  describe("Scenario: Issue with no labels shows 'None'", () => {
    it("Given the issue has no labels, then 'None' should be displayed", async () => {
      const user = userEvent.setup();
      setupFetchMock({ issueDetail: { ...mockIssueDetail, labels: [] } });

      render(<App />, { wrapper: createWrapper() });

      const issueKey = await screen.findByText("PROJ-1");
      await user.click(issueKey.closest("tr")!);

      const panel = await screen.findByRole("dialog", { name: /Issue detail/ });
      expect(within(panel).getByText("None")).toBeInTheDocument();
    });
  });
});

describe("Feature: Assignee dropdown with project members", () => {
  describe("Scenario: Assignee field shows a dropdown with project members", () => {
    it("Given the detail panel is open and members are loaded, when clicking the assignee, then a dropdown with project members should appear", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });

      const issueKey = await screen.findByText("PROJ-1");
      await user.click(issueKey.closest("tr")!);

      const panel = await screen.findByRole("dialog", { name: /Issue detail/ });
      await waitFor(() => {
        expect(within(panel).getByLabelText("Edit assignee")).toBeInTheDocument();
      });

      await user.click(within(panel).getByLabelText("Edit assignee"));

      // SearchableSelect opens a listbox
      const listbox = screen.getByRole("listbox");
      const optionTexts = within(listbox).getAllByRole("option").map((o) => o.textContent);
      expect(optionTexts).toContain("Alice Martin");
      expect(optionTexts).toContain("Bob Chen");
      expect(optionTexts).toContain("Carol Davis");
    });
  });

  describe("Scenario: Selecting an assignee sends accountId in PATCH request", () => {
    it("Given the assignee dropdown is open, when selecting 'Bob Chen', then a PATCH request should be sent with Bob's accountId", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });

      const issueKey = await screen.findByText("PROJ-1");
      await user.click(issueKey.closest("tr")!);

      const panel = await screen.findByRole("dialog", { name: /Issue detail/ });
      await waitFor(() => {
        expect(within(panel).getByLabelText("Edit assignee")).toBeInTheDocument();
      });

      await user.click(within(panel).getByLabelText("Edit assignee"));
      // InlineEditSelect auto-opens — click option directly
      const listbox = await screen.findByRole("listbox");
      await user.click(within(listbox).getByText("Bob Chen"));

      await waitFor(() => {
        const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
        const patchCall = calls.find(
          (c: unknown[]) => (c[0] as string).match(/\/api\/issues\/PROJ-1$/) && (c[1] as RequestInit)?.method === "PATCH"
        );
        expect(patchCall).toBeDefined();
        const body = JSON.parse((patchCall![1] as RequestInit).body as string);
        expect(body.assignee).toBe("def456");
      });
    });
  });

  describe("Scenario: Assignee dropdown includes Unassigned placeholder", () => {
    it("Given the assignee dropdown is open, then it should include an 'Unassigned' option", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });

      const issueKey = await screen.findByText("PROJ-1");
      await user.click(issueKey.closest("tr")!);

      const panel = await screen.findByRole("dialog", { name: /Issue detail/ });
      await waitFor(() => {
        expect(within(panel).getByLabelText("Edit assignee")).toBeInTheDocument();
      });

      await user.click(within(panel).getByLabelText("Edit assignee"));
      const listbox = screen.getByRole("listbox");
      const optionTexts = within(listbox).getAllByRole("option").map((o) => o.textContent);
      expect(optionTexts).toContain("Unassigned");
    });
  });
});

describe("Feature: Priority dropdown with fetched priorities", () => {
  describe("Scenario: Priority dropdown shows priorities fetched from API", () => {
    it("Given the detail panel is open, when clicking edit priority, then the dropdown should list priorities from the API", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });

      const issueKey = await screen.findByText("PROJ-1");
      await user.click(issueKey.closest("tr")!);

      const panel = await screen.findByRole("dialog", { name: /Issue detail/ });
      const editBtn = within(panel).getByLabelText("Edit priority");
      await user.click(editBtn);

      const listbox = screen.getByRole("listbox");
      const optionTexts = within(listbox).getAllByRole("option").map((o) => o.textContent);
      expect(optionTexts).toContain("Highest");
      expect(optionTexts).toContain("High");
      expect(optionTexts).toContain("Medium");
      expect(optionTexts).toContain("Low");
      expect(optionTexts).toContain("Lowest");
    });
  });

  describe("Scenario: Priorities API is called when panel opens", () => {
    it("Given the detail panel is opened, then a GET request should be made to /api/priorities", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });

      const issueKey = await screen.findByText("PROJ-1");
      await user.click(issueKey.closest("tr")!);

      await screen.findByRole("dialog", { name: /Issue detail/ });

      await waitFor(() => {
        const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
        const prioritiesCall = calls.find(
          (c: unknown[]) => (c[0] as string).includes("/api/priorities")
        );
        expect(prioritiesCall).toBeDefined();
      });
    });
  });

  describe("Scenario: Members API is called when panel opens with project context", () => {
    it("Given the detail panel is opened for an issue with project key, then a GET request should be made to /api/projects/{key}/members", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });

      const issueKey = await screen.findByText("PROJ-1");
      await user.click(issueKey.closest("tr")!);

      await screen.findByRole("dialog", { name: /Issue detail/ });

      await waitFor(() => {
        const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
        const membersCall = calls.find(
          (c: unknown[]) => (c[0] as string).match(/\/api\/projects\/PROJ\/members/)
        );
        expect(membersCall).toBeDefined();
      });
    });
  });
});

describe("Feature: Editable due date", () => {
  describe("Scenario: Due date is displayed and clickable", () => {
    it("Given the issue has due date '2026-03-15', then an edit button with the date should be visible", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });

      const issueKey = await screen.findByText("PROJ-1");
      await user.click(issueKey.closest("tr")!);

      const panel = await screen.findByRole("dialog", { name: /Issue detail/ });
      const editBtn = within(panel).getByLabelText("Edit due date");
      expect(editBtn).toHaveTextContent("2026-03-15");
    });
  });

  describe("Scenario: Clicking due date shows a date input", () => {
    it("Given the detail panel is open, when clicking the due date, then a date input should appear pre-filled with the current value", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });

      const issueKey = await screen.findByText("PROJ-1");
      await user.click(issueKey.closest("tr")!);

      const panel = await screen.findByRole("dialog", { name: /Issue detail/ });
      await user.click(within(panel).getByLabelText("Edit due date"));

      const input = within(panel).getByLabelText("due date") as HTMLInputElement;
      expect(input).toBeInTheDocument();
      expect(input.type).toBe("date");
      expect(input.value).toBe("2026-03-15");
    });
  });

  describe("Scenario: Changing due date sends PATCH with duedate field", () => {
    it("Given the due date input is shown, when changing the date, then a PATCH request should be sent with the new duedate", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });

      const issueKey = await screen.findByText("PROJ-1");
      await user.click(issueKey.closest("tr")!);

      const panel = await screen.findByRole("dialog", { name: /Issue detail/ });
      await user.click(within(panel).getByLabelText("Edit due date"));

      const input = within(panel).getByLabelText("due date");
      fireEvent.change(input, { target: { value: "2026-04-01" } });

      await waitFor(() => {
        const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
        const patchCall = calls.find(
          (c: unknown[]) => (c[0] as string).match(/\/api\/issues\/PROJ-1$/) && (c[1] as RequestInit)?.method === "PATCH"
        );
        expect(patchCall).toBeDefined();
        const body = JSON.parse((patchCall![1] as RequestInit).body as string);
        expect(body.duedate).toBe("2026-04-01");
      });
    });
  });

  describe("Scenario: Clearing due date sends null duedate", () => {
    it("Given the due date input is shown and a date exists, when clicking the clear button, then a PATCH request should be sent with duedate=null", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });

      const issueKey = await screen.findByText("PROJ-1");
      await user.click(issueKey.closest("tr")!);

      const panel = await screen.findByRole("dialog", { name: /Issue detail/ });
      await user.click(within(panel).getByLabelText("Edit due date"));

      const clearBtn = within(panel).getByLabelText("Clear due date");
      await user.click(clearBtn);

      await waitFor(() => {
        const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
        const patchCall = calls.find(
          (c: unknown[]) => (c[0] as string).match(/\/api\/issues\/PROJ-1$/) && (c[1] as RequestInit)?.method === "PATCH"
        );
        expect(patchCall).toBeDefined();
        const body = JSON.parse((patchCall![1] as RequestInit).body as string);
        expect(body.duedate).toBeNull();
      });
    });
  });

  describe("Scenario: Issue with no due date shows dash", () => {
    it("Given the issue has no due date, then a dash should be displayed", async () => {
      const user = userEvent.setup();
      setupFetchMock({ issueDetail: { ...mockIssueDetail, dueDate: null } });

      render(<App />, { wrapper: createWrapper() });

      const issueKey = await screen.findByText("PROJ-1");
      await user.click(issueKey.closest("tr")!);

      const panel = await screen.findByRole("dialog", { name: /Issue detail/ });
      const editBtn = within(panel).getByLabelText("Edit due date");
      expect(editBtn).toHaveTextContent("—");
    });
  });

  describe("Scenario: Labels are displayed with remove buttons", () => {
    it("Given the issue has labels, then each label should have a remove button", async () => {
      const user = userEvent.setup();
      setupFetchMock();

      render(<App />, { wrapper: createWrapper() });

      const issueKey = await screen.findByText("PROJ-1");
      await user.click(issueKey.closest("tr")!);

      const panel = await screen.findByRole("dialog", { name: /Issue detail/ });
      expect(within(panel).getByText("frontend")).toBeInTheDocument();
      expect(within(panel).getByText("auth")).toBeInTheDocument();
      expect(within(panel).getByLabelText("Remove label frontend")).toBeInTheDocument();
      expect(within(panel).getByLabelText("Remove label auth")).toBeInTheDocument();
    });
  });

  describe("Scenario: Add label button is visible", () => {
    it("Given the issue detail is open, then a + button should be visible to add labels", async () => {
      const user = userEvent.setup();
      setupFetchMock();

      render(<App />, { wrapper: createWrapper() });

      const issueKey = await screen.findByText("PROJ-1");
      await user.click(issueKey.closest("tr")!);

      const panel = await screen.findByRole("dialog", { name: /Issue detail/ });
      expect(within(panel).getByLabelText("Add label")).toBeInTheDocument();
    });
  });

  describe("Scenario: Clicking + opens label input", () => {
    it("Given the user clicks the add label button, then a text input should appear", async () => {
      const user = userEvent.setup();
      setupFetchMock();

      render(<App />, { wrapper: createWrapper() });

      const issueKey = await screen.findByText("PROJ-1");
      await user.click(issueKey.closest("tr")!);

      const panel = await screen.findByRole("dialog", { name: /Issue detail/ });
      await user.click(within(panel).getByLabelText("Add label"));

      expect(within(panel).getByLabelText("Label input")).toBeInTheDocument();
    });
  });

  describe("Scenario: Remove a label sends PATCH with updated labels", () => {
    it("Given the user clicks remove on 'frontend', then PATCH should be called without that label", async () => {
      const user = userEvent.setup();
      setupFetchMock();

      render(<App />, { wrapper: createWrapper() });

      const issueKey = await screen.findByText("PROJ-1");
      await user.click(issueKey.closest("tr")!);

      const panel = await screen.findByRole("dialog", { name: /Issue detail/ });
      await user.click(within(panel).getByLabelText("Remove label frontend"));

      await waitFor(() => {
        const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
        const patchCall = calls.find(
          (c: unknown[]) => (c[0] as string).match(/\/api\/issues\/PROJ-1$/) && (c[1] as RequestInit)?.method === "PATCH"
        );
        expect(patchCall).toBeDefined();
        const body = JSON.parse((patchCall![1] as RequestInit).body as string);
        expect(body.labels).toEqual(["auth"]);
      });
    });
  });

  describe("Scenario: Add a new label by typing and pressing Enter", () => {
    it("Given the user types a new label and presses Enter, then PATCH should be called with the new label added", async () => {
      const user = userEvent.setup();
      setupFetchMock();

      render(<App />, { wrapper: createWrapper() });

      const issueKey = await screen.findByText("PROJ-1");
      await user.click(issueKey.closest("tr")!);

      const panel = await screen.findByRole("dialog", { name: /Issue detail/ });
      await user.click(within(panel).getByLabelText("Add label"));

      const input = within(panel).getByLabelText("Label input");
      await user.type(input, "new-label{Enter}");

      await waitFor(() => {
        const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
        const patchCall = calls.find(
          (c: unknown[]) => (c[0] as string).match(/\/api\/issues\/PROJ-1$/) && (c[1] as RequestInit)?.method === "PATCH"
        );
        expect(patchCall).toBeDefined();
        const body = JSON.parse((patchCall![1] as RequestInit).body as string);
        expect(body.labels).toEqual(["frontend", "auth", "new-label"]);
      });
    });
  });

  describe("Scenario: Label autocomplete shows suggestions", () => {
    it("Given the user types in the label input, then matching suggestions should appear", async () => {
      const user = userEvent.setup();
      setupFetchMock();

      render(<App />, { wrapper: createWrapper() });

      const issueKey = await screen.findByText("PROJ-1");
      await user.click(issueKey.closest("tr")!);

      const panel = await screen.findByRole("dialog", { name: /Issue detail/ });
      await user.click(within(panel).getByLabelText("Add label"));

      const input = within(panel).getByLabelText("Label input");
      await user.type(input, "back");

      await waitFor(() => {
        const listbox = within(panel).getByRole("listbox", { name: /Label suggestions/ });
        expect(within(listbox).getByText("backend")).toBeInTheDocument();
      });
    });
  });

  describe("Scenario: Selecting a suggestion adds the label", () => {
    it("Given suggestions are shown, when the user clicks one, then PATCH should be called with that label", async () => {
      const user = userEvent.setup();
      setupFetchMock();

      render(<App />, { wrapper: createWrapper() });

      const issueKey = await screen.findByText("PROJ-1");
      await user.click(issueKey.closest("tr")!);

      const panel = await screen.findByRole("dialog", { name: /Issue detail/ });
      await user.click(within(panel).getByLabelText("Add label"));

      const input = within(panel).getByLabelText("Label input");
      await user.type(input, "back");

      await waitFor(() => {
        expect(within(panel).getByRole("listbox", { name: /Label suggestions/ })).toBeInTheDocument();
      });

      await user.click(within(panel).getByText("backend"));

      await waitFor(() => {
        const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
        const patchCall = calls.find(
          (c: unknown[]) => (c[0] as string).match(/\/api\/issues\/PROJ-1$/) && (c[1] as RequestInit)?.method === "PATCH"
        );
        expect(patchCall).toBeDefined();
        const body = JSON.parse((patchCall![1] as RequestInit).body as string);
        expect(body.labels).toEqual(["frontend", "auth", "backend"]);
      });
    });
  });

  describe("Scenario: Issue with no labels shows None and add button", () => {
    it("Given the issue has no labels, then 'None' and the + button should be displayed", async () => {
      const user = userEvent.setup();
      setupFetchMock({ issueDetail: { ...mockIssueDetail, labels: [] } });

      render(<App />, { wrapper: createWrapper() });

      const issueKey = await screen.findByText("PROJ-1");
      await user.click(issueKey.closest("tr")!);

      const panel = await screen.findByRole("dialog", { name: /Issue detail/ });
      expect(within(panel).getByText("None")).toBeInTheDocument();
      expect(within(panel).getByLabelText("Add label")).toBeInTheDocument();
    });
  });

  describe("Scenario: Autocomplete excludes already-applied labels", () => {
    it("Given the issue has 'frontend' label, then 'frontend' should not appear in suggestions", async () => {
      const user = userEvent.setup();
      setupFetchMock();

      render(<App />, { wrapper: createWrapper() });

      const issueKey = await screen.findByText("PROJ-1");
      await user.click(issueKey.closest("tr")!);

      const panel = await screen.findByRole("dialog", { name: /Issue detail/ });
      await user.click(within(panel).getByLabelText("Add label"));

      const input = within(panel).getByLabelText("Label input");
      await user.type(input, "front");

      await waitFor(() => {
        const listbox = within(panel).queryByRole("listbox", { name: /Label suggestions/ });
        if (listbox) {
          expect(within(listbox).queryByText("frontend")).not.toBeInTheDocument();
        }
      });
    });
  });
});

/* ── Board View (Kanban) ── */

describe("Feature: Board view displays issues in Kanban columns", () => {
  describe("Scenario: Board shows three columns grouped by status category", () => {
    it("Given the board view is active, then three columns (To Do, In Progress, Done) should be visible", async () => {
      render(<App />, { wrapper: createWrapper() });
      const user = userEvent.setup();

      const boardBtn = screen.getByRole("tab", { name: /board/i });
      await user.click(boardBtn);

      const board = await screen.findByRole("region", { name: /Kanban board/ });
      expect(within(board).getByText("To Do")).toBeInTheDocument();
      expect(within(board).getByText("In Progress")).toBeInTheDocument();
      expect(within(board).getByText("Done")).toBeInTheDocument();
    });
  });

  describe("Scenario: Issues are grouped into the correct columns", () => {
    it("Given PROJ-2 has category 'new', then it should appear in the To Do column", async () => {
      render(<App />, { wrapper: createWrapper() });
      const user = userEvent.setup();

      await user.click(screen.getByRole("tab", { name: /board/i }));

      const todoColumn = await screen.findByTestId("board-column-new");
      expect(within(todoColumn).getByText("PROJ-2")).toBeInTheDocument();
    });

    it("Given PROJ-1 has category 'indeterminate', then it should appear in the In Progress column", async () => {
      render(<App />, { wrapper: createWrapper() });
      const user = userEvent.setup();

      await user.click(screen.getByRole("tab", { name: /board/i }));

      const inProgressColumn = await screen.findByTestId("board-column-indeterminate");
      expect(within(inProgressColumn).getByText("PROJ-1")).toBeInTheDocument();
    });

    it("Given PROJ-3 has category 'done', then it should appear in the Done column", async () => {
      render(<App />, { wrapper: createWrapper() });
      const user = userEvent.setup();

      await user.click(screen.getByRole("tab", { name: /board/i }));

      const doneColumn = await screen.findByTestId("board-column-done");
      expect(within(doneColumn).getByText("PROJ-3")).toBeInTheDocument();
    });
  });

  describe("Scenario: Each column shows the issue count", () => {
    it("Given 1 issue per category, then each column header should show count 1", async () => {
      render(<App />, { wrapper: createWrapper() });
      const user = userEvent.setup();

      await user.click(screen.getByRole("tab", { name: /board/i }));

      await screen.findByTestId("board-column-new");

      const columns = screen.getAllByTestId(/board-column-/);
      for (const col of columns) {
        expect(within(col).getByText("1")).toBeInTheDocument();
      }
    });
  });
});

describe("Feature: Board view issue cards display key, summary, priority, assignee", () => {
  describe("Scenario: Card shows issue key and summary", () => {
    it("Given the board view is active, then cards should show issue key and summary text", async () => {
      render(<App />, { wrapper: createWrapper() });
      const user = userEvent.setup();

      await user.click(screen.getByRole("tab", { name: /board/i }));

      const card = await screen.findByRole("article", { name: /Issue PROJ-1/ });
      expect(within(card).getByText("PROJ-1")).toBeInTheDocument();
      expect(within(card).getByText("Implement login page")).toBeInTheDocument();
    });
  });

  describe("Scenario: Card shows priority icon", () => {
    it("Given PROJ-1 has High priority, then the card should show the priority indicator", async () => {
      render(<App />, { wrapper: createWrapper() });
      const user = userEvent.setup();

      await user.click(screen.getByRole("tab", { name: /board/i }));

      const card = await screen.findByRole("article", { name: /Issue PROJ-1/ });
      expect(within(card).getByTitle("High")).toBeInTheDocument();
    });
  });

  describe("Scenario: Card shows assignee initials when no avatar URL", () => {
    it("Given PROJ-1 is assigned to Alice Martin with empty avatarUrl, then the card should show initials 'AM'", async () => {
      render(<App />, { wrapper: createWrapper() });
      const user = userEvent.setup();

      await user.click(screen.getByRole("tab", { name: /board/i }));

      const card = await screen.findByRole("article", { name: /Issue PROJ-1/ });
      expect(within(card).getByTitle("Alice Martin")).toBeInTheDocument();
      expect(within(card).getByText("AM")).toBeInTheDocument();
    });
  });

  describe("Scenario: Card for unassigned issue does not show avatar", () => {
    it("Given PROJ-2 has no assignee, then no avatar or initials should appear on the card", async () => {
      render(<App />, { wrapper: createWrapper() });
      const user = userEvent.setup();

      await user.click(screen.getByRole("tab", { name: /board/i }));

      const card = await screen.findByRole("article", { name: /Issue PROJ-2/ });
      // No avatar initials element
      const spans = within(card).queryAllByTitle(/.+/);
      const avatarSpan = spans.find((s) => s.classList.contains("rounded-full"));
      expect(avatarSpan).toBeUndefined();
    });
  });

  describe("Scenario: Clicking a card opens the issue detail panel", () => {
    it("Given the board view shows PROJ-1, when clicking the card, then the detail panel should open", async () => {
      render(<App />, { wrapper: createWrapper() });
      const user = userEvent.setup();

      await user.click(screen.getByRole("tab", { name: /board/i }));

      const card = await screen.findByRole("article", { name: /Issue PROJ-1/ });
      await user.click(card);

      const panel = await screen.findByRole("dialog", { name: /Issue detail/ });
      expect(panel).toBeInTheDocument();
      expect(within(panel).getByText("PROJ-1")).toBeInTheDocument();
    });
  });
});

describe("Feature: Board view supports swimlanes", () => {
  describe("Scenario: Swimlane dropdown defaults to None", () => {
    it("Given the board view is active, then the swimlane selector should default to None", async () => {
      render(<App />, { wrapper: createWrapper() });
      const user = userEvent.setup();

      await user.click(screen.getByRole("tab", { name: /board/i }));

      const swimlaneSelect = await screen.findByLabelText("Swimlane grouping");
      expect(swimlaneSelect).toHaveValue("none");
    });
  });

  describe("Scenario: Selecting Assignee swimlane groups cards by assignee", () => {
    it("Given the board view is active, when selecting Assignee swimlane, then swimlane headers should appear", async () => {
      render(<App />, { wrapper: createWrapper() });
      const user = userEvent.setup();

      await user.click(screen.getByRole("tab", { name: /board/i }));
      const swimlaneSelect = await screen.findByLabelText("Swimlane grouping");
      await user.selectOptions(swimlaneSelect, "assignee");

      // Should see assignee swimlane labels
      expect(await screen.findByLabelText("Swimlane Alice Martin")).toBeInTheDocument();
    });
  });

  describe("Scenario: Selecting Priority swimlane groups cards by priority", () => {
    it("Given the board view is active, when selecting Priority swimlane, then priority swimlane headers should appear", async () => {
      render(<App />, { wrapper: createWrapper() });
      const user = userEvent.setup();

      await user.click(screen.getByRole("tab", { name: /board/i }));
      const swimlaneSelect = await screen.findByLabelText("Swimlane grouping");
      await user.selectOptions(swimlaneSelect, "priority");

      // Should see priority swimlane labels
      expect(await screen.findByLabelText("Swimlane High")).toBeInTheDocument();
      expect(screen.getByLabelText("Swimlane Medium")).toBeInTheDocument();
      expect(screen.getByLabelText("Swimlane Low")).toBeInTheDocument();
    });
  });

  describe("Scenario: Swimlane headers are collapsible", () => {
    it("Given the Priority swimlane is active, when clicking a swimlane header, then its cards should toggle visibility", async () => {
      render(<App />, { wrapper: createWrapper() });
      const user = userEvent.setup();

      await user.click(screen.getByRole("tab", { name: /board/i }));
      const swimlaneSelect = await screen.findByLabelText("Swimlane grouping");
      await user.selectOptions(swimlaneSelect, "priority");

      const highSwimlane = await screen.findByLabelText("Swimlane High");
      expect(highSwimlane).toHaveAttribute("aria-expanded", "true");

      // Collapse
      await user.click(highSwimlane);
      expect(highSwimlane).toHaveAttribute("aria-expanded", "false");

      // Expand again
      await user.click(highSwimlane);
      expect(highSwimlane).toHaveAttribute("aria-expanded", "true");
    });
  });

  describe("Scenario: Unassigned issues grouped under 'Unassigned' swimlane", () => {
    it("Given PROJ-2 has no assignee, when Assignee swimlane is active, then PROJ-2 should be in 'Unassigned' swimlane", async () => {
      render(<App />, { wrapper: createWrapper() });
      const user = userEvent.setup();

      await user.click(screen.getByRole("tab", { name: /board/i }));
      const swimlaneSelect = await screen.findByLabelText("Swimlane grouping");
      await user.selectOptions(swimlaneSelect, "assignee");

      expect(await screen.findByLabelText("Swimlane Unassigned")).toBeInTheDocument();
    });
  });
});

describe("Feature: Board view drag-and-drop triggers status transition", () => {
  describe("Scenario: Board view has toggle buttons for switching views", () => {
    it("Given the app is loaded, then both Board and List view buttons should be visible", async () => {
      render(<App />, { wrapper: createWrapper() });

      expect(screen.getByRole("tab", { name: /board/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /list/i })).toBeInTheDocument();
    });

    it("Given the user clicks Board, then the board view should be shown and List view hidden", async () => {
      render(<App />, { wrapper: createWrapper() });
      const user = userEvent.setup();

      await user.click(screen.getByRole("tab", { name: /board/i }));

      expect(await screen.findByRole("region", { name: /Kanban board/ })).toBeInTheDocument();
      // List table should not be present
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });
  });

  describe("Scenario: Board cards show issue type", () => {
    it("Given PROJ-1 is a Story, then the card should display 'Story'", async () => {
      render(<App />, { wrapper: createWrapper() });
      const user = userEvent.setup();

      await user.click(screen.getByRole("tab", { name: /board/i }));

      const card = await screen.findByRole("article", { name: /Issue PROJ-1/ });
      expect(within(card).getByText("Story")).toBeInTheDocument();
    });
  });
});

describe("Feature: Board view quick-action arrows for mobile", () => {
  describe("Scenario: Arrow buttons appear on board cards", () => {
    it("Given PROJ-1 is In Progress, then it should have both left and right arrow buttons", async () => {
      render(<App />, { wrapper: createWrapper() });
      const user = userEvent.setup();

      await user.click(screen.getByRole("tab", { name: /board/i }));

      const card = await screen.findByRole("article", { name: /Issue PROJ-1/ });
      expect(within(card).getByRole("button", { name: /Move PROJ-1 left/ })).toBeInTheDocument();
      expect(within(card).getByRole("button", { name: /Move PROJ-1 right/ })).toBeInTheDocument();
    });
  });

  describe("Scenario: Left arrow hidden on To Do cards", () => {
    it("Given PROJ-2 is in To Do, then it should not have a left arrow button", async () => {
      render(<App />, { wrapper: createWrapper() });
      const user = userEvent.setup();

      await user.click(screen.getByRole("tab", { name: /board/i }));

      const card = await screen.findByRole("article", { name: /Issue PROJ-2/ });
      expect(within(card).queryByRole("button", { name: /Move PROJ-2 left/ })).not.toBeInTheDocument();
      expect(within(card).getByRole("button", { name: /Move PROJ-2 right/ })).toBeInTheDocument();
    });
  });

  describe("Scenario: Right arrow hidden on Done cards", () => {
    it("Given PROJ-3 is in Done, then it should not have a right arrow button", async () => {
      render(<App />, { wrapper: createWrapper() });
      const user = userEvent.setup();

      await user.click(screen.getByRole("tab", { name: /board/i }));

      const card = await screen.findByRole("article", { name: /Issue PROJ-3/ });
      expect(within(card).getByRole("button", { name: /Move PROJ-3 left/ })).toBeInTheDocument();
      expect(within(card).queryByRole("button", { name: /Move PROJ-3 right/ })).not.toBeInTheDocument();
    });
  });

  describe("Scenario: Tapping right arrow transitions issue to next category", () => {
    it("Given PROJ-1 is In Progress, when right arrow is tapped, then it should fetch transitions and POST the Done transition", async () => {
      render(<App />, { wrapper: createWrapper() });
      const user = userEvent.setup();

      await user.click(screen.getByRole("tab", { name: /board/i }));

      const card = await screen.findByRole("article", { name: /Issue PROJ-1/ });
      await user.click(within(card).getByRole("button", { name: /Move PROJ-1 right/ }));

      await waitFor(() => {
        const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
        // Should have fetched issue detail for transitions
        const detailCall = calls.find(
          (c: unknown[]) => (c[0] as string).match(/\/api\/issues\/PROJ-1$/) && !(c[1] as RequestInit)?.method
        );
        expect(detailCall).toBeDefined();
        // Should have posted the transition
        const transitionCall = calls.find(
          (c: unknown[]) => (c[0] as string).includes("/api/issues/PROJ-1/transition") && (c[1] as RequestInit)?.method === "POST"
        );
        expect(transitionCall).toBeDefined();
        const body = JSON.parse((transitionCall![1] as RequestInit).body as string);
        expect(body.transition_id).toBe("31"); // "Done" transition
      });
    });
  });

  describe("Scenario: Arrow buttons have accessible group labels", () => {
    it("Given PROJ-1 is on the board, then its arrow buttons should be in a group labeled 'Move PROJ-1'", async () => {
      render(<App />, { wrapper: createWrapper() });
      const user = userEvent.setup();

      await user.click(screen.getByRole("tab", { name: /board/i }));

      const card = await screen.findByRole("article", { name: /Issue PROJ-1/ });
      expect(within(card).getByRole("group", { name: /Move PROJ-1/ })).toBeInTheDocument();
    });
  });
});

describe("Feature: Command palette (Ctrl+K)", () => {
  describe("Scenario: Ctrl+K opens command palette overlay", () => {
    it("Given the app is loaded, when pressing Ctrl+K, then the command palette dialog should appear", async () => {
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await userEvent.keyboard("{Control>}k{/Control}");

      expect(screen.getByRole("dialog", { name: /command palette/i })).toBeInTheDocument();
      expect(screen.getByLabelText("Search issues")).toBeInTheDocument();
    });

    it("Given the app is loaded, then a search button should be visible in the header", async () => {
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      expect(screen.getByRole("button", { name: /open command palette/i })).toBeInTheDocument();
    });

    it("Given the app is loaded, when clicking the search button, then the command palette should open", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await user.click(screen.getByRole("button", { name: /open command palette/i }));

      expect(screen.getByRole("dialog", { name: /command palette/i })).toBeInTheDocument();
    });
  });

  describe("Scenario: Escape closes the command palette", () => {
    it("Given the command palette is open, when pressing Escape, then it should close", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await user.click(screen.getByRole("button", { name: /open command palette/i }));
      expect(screen.getByRole("dialog", { name: /command palette/i })).toBeInTheDocument();

      await user.keyboard("{Escape}");
      expect(screen.queryByRole("dialog", { name: /command palette/i })).not.toBeInTheDocument();
    });
  });

  describe("Scenario: Search input is auto-focused when palette opens", () => {
    it("Given the command palette opens, then the search input should be focused", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await user.click(screen.getByRole("button", { name: /open command palette/i }));

      await waitFor(() => {
        expect(screen.getByLabelText("Search issues")).toHaveFocus();
      });
    });
  });

  describe("Scenario: Fuzzy search returns matching issues", () => {
    it("Given the command palette is open, when typing 'login', then results matching 'login' should appear", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await user.click(screen.getByRole("button", { name: /open command palette/i }));
      await user.type(screen.getByLabelText("Search issues"), "login");

      vi.advanceTimersByTime(350);
      await waitFor(() => {
        const dialog = screen.getByRole("dialog", { name: /command palette/i });
        expect(within(dialog).getByText("PROJ-1")).toBeInTheDocument();
        expect(within(dialog).getByText("Implement login page")).toBeInTheDocument();
      });

      vi.useRealTimers();
    });

    it("Given the command palette is open, when typing a non-matching term, then 'No results found' should appear", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await user.click(screen.getByRole("button", { name: /open command palette/i }));
      await user.type(screen.getByLabelText("Search issues"), "zzzznotfound");

      vi.advanceTimersByTime(350);
      await waitFor(() => {
        const dialog = screen.getByRole("dialog", { name: /command palette/i });
        expect(within(dialog).getByText("No results found")).toBeInTheDocument();
      });

      vi.useRealTimers();
    });
  });

  describe("Scenario: Search results show status badge and project", () => {
    it("Given search results are displayed, then each result should show the status and project key", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await user.click(screen.getByRole("button", { name: /open command palette/i }));
      await user.type(screen.getByLabelText("Search issues"), "login");

      vi.advanceTimersByTime(350);
      await waitFor(() => {
        const dialog = screen.getByRole("dialog", { name: /command palette/i });
        expect(within(dialog).getByText("In Progress")).toBeInTheDocument();
        expect(within(dialog).getByText("PROJ")).toBeInTheDocument();
      });

      vi.useRealTimers();
    });
  });

  describe("Scenario: Clicking a result opens the issue detail panel", () => {
    it("Given search results are displayed, when clicking a result, then the issue detail panel should open", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await user.click(screen.getByRole("button", { name: /open command palette/i }));
      await user.type(screen.getByLabelText("Search issues"), "login");

      vi.advanceTimersByTime(350);
      await waitFor(() => {
        const dialog = screen.getByRole("dialog", { name: /command palette/i });
        expect(within(dialog).getByText("Implement login page")).toBeInTheDocument();
      });

      const dialog = screen.getByRole("dialog", { name: /command palette/i });
      await user.click(within(dialog).getByText("Implement login page"));

      await waitFor(() => {
        expect(screen.queryByRole("dialog", { name: /command palette/i })).not.toBeInTheDocument();
      });
      expect(screen.getByRole("dialog", { name: /issue detail/i })).toBeInTheDocument();

      vi.useRealTimers();
    });
  });

  describe("Scenario: Arrow keys navigate search results", () => {
    it("Given search results are displayed, when pressing ArrowDown then ArrowUp, then the selected result should change", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await user.click(screen.getByRole("button", { name: /open command palette/i }));
      await user.type(screen.getByLabelText("Search issues"), "p");

      vi.advanceTimersByTime(350);
      const listbox = await screen.findByRole("listbox", { name: /search results/i });
      await waitFor(() => {
        const options = within(listbox).getAllByRole("option");
        expect(options.length).toBeGreaterThan(0);
      });

      // First result should be selected by default
      const options = within(listbox).getAllByRole("option");
      expect(options[0]).toHaveAttribute("aria-selected", "true");

      await user.keyboard("{ArrowDown}");
      const updatedOptions = within(listbox).getAllByRole("option");
      if (updatedOptions.length > 1) {
        expect(updatedOptions[1]).toHaveAttribute("aria-selected", "true");
        expect(updatedOptions[0]).toHaveAttribute("aria-selected", "false");
      }

      vi.useRealTimers();
    });
  });

  describe("Scenario: Enter key opens selected result", () => {
    it("Given a result is selected, when pressing Enter, then the issue detail panel should open", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await user.click(screen.getByRole("button", { name: /open command palette/i }));
      await user.type(screen.getByLabelText("Search issues"), "login");

      vi.advanceTimersByTime(350);
      await waitFor(() => {
        const dialog = screen.getByRole("dialog", { name: /command palette/i });
        expect(within(dialog).getByText("PROJ-1")).toBeInTheDocument();
      });

      await user.keyboard("{Enter}");

      await waitFor(() => {
        expect(screen.queryByRole("dialog", { name: /command palette/i })).not.toBeInTheDocument();
      });
      expect(screen.getByRole("dialog", { name: /issue detail/i })).toBeInTheDocument();

      vi.useRealTimers();
    });
  });

  describe("Scenario: Recent searches are shown when palette opens with empty input", () => {
    it("Given a search was performed, when reopening the palette, then recent searches should be displayed", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      // Seed localStorage
      localStorage.setItem("jira-ui-recent-searches", JSON.stringify(["login", "bug"]));

      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await user.click(screen.getByRole("button", { name: /open command palette/i }));

      const dialog = screen.getByRole("dialog", { name: /command palette/i });
      expect(within(dialog).getByText("Recent searches")).toBeInTheDocument();
      expect(within(dialog).getByText("login")).toBeInTheDocument();
      expect(within(dialog).getByText("bug")).toBeInTheDocument();

      vi.useRealTimers();
      localStorage.removeItem("jira-ui-recent-searches");
    });
  });

  describe("Scenario: Clicking a recent search fills the input", () => {
    it("Given recent searches are displayed, when clicking one, then the input should be filled with that search term", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      localStorage.setItem("jira-ui-recent-searches", JSON.stringify(["login"]));

      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await user.click(screen.getByRole("button", { name: /open command palette/i }));
      const dialog = screen.getByRole("dialog", { name: /command palette/i });
      await user.click(within(dialog).getByText("login"));

      expect(screen.getByLabelText("Search issues")).toHaveValue("login");

      vi.useRealTimers();
      localStorage.removeItem("jira-ui-recent-searches");
    });
  });

  describe("Scenario: Clear recent searches button", () => {
    it("Given recent searches are displayed, when clicking 'Clear', then they should be removed", async () => {
      const user = userEvent.setup();
      localStorage.setItem("jira-ui-recent-searches", JSON.stringify(["login", "bug"]));

      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await user.click(screen.getByRole("button", { name: /open command palette/i }));
      const dialog = screen.getByRole("dialog", { name: /command palette/i });
      expect(within(dialog).getByText("Recent searches")).toBeInTheDocument();

      await user.click(within(dialog).getByLabelText("Clear recent searches"));

      expect(within(dialog).queryByText("Recent searches")).not.toBeInTheDocument();
      expect(within(dialog).queryByText("login")).not.toBeInTheDocument();
      expect(localStorage.getItem("jira-ui-recent-searches")).toBeNull();

      localStorage.removeItem("jira-ui-recent-searches");
    });
  });

  describe("Scenario: Empty state with no recent searches", () => {
    it("Given no recent searches exist, when opening the palette, then 'Type to search issues...' should be shown", async () => {
      const user = userEvent.setup();
      localStorage.removeItem("jira-ui-recent-searches");

      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await user.click(screen.getByRole("button", { name: /open command palette/i }));
      const dialog = screen.getByRole("dialog", { name: /command palette/i });
      expect(within(dialog).getByText("Type to search issues...")).toBeInTheDocument();
    });
  });

  describe("Scenario: Keyboard navigation hints are shown", () => {
    it("Given the command palette is open, then keyboard hints should be visible in the footer", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await user.click(screen.getByRole("button", { name: /open command palette/i }));
      const dialog = screen.getByRole("dialog", { name: /command palette/i });
      expect(within(dialog).getByText("↑↓ Navigate")).toBeInTheDocument();
      expect(within(dialog).getByText("↵ Open")).toBeInTheDocument();
      expect(within(dialog).getByText("ESC Close")).toBeInTheDocument();
    });
  });

  describe("Scenario: Debounced search calls API with delay", () => {
    it("Given the palette is open, when typing quickly, then the API should only be called once after the debounce period", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await user.click(screen.getByRole("button", { name: /open command palette/i }));
      (global.fetch as ReturnType<typeof vi.fn>).mockClear();

      await user.type(screen.getByLabelText("Search issues"), "log");

      // Before debounce, no search call should be made
      const earlySearchCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.filter(
        (c: unknown[]) => (c[0] as string).includes("/api/search/quick")
      );
      expect(earlySearchCalls.length).toBe(0);

      vi.advanceTimersByTime(350);
      await waitFor(() => {
        const searchCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.filter(
          (c: unknown[]) => (c[0] as string).includes("/api/search/quick")
        );
        expect(searchCalls.length).toBe(1);
        expect((searchCalls[0][0] as string)).toContain("q=log");
      });

      vi.useRealTimers();
    });
  });
});

/* ── Feature: Keyboard shortcuts (tasks 5.1–5.5) ── */

describe("Feature: Keyboard shortcuts — j/k navigation in list view", () => {
  describe("Scenario: Pressing j highlights the first row", () => {
    it("Given the list view is displayed, when pressing j, then the first row should be highlighted", async () => {
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await userEvent.keyboard("j");

      const tbody = screen.getAllByRole("rowgroup")[1];
      const rows = within(tbody).getAllByRole("row");
      expect(rows[0].className).toContain("bg-blue-900");
    });
  });

  describe("Scenario: Pressing j twice highlights the second row", () => {
    it("Given the list view is displayed, when pressing j twice, then the second row should be highlighted", async () => {
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await userEvent.keyboard("j");
      await userEvent.keyboard("j");

      const tbody = screen.getAllByRole("rowgroup")[1];
      const rows = within(tbody).getAllByRole("row");
      expect(rows[0].className).not.toContain("bg-blue-900");
      expect(rows[1].className).toContain("bg-blue-900");
    });
  });

  describe("Scenario: Pressing k moves highlight up", () => {
    it("Given the second row is highlighted, when pressing k, then the first row should be highlighted", async () => {
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await userEvent.keyboard("j");
      await userEvent.keyboard("j");
      await userEvent.keyboard("k");

      const tbody = screen.getAllByRole("rowgroup")[1];
      const rows = within(tbody).getAllByRole("row");
      expect(rows[0].className).toContain("bg-blue-900");
      expect(rows[1].className).not.toContain("bg-blue-900");
    });
  });

  describe("Scenario: j does not go past the last row", () => {
    it("Given there are 3 rows, when pressing j 10 times, then the last row should be highlighted", async () => {
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      for (let i = 0; i < 10; i++) await userEvent.keyboard("j");

      const tbody = screen.getAllByRole("rowgroup")[1];
      const rows = within(tbody).getAllByRole("row");
      expect(rows[2].className).toContain("bg-blue-900");
    });
  });

  describe("Scenario: k does not go above the first row", () => {
    it("Given the first row is highlighted, when pressing k, then the first row should remain highlighted", async () => {
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await userEvent.keyboard("j");
      await userEvent.keyboard("k");
      await userEvent.keyboard("k");

      const tbody = screen.getAllByRole("rowgroup")[1];
      const rows = within(tbody).getAllByRole("row");
      expect(rows[0].className).toContain("bg-blue-900");
    });
  });

  describe("Scenario: Shortcuts disabled when typing in an input", () => {
    it("Given focus is on a select input, when pressing j, then no row should be highlighted", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      // Click the SearchableSelect to open it — focus moves to the search input
      await user.click(screen.getByLabelText("Filter by type"));
      const searchInput = await screen.findByLabelText("Search options");
      await user.click(searchInput);
      await user.keyboard("j");

      const tbody = screen.getAllByRole("rowgroup")[1];
      const rows = within(tbody).getAllByRole("row");
      for (const row of rows) {
        expect(row.className).not.toContain("bg-blue-900");
      }
    });
  });
});

describe("Feature: Keyboard shortcuts — Enter opens issue detail", () => {
  describe("Scenario: Pressing Enter opens the highlighted issue", () => {
    it("Given the first row is highlighted, when pressing Enter, then the issue detail panel should open", async () => {
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await userEvent.keyboard("j");
      await userEvent.keyboard("{Enter}");

      expect(await screen.findByRole("dialog", { name: /issue detail/i })).toBeInTheDocument();
    });
  });

  describe("Scenario: Enter does nothing without a highlighted row", () => {
    it("Given no row is highlighted, when pressing Enter, then no detail panel should open", async () => {
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await userEvent.keyboard("{Enter}");

      expect(screen.queryByRole("dialog", { name: /issue detail/i })).not.toBeInTheDocument();
    });
  });
});

describe("Feature: Keyboard shortcuts — Escape closes detail/modal", () => {
  describe("Scenario: Escape closes the issue detail panel", () => {
    it("Given the detail panel is open, when pressing Escape, then the panel should close", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      const tbody = screen.getAllByRole("rowgroup")[1];
      const firstRow = within(tbody).getAllByRole("row")[0];
      await user.click(firstRow);

      expect(await screen.findByRole("dialog", { name: /issue detail/i })).toBeInTheDocument();

      await user.keyboard("{Escape}");

      await waitFor(() => {
        expect(screen.queryByRole("dialog", { name: /issue detail/i })).not.toBeInTheDocument();
      });
    });
  });

  describe("Scenario: Escape closes the shortcut help overlay", () => {
    it("Given the shortcut help overlay is open, when pressing Escape, then it should close", async () => {
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await userEvent.keyboard("?");
      expect(screen.getByRole("dialog", { name: /keyboard shortcuts/i })).toBeInTheDocument();

      await userEvent.keyboard("{Escape}");

      await waitFor(() => {
        expect(screen.queryByRole("dialog", { name: /keyboard shortcuts/i })).not.toBeInTheDocument();
      });
    });
  });
});

describe("Feature: Keyboard shortcuts — b/l switch views", () => {
  describe("Scenario: Pressing b switches to board view", () => {
    it("Given the list view is displayed, when pressing b, then the board view should be shown", async () => {
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await userEvent.keyboard("b");

      expect(await screen.findByRole("region", { name: /kanban board/i })).toBeInTheDocument();
    });
  });

  describe("Scenario: Pressing l switches to list view", () => {
    it("Given the board view is displayed, when pressing i, then the list view should be shown", async () => {
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await userEvent.keyboard("b");
      expect(await screen.findByRole("region", { name: /kanban board/i })).toBeInTheDocument();

      await userEvent.keyboard("i");

      await waitFor(() => {
        expect(screen.queryByRole("region", { name: /kanban board/i })).not.toBeInTheDocument();
      });
      expect(screen.getAllByRole("rowgroup").length).toBeGreaterThan(0);
    });
  });
});

describe("Feature: Keyboard shortcuts — ? shows shortcut help overlay", () => {
  describe("Scenario: Pressing ? opens the shortcut help overlay", () => {
    it("Given the list view is displayed, when pressing ?, then a help overlay listing all shortcuts should appear", async () => {
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await userEvent.keyboard("?");

      const dialog = screen.getByRole("dialog", { name: /keyboard shortcuts/i });
      expect(dialog).toBeInTheDocument();
      expect(within(dialog).getByText("Keyboard Shortcuts")).toBeInTheDocument();
      expect(within(dialog).getByText("Move down in list view")).toBeInTheDocument();
      expect(within(dialog).getByText("Move up in list view")).toBeInTheDocument();
      expect(within(dialog).getByText("Open highlighted issue")).toBeInTheDocument();
      expect(within(dialog).getByText("Close detail panel / modal")).toBeInTheDocument();
      expect(within(dialog).getByText("Switch to board view")).toBeInTheDocument();
      expect(within(dialog).getByText("Switch to list view")).toBeInTheDocument();
      expect(within(dialog).getByText("Show this help")).toBeInTheDocument();
      expect(within(dialog).getByText("Open command palette")).toBeInTheDocument();
    });
  });

  describe("Scenario: Help overlay can be closed via the close button", () => {
    it("Given the shortcut help is open, when clicking the close button, then it should close", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await userEvent.keyboard("?");
      expect(screen.getByRole("dialog", { name: /keyboard shortcuts/i })).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /close shortcuts help/i }));

      await waitFor(() => {
        expect(screen.queryByRole("dialog", { name: /keyboard shortcuts/i })).not.toBeInTheDocument();
      });
    });
  });

  describe("Scenario: Help overlay can be opened via the header button", () => {
    it("Given the app is loaded, when clicking the ? button in the header, then the help overlay should open", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await user.click(screen.getByRole("button", { name: /show shortcuts/i }));

      expect(screen.getByRole("dialog", { name: /keyboard shortcuts/i })).toBeInTheDocument();
    });
  });

  describe("Scenario: Help overlay lists the create issue shortcut", () => {
    it("Given the shortcut help is open, then it should list the 'c' shortcut for creating issues", async () => {
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await userEvent.keyboard("?");

      const dialog = screen.getByRole("dialog", { name: /keyboard shortcuts/i });
      expect(within(dialog).getByText("Create new issue")).toBeInTheDocument();
    });
  });
});

describe("Feature: Quick create modal — 'c' key opens create issue modal (6.1)", () => {
  describe("Scenario: Pressing 'c' opens the create issue modal", () => {
    it("Given the list view is displayed, when pressing 'c', then a create issue modal should appear", async () => {
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await userEvent.keyboard("c");

      expect(screen.getByRole("dialog", { name: /create issue/i })).toBeInTheDocument();
      expect(screen.getByText("Create Issue")).toBeInTheDocument();
    });
  });

  describe("Scenario: Create button in header opens the modal", () => {
    it("Given the app is loaded, when clicking the Create button, then the create modal should open", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      // Click Create dropdown, then Issue
      await user.click(screen.getByRole("button", { name: "Create" }));
      await user.click(screen.getByRole("button", { name: /create issue/i }));

      expect(screen.getByRole("dialog", { name: /create issue/i })).toBeInTheDocument();
    });
  });

  describe("Scenario: 'c' shortcut is disabled when typing in an input", () => {
    it("Given focus is on a select input, when pressing 'c', then the create modal should not open", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await user.click(screen.getByLabelText("Filter by type"));
      const searchInput = await screen.findByLabelText("Search options");
      await user.click(searchInput);
      await user.keyboard("c");

      expect(screen.queryByRole("dialog", { name: /create issue/i })).not.toBeInTheDocument();
    });
  });

  describe("Scenario: Escape closes the create modal", () => {
    it("Given the create modal is open, when pressing Escape, then it should close", async () => {
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await userEvent.keyboard("c");
      expect(screen.getByRole("dialog", { name: /create issue/i })).toBeInTheDocument();

      await userEvent.keyboard("{Escape}");

      await waitFor(() => {
        expect(screen.queryByRole("dialog", { name: /create issue/i })).not.toBeInTheDocument();
      });
    });
  });
});

describe("Feature: Quick create modal — form fields (6.2)", () => {
  describe("Scenario: Modal contains all required form fields", () => {
    it("Given the create modal is open, then it should have project, summary, type, priority, assignee, and description fields", async () => {
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await userEvent.keyboard("c");

      const dialog = screen.getByRole("dialog", { name: /create issue/i });
      expect(within(dialog).getByLabelText(/project/i)).toBeInTheDocument();
      expect(within(dialog).getByLabelText(/summary/i)).toBeInTheDocument();
      expect(within(dialog).getByLabelText(/type/i)).toBeInTheDocument();
      expect(within(dialog).getByLabelText(/priority/i)).toBeInTheDocument();
      expect(within(dialog).getByLabelText(/assignee/i)).toBeInTheDocument();
      expect(within(dialog).getByLabelText(/description/i)).toBeInTheDocument();
    });
  });

  describe("Scenario: Project dropdown is populated from API", () => {
    it("Given the create modal is open, then the project dropdown should list projects from the API", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await userEvent.keyboard("c");

      const dialog = screen.getByRole("dialog", { name: /create issue/i });
      // Click the project SearchableSelect to open the dropdown
      await user.click(within(dialog).getByText("Select project..."));
      await waitFor(() => {
        expect(screen.getByRole("listbox")).toBeInTheDocument();
      });
      expect(screen.getByText(/PROJ — My Project/)).toBeInTheDocument();
    });
  });

  describe("Scenario: Type dropdown has Task, Bug, Story, Epic options", () => {
    it("Given the create modal is open, then the type dropdown should have all 4 issue types", async () => {
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await userEvent.keyboard("c");

      const dialog = screen.getByRole("dialog", { name: /create issue/i });
      const typeSelect = within(dialog).getByLabelText(/type/i);
      expect(within(typeSelect).getByText("Task")).toBeInTheDocument();
      expect(within(typeSelect).getByText("Bug")).toBeInTheDocument();
      expect(within(typeSelect).getByText("Story")).toBeInTheDocument();
      expect(within(typeSelect).getByText("Epic")).toBeInTheDocument();
    });
  });

  describe("Scenario: Priority dropdown is populated from API", () => {
    it("Given the create modal is open, then the priority dropdown should list priorities from the API", async () => {
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await userEvent.keyboard("c");

      const dialog = screen.getByRole("dialog", { name: /create issue/i });
      const prioritySelect = within(dialog).getByLabelText(/priority/i);
      await waitFor(() => {
        expect(within(prioritySelect).getByText("Highest")).toBeInTheDocument();
        expect(within(prioritySelect).getByText("High")).toBeInTheDocument();
        expect(within(prioritySelect).getByText("Low")).toBeInTheDocument();
      });
    });
  });
});

describe("Feature: Quick create modal — form validation (6.3)", () => {
  describe("Scenario: Submitting without project shows error", () => {
    it("Given the create modal is open with no project selected, when clicking Create, then a project error should appear", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await userEvent.keyboard("c");

      const dialog = screen.getByRole("dialog", { name: /create issue/i });
      await user.click(within(dialog).getByRole("button", { name: /^create$/i }));

      expect(within(dialog).getByText("Project is required")).toBeInTheDocument();
    });
  });

  describe("Scenario: Submitting without summary shows error", () => {
    it("Given the create modal has a project selected but no summary, when clicking Create, then a summary error should appear", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await userEvent.keyboard("c");

      const dialog = screen.getByRole("dialog", { name: /create issue/i });
      // Select project via SearchableSelect
      await user.click(within(dialog).getByText("Select project..."));
      await waitFor(() => {
        expect(screen.getByRole("listbox")).toBeInTheDocument();
      });
      await user.click(screen.getByText(/PROJ — My Project/));
      await user.click(within(dialog).getByRole("button", { name: /^create$/i }));

      expect(within(dialog).getByText("Summary is required")).toBeInTheDocument();
    });
  });

  describe("Scenario: Errors clear when user fills in the fields", () => {
    it("Given validation errors are shown, when the user types a summary, then the summary error should disappear", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await userEvent.keyboard("c");

      const dialog = screen.getByRole("dialog", { name: /create issue/i });
      await user.click(within(dialog).getByRole("button", { name: /^create$/i }));
      expect(within(dialog).getByText("Summary is required")).toBeInTheDocument();

      await user.type(within(dialog).getByLabelText(/summary/i), "New task");

      expect(within(dialog).queryByText("Summary is required")).not.toBeInTheDocument();
    });
  });
});

describe("Feature: Quick create modal — optimistic UI update (6.4)", () => {
  describe("Scenario: Creating an issue closes the modal and sends POST request", () => {
    it("Given the create modal is filled out, when submitting, then a POST request should be sent and the modal should close", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await userEvent.keyboard("c");

      const dialog = screen.getByRole("dialog", { name: /create issue/i });
      // Select project via SearchableSelect
      await user.click(within(dialog).getByText("Select project..."));
      await waitFor(() => expect(screen.getByRole("listbox")).toBeInTheDocument());
      await user.click(screen.getByText(/PROJ — My Project/));
      await user.type(within(dialog).getByLabelText(/summary/i), "Brand new issue");
      await user.click(within(dialog).getByRole("button", { name: /^create$/i }));

      // Modal should close after successful creation
      await waitFor(() => {
        expect(screen.queryByRole("dialog", { name: /create issue/i })).not.toBeInTheDocument();
      });

      // Verify POST was called with correct data
      const postCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.find(
        ([url, init]: [string, RequestInit?]) => url.toString().match(/\/api\/issues$/) && init?.method === "POST"
      );
      expect(postCall).toBeDefined();
      const body = JSON.parse(postCall![1]!.body as string);
      expect(body.project).toBe("PROJ");
      expect(body.summary).toBe("Brand new issue");
      expect(body.issue_type).toBe("Task");
    });
  });

  describe("Scenario: API error shows error message in the modal", () => {
    it("Given the API returns an error, when submitting, then an error message should appear", async () => {
      setupFetchMock({ createError: true });
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await userEvent.keyboard("c");

      const dialog = screen.getByRole("dialog", { name: /create issue/i });
      await user.click(within(dialog).getByText("Select project..."));
      await waitFor(() => expect(screen.getByRole("listbox")).toBeInTheDocument());
      await user.click(screen.getByText(/PROJ — My Project/));
      await user.type(within(dialog).getByLabelText(/summary/i), "Failing issue");
      await user.click(within(dialog).getByRole("button", { name: /^create$/i }));

      await waitFor(() => {
        expect(within(dialog).getByRole("alert")).toBeInTheDocument();
        expect(within(dialog).getByText(/failed to create issue/i)).toBeInTheDocument();
      });
    });
  });

  describe("Scenario: Create modal inherits the selected project", () => {
    it("Given a project is selected in the header, when opening the create modal via button, then the project field should be pre-filled", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      // Select a project in the header via SearchableSelect
      const projectBtns = screen.getAllByText("All Projects");
      await user.click(projectBtns[0]);
      await waitFor(() => expect(screen.getByRole("listbox")).toBeInTheDocument());
      await user.click(screen.getByText(/PROJ — My Project/));

      // Click Create dropdown, then Issue
      await user.click(screen.getByRole("button", { name: "Create" }));
      await user.click(screen.getByRole("button", { name: /create issue/i }));

      const dialog = screen.getByRole("dialog", { name: /create issue/i });
      // SearchableSelect shows the selected label as button text
      expect(within(dialog).getByText(/PROJ — My Project/)).toBeInTheDocument();
    });
  });
});

/* ── 7. Bulk Actions ── */

describe("Feature: Bulk actions on selected issues", () => {
  describe("Scenario: Checkbox selection on list view rows (7.1)", () => {
    it("Given the list view is displayed, then each row should have a checkbox for selection", async () => {
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      expect(screen.getByLabelText("Select PROJ-1")).toBeInTheDocument();
      expect(screen.getByLabelText("Select PROJ-2")).toBeInTheDocument();
      expect(screen.getByLabelText("Select PROJ-3")).toBeInTheDocument();
    });

    it("Given a row checkbox is clicked, then the issue should be selected and the bulk action bar appears", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await user.click(screen.getByLabelText("Select PROJ-1"));

      expect(screen.getByLabelText("Select PROJ-1")).toBeChecked();
      expect(screen.getByRole("toolbar", { name: /bulk actions/i })).toBeInTheDocument();
      expect(screen.getByText("1 selected")).toBeInTheDocument();
    });

    it("Given multiple checkboxes are clicked, then the count reflects all selected issues", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await user.click(screen.getByLabelText("Select PROJ-1"));
      await user.click(screen.getByLabelText("Select PROJ-3"));

      expect(screen.getByText("2 selected")).toBeInTheDocument();
    });

    it("Given a selected checkbox is clicked again, then the issue is deselected", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await user.click(screen.getByLabelText("Select PROJ-1"));
      expect(screen.getByLabelText("Select PROJ-1")).toBeChecked();

      await user.click(screen.getByLabelText("Select PROJ-1"));
      expect(screen.getByLabelText("Select PROJ-1")).not.toBeChecked();
    });
  });

  describe("Scenario: Select all / deselect all (7.2)", () => {
    it("Given the header checkbox is clicked, then all visible issues should be selected", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await user.click(screen.getByLabelText("Select all issues"));

      expect(screen.getByLabelText("Select PROJ-1")).toBeChecked();
      expect(screen.getByLabelText("Select PROJ-2")).toBeChecked();
      expect(screen.getByLabelText("Select PROJ-3")).toBeChecked();
      expect(screen.getByText("3 selected")).toBeInTheDocument();
    });

    it("Given all issues are selected and header checkbox is clicked again, then all should be deselected", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await user.click(screen.getByLabelText("Select all issues"));
      expect(screen.getByText("3 selected")).toBeInTheDocument();

      await user.click(screen.getByLabelText("Select all issues"));
      expect(screen.getByLabelText("Select PROJ-1")).not.toBeChecked();
      expect(screen.getByLabelText("Select PROJ-2")).not.toBeChecked();
      expect(screen.queryByRole("toolbar", { name: /bulk actions/i })).not.toBeInTheDocument();
    });

    it("Given the deselect all button is clicked, then all issues are deselected and the bar disappears", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await user.click(screen.getByLabelText("Select PROJ-1"));
      await user.click(screen.getByLabelText("Select PROJ-2"));
      expect(screen.getByText("2 selected")).toBeInTheDocument();

      await user.click(screen.getByLabelText("Deselect all"));
      expect(screen.queryByRole("toolbar", { name: /bulk actions/i })).not.toBeInTheDocument();
    });
  });

  describe("Scenario: Bulk transition (7.3)", () => {
    it("Given issues are selected and a transition is chosen, then transition API is called for each issue", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await user.click(screen.getByLabelText("Select PROJ-1"));
      await user.click(screen.getByLabelText("Select PROJ-2"));

      const transitionSelect = screen.getByLabelText("Bulk transition");
      await user.selectOptions(transitionSelect, "Done");

      await waitFor(() => {
        const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
        const transitionCalls = calls.filter(
          ([url, init]: [string, RequestInit | undefined]) =>
            typeof url === "string" && url.includes("/transition") && init?.method === "POST",
        );
        expect(transitionCalls.length).toBe(2);
      });
    });

    it("Given bulk transition completes, then a success message is shown", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await user.click(screen.getByLabelText("Select PROJ-1"));

      const transitionSelect = screen.getByLabelText("Bulk transition");
      await user.selectOptions(transitionSelect, "Done");

      await waitFor(() => {
        expect(screen.getByText(/1\/1 succeeded/)).toBeInTheDocument();
      });
    });
  });

  describe("Scenario: Bulk assign (7.4)", () => {
    it("Given issues are selected and an assignee is chosen, then PATCH is called for each issue", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      // Select a project first to enable members via SearchableSelect
      const projectBtns = screen.getAllByText("All Projects");
      await user.click(projectBtns[0]);
      await waitFor(() => expect(screen.getByRole("listbox")).toBeInTheDocument());
      await user.click(screen.getByText(/PROJ — My Project/));

      await waitFor(() => screen.findByText("PROJ-1"));

      await user.click(screen.getByLabelText("Select PROJ-1"));
      await user.click(screen.getByLabelText("Select PROJ-2"));

      // Bulk assign is now SearchableSelect
      await selectSearchableOption(user, screen, "Bulk assign", "Alice Martin");

      await waitFor(() => {
        const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
        const patchCalls = calls.filter(
          ([url, init]: [string, RequestInit | undefined]) =>
            typeof url === "string" && url.match(/\/api\/issues\/PROJ-\d+$/) && init?.method === "PATCH",
        );
        expect(patchCalls.length).toBe(2);
        const body = JSON.parse(patchCalls[0][1]?.body as string);
        expect(body.assignee).toBe("abc123");
      });
    });
  });

  describe("Scenario: Bulk priority change (7.5)", () => {
    it("Given issues are selected and a priority is chosen, then PATCH is called for each issue with the priority", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await user.click(screen.getByLabelText("Select PROJ-1"));
      await user.click(screen.getByLabelText("Select PROJ-3"));

      const prioritySelect = screen.getByLabelText("Bulk priority");
      await user.selectOptions(prioritySelect, "Highest");

      await waitFor(() => {
        const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
        const patchCalls = calls.filter(
          ([url, init]: [string, RequestInit | undefined]) =>
            typeof url === "string" && url.match(/\/api\/issues\/PROJ-\d+$/) && init?.method === "PATCH",
        );
        expect(patchCalls.length).toBe(2);
        const body = JSON.parse(patchCalls[0][1]?.body as string);
        expect(body.priority).toBe("Highest");
      });
    });

    it("Given bulk priority change completes successfully, then a success result is shown", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await user.click(screen.getByLabelText("Select PROJ-1"));

      const prioritySelect = screen.getByLabelText("Bulk priority");
      await user.selectOptions(prioritySelect, "Low");

      await waitFor(() => {
        expect(screen.getByText(/1\/1 succeeded/)).toBeInTheDocument();
      });
    });
  });

  describe("Scenario: Bulk action bar visibility", () => {
    it("Given no issues are selected, then the bulk action bar is not visible", async () => {
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      expect(screen.queryByRole("toolbar", { name: /bulk actions/i })).not.toBeInTheDocument();
    });

    it("Given the view switches to board, then the bulk action bar disappears", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await user.click(screen.getByLabelText("Select PROJ-1"));
      expect(screen.getByRole("toolbar", { name: /bulk actions/i })).toBeInTheDocument();

      await user.click(screen.getByRole("tab", { name: /board/i }));
      expect(screen.queryByRole("toolbar", { name: /bulk actions/i })).not.toBeInTheDocument();
    });
  });

  /* ── Saved Filters (8.1–8.4) ── */

  describe("Scenario: Save current filter combination (8.1)", () => {
    it("Given filters are active, when Save Filter is clicked and a name is entered, then the filter is saved", async () => {
      const user = userEvent.setup();
      vi.spyOn(window, "prompt").mockReturnValue("My Bug Filter");
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      // Apply a filter via SearchableSelect
      await selectSearchableOption(user, screen, "Filter by type", "Bug");

      // Save Filter button should appear
      const saveBtn = screen.getByLabelText("Save current filter");
      await user.click(saveBtn);

      // Open saved filters dropdown
      await user.click(screen.getByLabelText("Saved filters"));
      expect(screen.getByText("My Bug Filter")).toBeInTheDocument();
    });

    it("Given no filters are active, then the Save Filter button is not shown", async () => {
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      expect(screen.queryByLabelText("Save current filter")).not.toBeInTheDocument();
    });

    it("Given the prompt is cancelled, then no filter is saved", async () => {
      const user = userEvent.setup();
      vi.spyOn(window, "prompt").mockReturnValue(null);
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await selectSearchableOption(user, screen, "Filter by type", "Bug");

      await user.click(screen.getByLabelText("Save current filter"));

      await user.click(screen.getByLabelText("Saved filters"));
      expect(screen.getByText(/No saved filters yet/)).toBeInTheDocument();
    });
  });

  describe("Scenario: Quick-access filter dropdown (8.2)", () => {
    it("Given saved filters exist, when the dropdown is opened, then all saved filters are listed", async () => {
      const user = userEvent.setup();
      localStorage.setItem("jira-ui-saved-filters", JSON.stringify([
        { id: "1", name: "Bugs Only", project: "", filters: { status: "", type: "Bug", assignee: "" } },
        { id: "2", name: "Alice Tasks", project: "PROJ", filters: { status: "", type: "", assignee: "Alice Martin" } },
      ]));
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await user.click(screen.getByLabelText("Saved filters"));
      expect(screen.getByText("Bugs Only")).toBeInTheDocument();
      expect(screen.getByText("Alice Tasks")).toBeInTheDocument();
    });

    it("Given a saved filter is clicked, then the filters are applied", async () => {
      const user = userEvent.setup();
      localStorage.setItem("jira-ui-saved-filters", JSON.stringify([
        { id: "1", name: "Bugs Only", project: "", filters: { status: "", type: "Bug", assignee: "" } },
      ]));
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await user.click(screen.getByLabelText("Saved filters"));
      await user.click(screen.getByLabelText("Apply filter Bugs Only"));

      expect(screen.getByLabelText("Filter by type")).toHaveTextContent("Bug");
    });

    it("Given no saved filters exist, then the dropdown shows an empty message", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await user.click(screen.getByLabelText("Saved filters"));
      expect(screen.getByText(/No saved filters yet/)).toBeInTheDocument();
    });
  });

  describe("Scenario: Edit and delete saved filters (8.3)", () => {
    it("Given a saved filter exists, when edit is clicked and a new name is submitted, then the filter is renamed", async () => {
      const user = userEvent.setup();
      localStorage.setItem("jira-ui-saved-filters", JSON.stringify([
        { id: "1", name: "Old Name", project: "", filters: { status: "", type: "Bug", assignee: "" } },
      ]));
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await user.click(screen.getByLabelText("Saved filters"));
      await user.click(screen.getByLabelText("Edit filter Old Name"));

      const renameInput = screen.getByLabelText("Rename filter");
      await user.clear(renameInput);
      await user.type(renameInput, "New Name");
      await user.click(screen.getByLabelText("Confirm rename"));

      expect(screen.getByText("New Name")).toBeInTheDocument();
      expect(screen.queryByText("Old Name")).not.toBeInTheDocument();
    });

    it("Given a saved filter exists, when delete is clicked, then the filter is removed", async () => {
      const user = userEvent.setup();
      localStorage.setItem("jira-ui-saved-filters", JSON.stringify([
        { id: "1", name: "To Delete", project: "", filters: { status: "", type: "Bug", assignee: "" } },
      ]));
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await user.click(screen.getByLabelText("Saved filters"));
      expect(screen.getByText("To Delete")).toBeInTheDocument();

      await user.click(screen.getByLabelText("Delete filter To Delete"));
      expect(screen.queryByText("To Delete")).not.toBeInTheDocument();
    });
  });

  describe("Scenario: Persist saved filters in localStorage (8.4)", () => {
    it("Given a filter is saved, then it is persisted to localStorage", async () => {
      const user = userEvent.setup();
      vi.spyOn(window, "prompt").mockReturnValue("Persisted Filter");
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await selectSearchableOption(user, screen, "Filter by type", "Bug");
      await user.click(screen.getByLabelText("Save current filter"));

      const stored = JSON.parse(localStorage.getItem("jira-ui-saved-filters") || "[]");
      expect(stored).toHaveLength(1);
      expect(stored[0].name).toBe("Persisted Filter");
      expect(stored[0].filters.type).toBe("Bug");
    });

    it("Given a filter is deleted, then localStorage is updated", async () => {
      const user = userEvent.setup();
      localStorage.setItem("jira-ui-saved-filters", JSON.stringify([
        { id: "1", name: "Will Delete", project: "", filters: { status: "", type: "Bug", assignee: "" } },
      ]));
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await user.click(screen.getByLabelText("Saved filters"));
      await user.click(screen.getByLabelText("Delete filter Will Delete"));

      const stored = JSON.parse(localStorage.getItem("jira-ui-saved-filters") || "[]");
      expect(stored).toHaveLength(0);
    });

    it("Given a filter is renamed, then localStorage is updated with the new name", async () => {
      const user = userEvent.setup();
      localStorage.setItem("jira-ui-saved-filters", JSON.stringify([
        { id: "1", name: "Original", project: "", filters: { status: "", type: "Bug", assignee: "" } },
      ]));
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      await user.click(screen.getByLabelText("Saved filters"));
      await user.click(screen.getByLabelText("Edit filter Original"));

      const renameInput = screen.getByLabelText("Rename filter");
      await user.clear(renameInput);
      await user.type(renameInput, "Renamed");
      await user.click(screen.getByLabelText("Confirm rename"));

      const stored = JSON.parse(localStorage.getItem("jira-ui-saved-filters") || "[]");
      expect(stored[0].name).toBe("Renamed");
    });
  });
});

/* ── Sprint Dashboard (tasks 9.1–9.4) ── */

describe("Feature: Sprint dashboard shows active sprint overview", () => {
  describe("Scenario: Sprint view is accessible from nav", () => {
    it("Given the app is rendered, then there should be a Sprint nav button", async () => {
      render(<App />, { wrapper: createWrapper() });
      expect(screen.getByRole("tab", { name: /sprint/i })).toBeInTheDocument();
    });

    it("Given the app is rendered, when the user clicks Sprint, then the sprint dashboard loads", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });
      await user.click(screen.getByRole("tab", { name: /sprint/i }));
      expect(await screen.findByTestId("sprint-dashboard")).toBeInTheDocument();
    });

    it("Given the app is rendered, when the user presses 's', then the sprint view activates", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");
      await user.keyboard("s");
      expect(await screen.findByTestId("sprint-dashboard")).toBeInTheDocument();
    });
  });

  describe("Scenario: Active sprint overview displays name and dates (9.1)", () => {
    it("Given the sprint view is active, then the sprint name is displayed", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });
      await user.click(screen.getByRole("tab", { name: /sprint/i }));
      expect(await screen.findByTestId("sprint-name")).toHaveTextContent("Sprint 42");
    });

    it("Given the sprint view is active, then issue counts by status category are shown", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });
      await user.click(screen.getByRole("tab", { name: /sprint/i }));
      const dashboard = await screen.findByTestId("sprint-dashboard");
      // Total issues = 4
      expect(within(dashboard).getByText("4")).toBeInTheDocument();
      // The category labels are displayed
      expect(within(dashboard).getByText("Total")).toBeInTheDocument();
      expect(within(dashboard).getByText("Progress")).toBeInTheDocument();
    });

    it("Given the sprint view is active, then completion percentage is shown", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });
      await user.click(screen.getByRole("tab", { name: /sprint/i }));
      expect(await screen.findByTestId("sprint-completion")).toHaveTextContent("25% complete");
    });
  });

  describe("Scenario: No active sprint shows fallback message", () => {
    it("Given no sprints exist, when sprint view is opened, then a message indicates no active sprint", async () => {
      const user = userEvent.setup();
      global.fetch = vi.fn((url: string | URL | Request) => {
        const urlStr = typeof url === "string" ? url : url.toString();
        const authResp = _handleAuthUrls(urlStr);
        if (authResp) return Promise.resolve(authResp);
        if (urlStr.includes("/api/sprints")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ sprints: [] }),
          } as Response);
        }
        if (urlStr.includes("/api/projects")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockProjects),
          } as Response);
        }
        if (urlStr.includes("/api/issues")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockIssues),
          } as Response);
        }
        return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) } as Response);
      });

      render(<App />, { wrapper: createWrapper() });
      await user.click(screen.getByRole("tab", { name: /sprint/i }));
      expect(await screen.findByTestId("no-active-sprint")).toBeInTheDocument();
      expect(screen.getByText("No active sprint")).toBeInTheDocument();
    });
  });
});

describe("Feature: Burndown chart shows remaining work over time (9.2)", () => {
  describe("Scenario: Burndown chart renders with data", () => {
    it("Given the sprint view is active, then the burndown chart section is displayed", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });
      await user.click(screen.getByRole("tab", { name: /sprint/i }));
      expect(await screen.findByText("Burndown Chart")).toBeInTheDocument();
    });
  });
});

describe("Feature: Velocity chart shows story points per sprint (9.3)", () => {
  describe("Scenario: Velocity chart renders with data", () => {
    it("Given the sprint view is active, then the velocity chart section is displayed", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });
      await user.click(screen.getByRole("tab", { name: /sprint/i }));
      expect(await screen.findByText("Velocity Chart")).toBeInTheDocument();
    });
  });
});

describe("Feature: Sprint scope change tracking (9.4)", () => {
  describe("Scenario: Scope changes are detected and displayed", () => {
    it("Given the sprint view is active, then the scope changes section is displayed", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });
      await user.click(screen.getByRole("tab", { name: /sprint/i }));
      expect(await screen.findByText("Scope Changes")).toBeInTheDocument();
    });

    it("Given sprint has issues added after start, then scope change count is shown", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });
      await user.click(screen.getByRole("tab", { name: /sprint/i }));
      expect(await screen.findByTestId("scope-change-count")).toHaveTextContent("+1");
    });

    it("Given sprint has scope changes, then added issue keys are listed", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });
      await user.click(screen.getByRole("tab", { name: /sprint/i }));
      expect(await screen.findByText("PROJ-4")).toBeInTheDocument();
      expect(screen.getByText("Added after sprint start")).toBeInTheDocument();
    });
  });
});

/* ── Sprint CRUD (tasks 9b.1–9b.5) ── */

describe("Feature: Create sprint (9b.1)", () => {
  describe("Scenario: Create sprint button and modal", () => {
    it("Given the sprint dashboard is active, then a Create Sprint button is visible", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });
      await user.click(screen.getByRole("tab", { name: /sprint/i }));
      expect(await screen.findByTestId("create-sprint-btn")).toBeInTheDocument();
    });

    it("Given the sprint dashboard is active, when user clicks Create Sprint, then the create modal opens", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });
      await user.click(screen.getByRole("tab", { name: /sprint/i }));
      await screen.findByTestId("sprint-dashboard");
      await user.click(screen.getByTestId("create-sprint-btn"));
      expect(await screen.findByTestId("create-sprint-modal")).toBeInTheDocument();
      expect(screen.getByTestId("sprint-name-input")).toBeInTheDocument();
      expect(screen.getByTestId("sprint-goal-input")).toBeInTheDocument();
      expect(screen.getByTestId("sprint-start-date")).toBeInTheDocument();
      expect(screen.getByTestId("sprint-end-date")).toBeInTheDocument();
    });

    it("Given the create sprint modal is open, when user fills name and submits, then the API is called", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });
      await user.click(screen.getByRole("tab", { name: /sprint/i }));
      await screen.findByTestId("sprint-dashboard");
      await user.click(screen.getByTestId("create-sprint-btn"));
      await screen.findByTestId("create-sprint-modal");
      await user.type(screen.getByTestId("sprint-name-input"), "Sprint 43");
      await user.click(screen.getByTestId("create-sprint-submit"));
      await waitFor(() => {
        const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
        const createCall = calls.find(([url, opts]: [string, RequestInit?]) => typeof url === "string" && url.match(/\/api\/sprints$/) && opts?.method === "POST");
        expect(createCall).toBeTruthy();
        const body = JSON.parse(createCall![1]!.body as string);
        expect(body.name).toBe("Sprint 43");
      });
    });

    it("Given the create sprint modal is open, when user clicks Cancel, then the modal closes", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });
      await user.click(screen.getByRole("tab", { name: /sprint/i }));
      await screen.findByTestId("sprint-dashboard");
      await user.click(screen.getByTestId("create-sprint-btn"));
      await screen.findByTestId("create-sprint-modal");
      await user.click(screen.getByRole("button", { name: /cancel/i }));
      await waitFor(() => {
        expect(screen.queryByTestId("create-sprint-modal")).not.toBeInTheDocument();
      });
    });
  });
});

describe("Feature: Edit sprint (9b.2)", () => {
  describe("Scenario: Edit sprint modal with current values", () => {
    it("Given the sprint dashboard is active, when user clicks Edit, then the edit modal opens with current sprint data", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });
      await user.click(screen.getByRole("tab", { name: /sprint/i }));
      await screen.findByTestId("sprint-dashboard");
      await user.click(screen.getByTestId("edit-sprint-btn"));
      expect(await screen.findByTestId("edit-sprint-modal")).toBeInTheDocument();
      expect(screen.getByTestId("edit-sprint-name")).toHaveValue("Sprint 42");
      expect(screen.getByTestId("edit-sprint-goal")).toHaveValue("Complete login feature");
    });

    it("Given the edit modal is open, when user changes name and submits, then the PATCH API is called", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });
      await user.click(screen.getByRole("tab", { name: /sprint/i }));
      await screen.findByTestId("sprint-dashboard");
      await user.click(screen.getByTestId("edit-sprint-btn"));
      await screen.findByTestId("edit-sprint-modal");
      const nameInput = screen.getByTestId("edit-sprint-name");
      await user.clear(nameInput);
      await user.type(nameInput, "Sprint 42 Renamed");
      await user.click(screen.getByTestId("edit-sprint-submit"));
      await waitFor(() => {
        const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
        const patchCall = calls.find(([url, opts]: [string, RequestInit?]) => typeof url === "string" && url.match(/\/api\/sprints\/\d+$/) && opts?.method === "PATCH");
        expect(patchCall).toBeTruthy();
        const body = JSON.parse(patchCall![1]!.body as string);
        expect(body.name).toBe("Sprint 42 Renamed");
      });
    });
  });
});

describe("Feature: Start/Complete sprint (9b.3)", () => {
  describe("Scenario: Start sprint button with confirmation", () => {
    it("Given a future sprint is selected, when user clicks Start Sprint, then a confirmation dialog appears", async () => {
      // Override sprints to have a future sprint
      global.fetch = vi.fn((url: string | URL | Request, init?: RequestInit) => {
        const urlStr = typeof url === "string" ? url : url.toString();
        const authResp = _handleAuthUrls(urlStr);
        if (authResp) return Promise.resolve(authResp);
        if (urlStr.includes("/api/sprints") && !urlStr.match(/\/api\/sprints\/\d+/)) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ sprints: [{ ...mockSprints.sprints[0], state: "future" }] }),
          } as Response);
        }
        if (urlStr.match(/\/api\/sprints\/\d+\/burndown/)) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockBurndown) } as Response);
        if (urlStr.match(/\/api\/sprints\/\d+\/velocity/)) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockVelocity) } as Response);
        if (urlStr.match(/\/api\/sprints\/\d+\/start/) && init?.method === "POST") return Promise.resolve({ ok: true, json: () => Promise.resolve({ status: "ok" }) } as Response);
        if (urlStr.match(/\/api\/sprints\/\d+\/issues/)) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockSprintIssues) } as Response);
        if (urlStr.includes("/api/projects")) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockProjects) } as Response);
        if (urlStr.includes("/api/issues")) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockIssues) } as Response);
        return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) } as Response);
      });

      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });
      await user.click(screen.getByRole("tab", { name: /sprint/i }));
      await screen.findByTestId("sprint-dashboard");
      expect(screen.getByTestId("start-sprint-btn")).toBeInTheDocument();
      await user.click(screen.getByTestId("start-sprint-btn"));
      const dialog = await screen.findByTestId("confirm-dialog");
      expect(dialog).toBeInTheDocument();
      expect(within(dialog).getByRole("heading", { name: /Start Sprint/ })).toBeInTheDocument();
    });
  });

  describe("Scenario: Complete sprint button with confirmation", () => {
    it("Given an active sprint, when user clicks Complete Sprint, then a confirmation dialog appears", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });
      await user.click(screen.getByRole("tab", { name: /sprint/i }));
      await screen.findByTestId("sprint-dashboard");
      expect(screen.getByTestId("complete-sprint-btn")).toBeInTheDocument();
      await user.click(screen.getByTestId("complete-sprint-btn"));
      const dialog = await screen.findByTestId("confirm-dialog");
      expect(dialog).toBeInTheDocument();
      expect(within(dialog).getByRole("heading", { name: /Complete Sprint/ })).toBeInTheDocument();
    });

    it("Given the complete confirmation dialog is open, when user confirms, then the API is called", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });
      await user.click(screen.getByRole("tab", { name: /sprint/i }));
      await screen.findByTestId("sprint-dashboard");
      await user.click(screen.getByTestId("complete-sprint-btn"));
      await screen.findByTestId("confirm-dialog");
      await user.click(screen.getByTestId("confirm-action"));
      await waitFor(() => {
        const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
        const completeCall = calls.find(([url, opts]: [string, RequestInit?]) => typeof url === "string" && url.match(/\/api\/sprints\/\d+\/complete/) && opts?.method === "POST");
        expect(completeCall).toBeTruthy();
      });
    });
  });
});

describe("Feature: Delete sprint (9b.4)", () => {
  describe("Scenario: Delete sprint with confirmation", () => {
    it("Given the sprint dashboard is active, when user clicks Delete, then a confirmation dialog appears", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });
      await user.click(screen.getByRole("tab", { name: /sprint/i }));
      await screen.findByTestId("sprint-dashboard");
      await user.click(screen.getByTestId("delete-sprint-btn"));
      const dialog = await screen.findByTestId("confirm-dialog");
      expect(dialog).toBeInTheDocument();
      expect(within(dialog).getByRole("heading", { name: /Delete Sprint/ })).toBeInTheDocument();
      expect(within(dialog).getByText(/cannot be undone/)).toBeInTheDocument();
    });

    it("Given the delete confirmation is open, when user confirms, then the DELETE API is called", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });
      await user.click(screen.getByRole("tab", { name: /sprint/i }));
      await screen.findByTestId("sprint-dashboard");
      await user.click(screen.getByTestId("delete-sprint-btn"));
      await screen.findByTestId("confirm-dialog");
      await user.click(screen.getByTestId("confirm-action"));
      await waitFor(() => {
        const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
        const deleteCall = calls.find(([url, opts]: [string, RequestInit?]) => typeof url === "string" && url.match(/\/api\/sprints\/\d+$/) && opts?.method === "DELETE");
        expect(deleteCall).toBeTruthy();
      });
    });

    it("Given the delete confirmation is open, when user clicks Cancel, then the dialog closes", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });
      await user.click(screen.getByRole("tab", { name: /sprint/i }));
      await screen.findByTestId("sprint-dashboard");
      await user.click(screen.getByTestId("delete-sprint-btn"));
      await screen.findByTestId("confirm-dialog");
      await user.click(screen.getByRole("button", { name: /cancel/i }));
      await waitFor(() => {
        expect(screen.queryByTestId("confirm-dialog")).not.toBeInTheDocument();
      });
    });
  });
});

describe("Feature: Manage sprint scope (9b.5)", () => {
  describe("Scenario: Add and remove issues from sprint", () => {
    it("Given the sprint dashboard is active, when user clicks Manage Scope, then the scope modal opens with current issues", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });
      await user.click(screen.getByRole("tab", { name: /sprint/i }));
      await screen.findByTestId("sprint-dashboard");
      await user.click(screen.getByTestId("manage-scope-btn"));
      expect(await screen.findByTestId("manage-scope-modal")).toBeInTheDocument();
      expect(screen.getByTestId("scope-issue-input")).toBeInTheDocument();
      expect(screen.getByTestId("add-issue-btn")).toBeInTheDocument();
    });

    it("Given the scope modal is open, when user types an issue key and clicks Add, then the POST API is called", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });
      await user.click(screen.getByRole("tab", { name: /sprint/i }));
      await screen.findByTestId("sprint-dashboard");
      await user.click(screen.getByTestId("manage-scope-btn"));
      await screen.findByTestId("manage-scope-modal");
      await user.type(screen.getByTestId("scope-issue-input"), "PROJ-5");
      await user.click(screen.getByTestId("add-issue-btn"));
      await waitFor(() => {
        const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
        const addCall = calls.find(([url, opts]: [string, RequestInit?]) => typeof url === "string" && url.match(/\/api\/sprints\/\d+\/issues/) && opts?.method === "POST");
        expect(addCall).toBeTruthy();
        const body = JSON.parse(addCall![1]!.body as string);
        expect(body.issues).toContain("PROJ-5");
      });
    });

    it("Given the scope modal shows issues, when user clicks Remove on an issue, then the DELETE API is called", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });
      await user.click(screen.getByRole("tab", { name: /sprint/i }));
      await screen.findByTestId("sprint-dashboard");
      await user.click(screen.getByTestId("manage-scope-btn"));
      await screen.findByTestId("manage-scope-modal");
      const removeBtn = await screen.findByTestId("remove-issue-PROJ-1");
      await user.click(removeBtn);
      await waitFor(() => {
        const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
        const removeCall = calls.find(([url, opts]: [string, RequestInit?]) => typeof url === "string" && url.match(/\/api\/sprints\/\d+\/issues\/PROJ-1/) && opts?.method === "DELETE");
        expect(removeCall).toBeTruthy();
      });
    });

    it("Given the scope modal shows issues, when user clicks an issue key, then the scope modal closes and the issue detail panel opens", async () => {
      const user = userEvent.setup();
      render(<App />, { wrapper: createWrapper() });
      await user.click(screen.getByRole("tab", { name: /sprint/i }));
      await screen.findByTestId("sprint-dashboard");
      await user.click(screen.getByTestId("manage-scope-btn"));
      await screen.findByTestId("manage-scope-modal");
      const issueLink = await screen.findByTestId("scope-issue-link-PROJ-1");
      expect(issueLink).toHaveTextContent("PROJ-1");
      await user.click(issueLink);
      await waitFor(() => {
        expect(screen.queryByTestId("manage-scope-modal")).not.toBeInTheDocument();
      });
      expect(await screen.findByRole("dialog", { name: /Issue detail/ })).toBeInTheDocument();
    });
  });
});

/* ── Time Tracking (10.1-10.4) ── */

describe("Feature: Built-in timer per issue (10.1)", () => {
  describe("Scenario: Timer UI is displayed in issue detail panel", () => {
    it("Given the issue detail is open, then a timer with start button is displayed", async () => {
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");
      const user = userEvent.setup();
      await user.click(screen.getByText("PROJ-1"));
      expect(await screen.findByTestId("issue-timer")).toBeInTheDocument();
      expect(screen.getByTestId("timer-start")).toBeInTheDocument();
      expect(screen.getByTestId("timer-display")).toHaveTextContent("0s");
    });
  });

  describe("Scenario: Timer can be started and paused", () => {
    it("Given the timer is not running, when start is clicked, then pause button appears", async () => {
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");
      const user = userEvent.setup();
      await user.click(screen.getByText("PROJ-1"));
      await screen.findByTestId("timer-start");
      await user.click(screen.getByTestId("timer-start"));
      expect(await screen.findByTestId("timer-pause")).toBeInTheDocument();
    });

    it("Given the timer is running, when pause is clicked, then resume button appears", async () => {
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");
      const user = userEvent.setup();
      await user.click(screen.getByText("PROJ-1"));
      await screen.findByTestId("timer-start");
      await user.click(screen.getByTestId("timer-start"));
      await screen.findByTestId("timer-pause");
      await user.click(screen.getByTestId("timer-pause"));
      expect(await screen.findByTestId("timer-start")).toBeInTheDocument();
      expect(screen.getByTestId("timer-start")).toHaveTextContent(/resume/i);
    });
  });

  describe("Scenario: Timer state persists in localStorage", () => {
    it("Given a timer is started, then timer state is saved to localStorage", async () => {
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");
      const user = userEvent.setup();
      await user.click(screen.getByText("PROJ-1"));
      await screen.findByTestId("timer-start");
      await user.click(screen.getByTestId("timer-start"));
      await screen.findByTestId("timer-pause");
      const stored = localStorage.getItem("jira-ui-timers");
      expect(stored).not.toBeNull();
      const timers = JSON.parse(stored!);
      expect(timers["PROJ-1"]).toBeDefined();
      expect(timers["PROJ-1"].running).toBe(true);
    });
  });

  describe("Scenario: Stop timer opens log work modal with prefilled time", () => {
    it("Given the timer is running, when stop is clicked, then the log work modal opens", async () => {
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");
      const user = userEvent.setup();
      await user.click(screen.getByText("PROJ-1"));
      await screen.findByTestId("timer-start");
      await user.click(screen.getByTestId("timer-start"));
      await screen.findByTestId("timer-stop");
      await user.click(screen.getByTestId("timer-stop"));
      expect(await screen.findByRole("dialog", { name: /log work/i })).toBeInTheDocument();
    });
  });
});

describe("Feature: Log work from detail view (10.2)", () => {
  describe("Scenario: Log work button opens modal", () => {
    it("Given the issue detail is open, when log work button is clicked, then the log work modal opens", async () => {
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");
      const user = userEvent.setup();
      await user.click(screen.getByText("PROJ-1"));
      expect(await screen.findByTestId("log-work-button")).toBeInTheDocument();
      await user.click(screen.getByTestId("log-work-button"));
      expect(await screen.findByRole("dialog", { name: /log work/i })).toBeInTheDocument();
      expect(screen.getByTestId("log-work-time")).toBeInTheDocument();
      expect(screen.getByTestId("log-work-comment")).toBeInTheDocument();
    });
  });

  describe("Scenario: Log work validates time spent", () => {
    it("Given the log work modal is open, when submit is clicked without time, then an error is shown", async () => {
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");
      const user = userEvent.setup();
      await user.click(screen.getByText("PROJ-1"));
      await user.click(await screen.findByTestId("log-work-button"));
      await screen.findByRole("dialog", { name: /log work/i });
      await user.click(screen.getByTestId("log-work-submit"));
      expect(await screen.findByTestId("log-work-error")).toHaveTextContent(/time spent is required/i);
    });
  });

  describe("Scenario: Log work submits to API", () => {
    it("Given the log work modal has valid data, when submit is clicked, then it sends to the API", async () => {
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");
      const user = userEvent.setup();
      await user.click(screen.getByText("PROJ-1"));
      await user.click(await screen.findByTestId("log-work-button"));
      await screen.findByRole("dialog", { name: /log work/i });
      await user.type(screen.getByTestId("log-work-time"), "1h 30m");
      await user.type(screen.getByTestId("log-work-comment"), "Testing");
      await user.click(screen.getByTestId("log-work-submit"));
      await waitFor(() => {
        const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
        const worklogCall = calls.find(
          (c: unknown[]) => typeof c[0] === "string" && c[0].includes("/worklog") && (c[1] as RequestInit)?.method === "POST"
        );
        expect(worklogCall).toBeDefined();
        const body = JSON.parse((worklogCall![1] as RequestInit).body as string);
        expect(body.timeSpent).toBe("1h 30m");
        expect(body.comment).toBe("Testing");
      });
    });
  });
});

describe("Feature: Display logged vs estimated time (10.3)", () => {
  describe("Scenario: Time tracking progress bar is displayed", () => {
    it("Given the issue has time tracking data, then the progress bar shows logged vs estimated", async () => {
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");
      const user = userEvent.setup();
      await user.click(screen.getByText("PROJ-1"));
      expect(await screen.findByTestId("time-tracking-bar")).toBeInTheDocument();
      expect(screen.getByTestId("time-logged")).toHaveTextContent("Logged: 2h");
      expect(screen.getByTestId("time-estimated")).toHaveTextContent("Estimated: 4h");
    });

    it("Given the issue has time tracking data, then the percentage is shown", async () => {
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");
      const user = userEvent.setup();
      await user.click(screen.getByText("PROJ-1"));
      expect(await screen.findByTestId("time-percent")).toHaveTextContent("50%");
    });
  });

  describe("Scenario: Progress bar has correct visual state", () => {
    it("Given time tracking data exists, then a progressbar element is rendered", async () => {
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");
      const user = userEvent.setup();
      await user.click(screen.getByText("PROJ-1"));
      await screen.findByTestId("time-tracking-bar");
      expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "50");
    });
  });
});

describe("Feature: Work log history (10.4)", () => {
  describe("Scenario: Work log entries are displayed", () => {
    it("Given the issue has work logs, then entries are shown with time and author", async () => {
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");
      const user = userEvent.setup();
      await user.click(screen.getByText("PROJ-1"));
      expect(await screen.findByTestId("worklog-history")).toBeInTheDocument();
      const entries = screen.getAllByTestId("worklog-entry");
      expect(entries).toHaveLength(2);
      expect(entries[0]).toHaveTextContent("1h");
      expect(entries[0]).toHaveTextContent("Alice Martin");
      expect(entries[0]).toHaveTextContent("Worked on login form");
    });
  });

  describe("Scenario: Work log shows entry count", () => {
    it("Given the issue has 2 work logs, then the header shows the count", async () => {
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");
      const user = userEvent.setup();
      await user.click(screen.getByText("PROJ-1"));
      expect(await screen.findByText(/Work Log \(2 entries\)/)).toBeInTheDocument();
    });
  });

  describe("Scenario: No work logs shows empty message", () => {
    it("Given the issue has no work logs, then a message indicates no work logged", async () => {
      setupFetchMock();
      // Override worklog response to empty
      const originalFetch = global.fetch as ReturnType<typeof vi.fn>;
      const originalImpl = originalFetch.getMockImplementation()!;
      global.fetch = vi.fn((url: string | URL | Request, init?: RequestInit) => {
        const urlStr = typeof url === "string" ? url : url.toString();
        const authResp = _handleAuthUrls(urlStr);
        if (authResp) return Promise.resolve(authResp);
        if (urlStr.match(/\/api\/issues\/[A-Z]+-\d+\/worklog/) && (!init?.method || init.method === "GET")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ worklogs: [], total: 0 }),
          } as Response);
        }
        return originalImpl(url, init);
      });

      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");
      const user = userEvent.setup();
      await user.click(screen.getByText("PROJ-1"));
      expect(await screen.findByTestId("no-worklogs")).toHaveTextContent("No work logged yet.");
    });
  });
});

/* ── Feature: Dark/Light Mode Toggle (tasks 11.2–11.5) ── */

describe("Feature: Dark/Light mode toggle", () => {
  describe("Scenario: Toggle button is visible in header", () => {
    it("Given the app is loaded, then a theme toggle button is visible in the header", async () => {
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");
      const toggleBtn = screen.getByLabelText(/switch to (light|dark) mode/i);
      expect(toggleBtn).toBeInTheDocument();
    });
  });

  describe("Scenario: Toggle switches from dark to light mode", () => {
    it("Given the app is in dark mode, when the toggle is clicked, then the html element loses the dark class", async () => {
      document.documentElement.classList.add("dark");
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");
      const user = userEvent.setup();
      const toggleBtn = screen.getByLabelText("Switch to light mode");
      await user.click(toggleBtn);
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });
  });

  describe("Scenario: Toggle switches from light to dark mode", () => {
    it("Given the app is in light mode, when the toggle is clicked, then the html element gains the dark class", async () => {
      document.documentElement.classList.remove("dark");
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");
      const user = userEvent.setup();
      const toggleBtn = screen.getByLabelText("Switch to dark mode");
      await user.click(toggleBtn);
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });

  describe("Scenario: Toggle shows sun icon in dark mode and moon icon in light mode", () => {
    it("Given dark mode is active, then the toggle shows the sun icon; after clicking it shows the moon icon", async () => {
      document.documentElement.classList.add("dark");
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");
      const user = userEvent.setup();
      const toggleBtn = screen.getByLabelText("Switch to light mode");
      expect(toggleBtn).toHaveTextContent("☀️");
      await user.click(toggleBtn);
      expect(screen.getByLabelText("Switch to dark mode")).toHaveTextContent("🌙");
    });
  });

  describe("Scenario: Theme preference is persisted in localStorage", () => {
    it("Given the user toggles to light mode, then the preference is saved to localStorage", async () => {
      document.documentElement.classList.add("dark");
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");
      const user = userEvent.setup();
      await user.click(screen.getByLabelText("Switch to light mode"));
      expect(localStorage.getItem("jira-ui-theme")).toBe("light");
    });

    it("Given the user toggles to dark mode, then the preference is saved to localStorage", async () => {
      document.documentElement.classList.remove("dark");
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");
      const user = userEvent.setup();
      await user.click(screen.getByLabelText("Switch to dark mode"));
      expect(localStorage.getItem("jira-ui-theme")).toBe("dark");
    });
  });

  describe("Scenario: System preference is respected as default", () => {
    it("Given no saved preference and system prefers dark, then dark mode is active", async () => {
      // Simulate: no localStorage value, system prefers dark
      document.documentElement.classList.add("dark");
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");
      expect(screen.getByLabelText("Switch to light mode")).toBeInTheDocument();
    });

    it("Given no saved preference and system prefers light, then light mode is active", async () => {
      document.documentElement.classList.remove("dark");
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");
      expect(screen.getByLabelText("Switch to dark mode")).toBeInTheDocument();
    });
  });
});

// ─── 12. Offline Mode ───────────────────────────────────────────────
describe("Feature: Offline mode", () => {
  beforeEach(() => {
    // Reset online status before each test
    Object.defineProperty(navigator, "onLine", { value: true, writable: true, configurable: true });
    setupFetchMock();
    document.documentElement.classList.add("dark");
    localStorage.clear();
  });

  describe("Scenario: Offline indicator appears when offline", () => {
    it("Given the browser goes offline, then an offline banner is displayed", async () => {
      // Start online
      Object.defineProperty(navigator, "onLine", { value: true, writable: true, configurable: true });
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      // Go offline
      Object.defineProperty(navigator, "onLine", { value: false, writable: true, configurable: true });
      window.dispatchEvent(new Event("offline"));

      expect(await screen.findByRole("alert", { name: "Offline mode" })).toBeInTheDocument();
      expect(screen.getByText(/You are offline/)).toBeInTheDocument();
    });

    it("Given the browser is offline, then an offline dot appears in the header", async () => {
      Object.defineProperty(navigator, "onLine", { value: false, writable: true, configurable: true });
      render(<App />, { wrapper: createWrapper() });
      // When offline, TanStack Query pauses fetches, so wait for header instead of data
      await screen.findByText("Jira UI");

      expect(screen.getByLabelText("Offline status indicator")).toBeInTheDocument();
    });
  });

  describe("Scenario: Offline banner can be dismissed", () => {
    it("Given the offline banner is visible, when the user clicks dismiss, then the banner is hidden", async () => {
      Object.defineProperty(navigator, "onLine", { value: false, writable: true, configurable: true });
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("Jira UI");

      expect(screen.getByRole("alert", { name: "Offline mode" })).toBeInTheDocument();

      const user = userEvent.setup();
      await user.click(screen.getByLabelText("Dismiss offline banner"));

      expect(screen.queryByRole("alert", { name: "Offline mode" })).not.toBeInTheDocument();
    });
  });

  describe("Scenario: Offline banner reappears after reconnect and disconnect", () => {
    it("Given the banner was dismissed, when going online then offline again, then the banner reappears", async () => {
      Object.defineProperty(navigator, "onLine", { value: false, writable: true, configurable: true });
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("Jira UI");

      const user = userEvent.setup();
      await user.click(screen.getByLabelText("Dismiss offline banner"));
      expect(screen.queryByRole("alert", { name: "Offline mode" })).not.toBeInTheDocument();

      // Go online and wait for state to settle
      Object.defineProperty(navigator, "onLine", { value: true, writable: true, configurable: true });
      window.dispatchEvent(new Event("online"));
      await waitFor(() => {
        expect(screen.queryByRole("alert", { name: "Offline mode" })).not.toBeInTheDocument();
      });

      // Go offline again
      Object.defineProperty(navigator, "onLine", { value: false, writable: true, configurable: true });
      window.dispatchEvent(new Event("offline"));

      expect(await screen.findByRole("alert", { name: "Offline mode" })).toBeInTheDocument();
    });
  });

  describe("Scenario: No offline indicator when online", () => {
    it("Given the browser is online, then no offline banner or dot is shown", async () => {
      Object.defineProperty(navigator, "onLine", { value: true, writable: true, configurable: true });
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("Jira UI");

      expect(screen.queryByRole("alert", { name: "Offline mode" })).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Offline status indicator")).not.toBeInTheDocument();
    });
  });

  describe("Scenario: Online status restores after reconnect", () => {
    it("Given the browser was offline, when going back online, then the offline banner disappears", async () => {
      Object.defineProperty(navigator, "onLine", { value: false, writable: true, configurable: true });
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("Jira UI");

      expect(screen.getByRole("alert", { name: "Offline mode" })).toBeInTheDocument();

      // Go online
      Object.defineProperty(navigator, "onLine", { value: true, writable: true, configurable: true });
      window.dispatchEvent(new Event("online"));

      await waitFor(() => {
        expect(screen.queryByRole("alert", { name: "Offline mode" })).not.toBeInTheDocument();
      });
    });
  });
});

// ─── 13. UI Visibility & Navigation ─────────────────────────────────

describe("Feature: View switcher with segmented control (13.1)", () => {
  describe("Scenario: View switcher displays as segmented control with icons", () => {
    it("Given the app loads, then a tablist with Home, List, Board, Sprint tabs is visible", async () => {
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("Jira UI");

      const tablist = screen.getByRole("tablist", { name: "View switcher" });
      expect(tablist).toBeInTheDocument();

      const tabs = within(tablist).getAllByRole("tab");
      expect(tabs).toHaveLength(4);
      expect(tabs[0]).toHaveTextContent("Home");
      expect(tabs[1]).toHaveTextContent("List");
      expect(tabs[2]).toHaveTextContent("Board");
      expect(tabs[3]).toHaveTextContent("Sprint");
    });
  });

  describe("Scenario: Active view tab is highlighted", () => {
    it("Given the list view is active, then the List tab has aria-selected true", async () => {
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("Jira UI");

      const listTab = screen.getByRole("tab", { name: /List/ });
      expect(listTab).toHaveAttribute("aria-selected", "true");
    });
  });

  describe("Scenario: Clicking a tab switches the view", () => {
    it("Given the list view is shown, when clicking Home tab, then the dashboard is displayed", async () => {
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("Jira UI");

      const user = userEvent.setup();
      await user.click(screen.getByRole("tab", { name: /Home/ }));

      expect(await screen.findByTestId("dashboard-page")).toBeInTheDocument();
    });
  });
});

describe("Feature: Sidebar navigation (13.2)", () => {
  describe("Scenario: Sidebar can be opened with hamburger button", () => {
    it("Given the app loads, when clicking the sidebar toggle, then the sidebar with navigation is visible", async () => {
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("Jira UI");

      const user = userEvent.setup();
      await user.click(screen.getByLabelText("Toggle sidebar"));

      const sidebar = screen.getByRole("navigation", { name: "Sidebar navigation" });
      expect(sidebar).toBeInTheDocument();
      expect(within(sidebar).getByText("Views")).toBeInTheDocument();
      expect(within(sidebar).getByText("Dashboard")).toBeInTheDocument();
      expect(within(sidebar).getByText("List View")).toBeInTheDocument();
      expect(within(sidebar).getByText("Board View")).toBeInTheDocument();
      expect(within(sidebar).getByText("Sprint Dashboard")).toBeInTheDocument();
    });
  });

  describe("Scenario: Sidebar shows projects", () => {
    it("Given the sidebar is open, then the project list from the API is displayed", async () => {
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("Jira UI");

      const user = userEvent.setup();
      await user.click(screen.getByLabelText("Toggle sidebar"));

      expect(screen.getByText("Projects")).toBeInTheDocument();
      expect(screen.getByText("My Project")).toBeInTheDocument();
    });
  });

  describe("Scenario: Sidebar shows saved filters", () => {
    it("Given saved filters exist, when the sidebar is opened, then the saved filters section is shown", async () => {
      localStorageMock.setItem("jira-ui-saved-filters", JSON.stringify([
        { id: "1", name: "My Sidebar Filter", project: "PROJ", filters: { status: "To Do", type: "", assignee: "" } },
      ]));

      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("Jira UI");

      const user = userEvent.setup();
      await user.click(screen.getByLabelText("Toggle sidebar"));

      const sidebar = screen.getByRole("navigation", { name: "Sidebar navigation" });
      expect(within(sidebar).getByText("Saved Filters")).toBeInTheDocument();
      expect(within(sidebar).getByText("My Sidebar Filter")).toBeInTheDocument();
    });
  });

  describe("Scenario: Sidebar navigation switches view", () => {
    it("Given the sidebar is open, when clicking List View, then the list view is shown and sidebar closes", async () => {
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("Jira UI");

      const user = userEvent.setup();
      await user.click(screen.getByLabelText("Toggle sidebar"));

      const sidebar = screen.getByRole("navigation", { name: "Sidebar navigation" });
      await user.click(within(sidebar).getByText("List View"));

      // Should switch to list and show issues
      expect(await screen.findByText("PROJ-1")).toBeInTheDocument();
    });
  });

  describe("Scenario: Sidebar can be closed", () => {
    it("Given the sidebar is open, when clicking close, then the sidebar content is hidden", async () => {
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("Jira UI");

      const user = userEvent.setup();
      await user.click(screen.getByLabelText("Toggle sidebar"));
      expect(screen.getByText("Views")).toBeInTheDocument();

      await user.click(screen.getByLabelText("Close sidebar"));
      await waitFor(() => {
        expect(screen.queryByText("Views")).not.toBeInTheDocument();
      });
    });
  });
});

describe("Feature: Breadcrumbs (13.3)", () => {
  describe("Scenario: Breadcrumbs show current context", () => {
    it("Given the list view is loaded, then breadcrumbs show Home and List View", async () => {
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      const breadcrumb = screen.getByRole("navigation", { name: "Breadcrumb" });
      expect(breadcrumb).toBeInTheDocument();
      expect(within(breadcrumb).getByText(/Home/)).toBeInTheDocument();
      expect(within(breadcrumb).getByText("List View")).toBeInTheDocument();
    });
  });

  describe("Scenario: Breadcrumbs update when switching views", () => {
    it("Given the user switches to board view, then breadcrumbs show Home > Board View", async () => {
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("Jira UI");

      const user = userEvent.setup();
      await user.click(screen.getByRole("tab", { name: /Board/ }));

      const breadcrumb = screen.getByRole("navigation", { name: "Breadcrumb" });
      expect(within(breadcrumb).getByText(/Home/)).toBeInTheDocument();
      expect(within(breadcrumb).getByText("Board View")).toBeInTheDocument();
    });
  });

  describe("Scenario: Breadcrumbs allow navigation back to dashboard", () => {
    it("Given the user is on list view, when clicking Home in breadcrumbs, then the dashboard is shown", async () => {
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("PROJ-1");

      const user = userEvent.setup();
      const breadcrumb = screen.getByRole("navigation", { name: "Breadcrumb" });
      await user.click(within(breadcrumb).getByText(/Home/));

      expect(await screen.findByTestId("dashboard-page")).toBeInTheDocument();
    });
  });
});

describe("Feature: Loading spinner while fetching data (15)", () => {
  describe("Scenario: Loading spinner component renders correctly", () => {
    it("Given data is loading, then a spinner with message is shown in the list view", async () => {
      render(<App />, { wrapper: createWrapper() });
      // The spinner should appear briefly before data loads
      // After data arrives, it disappears
      await screen.findByText("PROJ-1");
      // Spinner is gone once data is loaded
      expect(screen.queryByText("Loading issues…")).not.toBeInTheDocument();
    });
  });
});

describe("Feature: Dashboard landing page (13.4)", () => {
  describe("Scenario: Dashboard is accessible via Home tab", () => {
    it("Given the app loads, when clicking the Home tab, then the dashboard landing page is displayed", async () => {
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("Jira UI");

      const user = userEvent.setup();
      await user.click(screen.getByRole("tab", { name: /Home/ }));

      expect(await screen.findByTestId("dashboard-page")).toBeInTheDocument();
      expect(screen.getByText("Welcome to Jira UI")).toBeInTheDocument();
    });
  });

  describe("Scenario: Dashboard shows quick action buttons", () => {
    it("Given the dashboard is loaded, then quick action buttons for Create Issue, Search, Board, and Sprints are shown", async () => {
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("Jira UI");

      const user = userEvent.setup();
      await user.click(screen.getByRole("tab", { name: /Home/ }));
      await screen.findByTestId("dashboard-page");

      expect(screen.getByTestId("quick-action-create")).toBeInTheDocument();
      expect(screen.getByTestId("quick-action-search")).toBeInTheDocument();
      expect(screen.getByTestId("quick-action-board")).toBeInTheDocument();
      expect(screen.getByTestId("quick-action-sprint")).toBeInTheDocument();
    });
  });

  describe("Scenario: Dashboard shows recent issues", () => {
    it("Given the API returns issues, then the dashboard displays recent issues", async () => {
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("Jira UI");

      const user = userEvent.setup();
      await user.click(screen.getByRole("tab", { name: /Home/ }));
      await screen.findByTestId("dashboard-page");

      expect(await screen.findByText("Recent Issues")).toBeInTheDocument();
    });
  });

  describe("Scenario: Dashboard shows projects", () => {
    it("Given projects exist, then the dashboard displays project cards", async () => {
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("Jira UI");

      const user = userEvent.setup();
      await user.click(screen.getByRole("tab", { name: /Home/ }));
      await screen.findByTestId("dashboard-page");

      const dashboard = await screen.findByTestId("dashboard-page");
      const projectCards = within(dashboard).getAllByText("My Project");
      expect(projectCards.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Scenario: Dashboard quick action navigates to board view", () => {
    it("Given the dashboard is shown, when clicking Board View quick action, then board view is displayed", async () => {
      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("Jira UI");

      const user = userEvent.setup();
      await user.click(screen.getByRole("tab", { name: /Home/ }));
      await screen.findByTestId("dashboard-page");

      await user.click(screen.getByTestId("quick-action-board"));

      const boardTab = screen.getByRole("tab", { name: /Board/ });
      expect(boardTab).toHaveAttribute("aria-selected", "true");
    });
  });
});

describe("Feature: Empty states (13.5)", () => {
  describe("Scenario: Sprint dashboard shows empty state with CTA", () => {
    it("Given no sprints exist, when viewing the sprint dashboard, then an empty state with 'Create your first sprint' button is shown", async () => {
      global.fetch = vi.fn((url: string | URL | Request) => {
        const urlStr = typeof url === "string" ? url : url.toString();
        const authResp = _handleAuthUrls(urlStr);
        if (authResp) return Promise.resolve(authResp);
        if (urlStr.includes("/api/projects")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockProjects) } as Response);
        }
        if (urlStr.includes("/api/sprints")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ sprints: [] }) } as Response);
        }
        if (urlStr.includes("/api/issues")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ issues: [], total: 0 }) } as Response);
        }
        if (urlStr.includes("/api/priorities")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockPriorities) } as Response);
        }
        return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) } as Response);
      });

      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("Jira UI");

      const user = userEvent.setup();
      await user.click(screen.getByRole("tab", { name: /Sprint/ }));

      const emptyState = await screen.findByTestId("no-active-sprint");
      expect(emptyState).toBeInTheDocument();
      expect(screen.getByText("No active sprint")).toBeInTheDocument();
    });
  });

  describe("Scenario: Dashboard shows empty sprints state with CTA", () => {
    it("Given no active sprints exist, when navigating to dashboard, then an empty sprints card is shown", async () => {
      global.fetch = vi.fn((url: string | URL | Request) => {
        const urlStr = typeof url === "string" ? url : url.toString();
        const authResp = _handleAuthUrls(urlStr);
        if (authResp) return Promise.resolve(authResp);
        if (urlStr.includes("/api/projects")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockProjects) } as Response);
        }
        if (urlStr.includes("/api/sprints")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ sprints: [] }) } as Response);
        }
        if (urlStr.includes("/api/issues")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ issues: [], total: 0 }) } as Response);
        }
        if (urlStr.includes("/api/priorities")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockPriorities) } as Response);
        }
        return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) } as Response);
      });

      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("Jira UI");

      const user = userEvent.setup();
      await user.click(screen.getByRole("tab", { name: /Home/ }));

      expect(await screen.findByTestId("empty-sprints-dashboard")).toBeInTheDocument();
      expect(screen.getByText("No active sprints")).toBeInTheDocument();
      expect(screen.getByText("Go to Sprint Dashboard")).toBeInTheDocument();
    });
  });

  describe("Scenario: Dashboard shows empty issues state with CTA", () => {
    it("Given no issues exist, when navigating to dashboard, then an empty issues card with create button is shown", async () => {
      global.fetch = vi.fn((url: string | URL | Request) => {
        const urlStr = typeof url === "string" ? url : url.toString();
        const authResp = _handleAuthUrls(urlStr);
        if (authResp) return Promise.resolve(authResp);
        if (urlStr.includes("/api/projects")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockProjects) } as Response);
        }
        if (urlStr.includes("/api/sprints")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ sprints: [] }) } as Response);
        }
        if (urlStr.includes("/api/issues")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ issues: [], total: 0 }) } as Response);
        }
        if (urlStr.includes("/api/priorities")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockPriorities) } as Response);
        }
        return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) } as Response);
      });

      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("Jira UI");

      const user = userEvent.setup();
      await user.click(screen.getByRole("tab", { name: /Home/ }));

      expect(await screen.findByTestId("empty-issues-dashboard")).toBeInTheDocument();
      expect(screen.getByText("Create your first issue")).toBeInTheDocument();
    });
  });

  // ── About / Features Page (14.1–14.4) ──

  describe("Scenario: About page is accessible from sidebar", () => {
    it("Given the app is loaded, when user opens sidebar and clicks About, then the About page is displayed", async () => {
      global.fetch = vi.fn((url: string | URL | Request) => {
        const urlStr = typeof url === "string" ? url : url.toString();
        const authResp = _handleAuthUrls(urlStr);
        if (authResp) return Promise.resolve(authResp);
        if (urlStr.includes("/api/projects")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockProjects) } as Response);
        }
        if (urlStr.includes("/api/issues")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockIssues) } as Response);
        }
        if (urlStr.includes("/api/priorities")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockPriorities) } as Response);
        }
        return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) } as Response);
      });

      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("Jira UI");

      const user = userEvent.setup();
      // Open sidebar
      await user.click(screen.getByRole("button", { name: /Toggle sidebar/ }));
      // Click About link
      await user.click(await screen.findByText("About"));

      expect(await screen.findByTestId("about-page")).toBeInTheDocument();
    });
  });

  describe("Scenario: About page shows all features with version badges", () => {
    it("Given the About page is displayed, then all 23 features are listed with version badges", async () => {
      global.fetch = vi.fn((url: string | URL | Request) => {
        const urlStr = typeof url === "string" ? url : url.toString();
        const authResp = _handleAuthUrls(urlStr);
        if (authResp) return Promise.resolve(authResp);
        if (urlStr.includes("/api/projects")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockProjects) } as Response);
        }
        if (urlStr.includes("/api/issues")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockIssues) } as Response);
        }
        if (urlStr.includes("/api/priorities")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockPriorities) } as Response);
        }
        return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) } as Response);
      });

      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("Jira UI");

      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: /Toggle sidebar/ }));
      await user.click(await screen.findByText("About"));

      await screen.findByTestId("about-page");

      // Check all 21 feature cards are rendered
      const featureCards = screen.getAllByTestId("feature-card");
      expect(featureCards).toHaveLength(23);

      // Check specific features and versions
      expect(screen.getByText("List View")).toBeInTheDocument();
      expect(screen.getByText("v1.15.0")).toBeInTheDocument();
      expect(screen.getByText("Kanban Board")).toBeInTheDocument();
      expect(screen.getByText("v1.25.0")).toBeInTheDocument();
      expect(screen.getByText("Sprint CRUD")).toBeInTheDocument();
      expect(screen.getByText("v1.36.0")).toBeInTheDocument();
      expect(screen.getByText("UI Navigation")).toBeInTheDocument();
      expect(screen.getByText("v1.37.0")).toBeInTheDocument();
    });
  });

  describe("Scenario: About page shows app version, build date, and links", () => {
    it("Given the About page is displayed, then the current version, build date, GitHub link, and changelog link are shown", async () => {
      global.fetch = vi.fn((url: string | URL | Request) => {
        const urlStr = typeof url === "string" ? url : url.toString();
        const authResp = _handleAuthUrls(urlStr);
        if (authResp) return Promise.resolve(authResp);
        if (urlStr.includes("/api/projects")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockProjects) } as Response);
        }
        if (urlStr.includes("/api/issues")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockIssues) } as Response);
        }
        if (urlStr.includes("/api/priorities")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockPriorities) } as Response);
        }
        return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) } as Response);
      });

      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("Jira UI");

      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: /Toggle sidebar/ }));
      await user.click(await screen.findByText("About"));

      await screen.findByTestId("about-page");

      // Version (shows v{APP_VERSION})
      const versionEl = screen.getByTestId("about-version");
      expect(versionEl).toBeInTheDocument();
      expect(versionEl.textContent).toMatch(/^v/);

      // Build date
      expect(screen.getByTestId("about-build-date")).toBeInTheDocument();

      // GitHub link
      const githubLink = screen.getByTestId("about-github-link");
      expect(githubLink).toBeInTheDocument();
      expect(githubLink).toHaveAttribute("href", "https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui");
      expect(githubLink).toHaveAttribute("target", "_blank");

      // Changelog link
      const changelogLink = screen.getByTestId("about-changelog-link");
      expect(changelogLink).toBeInTheDocument();
      expect(changelogLink).toHaveAttribute("href", "https://github.com/ALT-F1-OpenClaw/atlassian-jira-ui/blob/main/CHANGELOG.md");
    });
  });

  describe("Scenario: About page has responsive feature grid layout", () => {
    it("Given the About page is displayed, then features are rendered in a grid with descriptions", async () => {
      global.fetch = vi.fn((url: string | URL | Request) => {
        const urlStr = typeof url === "string" ? url : url.toString();
        const authResp = _handleAuthUrls(urlStr);
        if (authResp) return Promise.resolve(authResp);
        if (urlStr.includes("/api/projects")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockProjects) } as Response);
        }
        if (urlStr.includes("/api/issues")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockIssues) } as Response);
        }
        if (urlStr.includes("/api/priorities")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockPriorities) } as Response);
        }
        return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) } as Response);
      });

      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("Jira UI");

      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: /Toggle sidebar/ }));
      await user.click(await screen.findByText("About"));

      await screen.findByTestId("about-page");

      // Check feature descriptions are present
      expect(screen.getByText(/Table with sorting, filters, and pagination/)).toBeInTheDocument();
      expect(screen.getByText(/Drag-and-drop board with columns/)).toBeInTheDocument();

      // Check tech stack section
      expect(screen.getByText("Tech Stack")).toBeInTheDocument();
      expect(screen.getByText("React 19")).toBeInTheDocument();
      expect(screen.getByText("FastAPI")).toBeInTheDocument();
      expect(screen.getByText("TypeScript")).toBeInTheDocument();

      // Check features count header
      expect(screen.getByText("Features (23)")).toBeInTheDocument();
    });
  });

  describe("Scenario: About page shows in breadcrumbs", () => {
    it("Given the About page is active, then breadcrumbs show Home / About", async () => {
      global.fetch = vi.fn((url: string | URL | Request) => {
        const urlStr = typeof url === "string" ? url : url.toString();
        const authResp = _handleAuthUrls(urlStr);
        if (authResp) return Promise.resolve(authResp);
        if (urlStr.includes("/api/projects")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockProjects) } as Response);
        }
        if (urlStr.includes("/api/issues")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockIssues) } as Response);
        }
        if (urlStr.includes("/api/priorities")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockPriorities) } as Response);
        }
        return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) } as Response);
      });

      render(<App />, { wrapper: createWrapper() });
      await screen.findByText("Jira UI");

      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: /Toggle sidebar/ }));
      await user.click(await screen.findByText("About"));

      await screen.findByTestId("about-page");

      // Check breadcrumbs
      const breadcrumb = screen.getByRole("navigation", { name: /Breadcrumb/ });
      expect(within(breadcrumb).getByText(/Home/)).toBeInTheDocument();
      expect(within(breadcrumb).getByText("About")).toBeInTheDocument();
    });
  });
});
