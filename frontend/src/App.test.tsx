import { render, screen, within, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, beforeEach, vi } from "vitest";
import App from "./App";

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
};

const mockLabels = ["frontend", "auth", "backend", "bug", "enhancement", "documentation"];

function setupFetchMock(overrides?: { issueDetail?: object; patchResponse?: object; transitionResponse?: object }) {
  const detail = overrides?.issueDetail || mockIssueDetail;
  const patchRes = overrides?.patchResponse || { status: "ok", key: "PROJ-1" };
  const transitionRes = overrides?.transitionResponse || { status: "ok", key: "PROJ-1" };

  global.fetch = vi.fn((url: string | URL | Request, init?: RequestInit) => {
    const urlStr = typeof url === "string" ? url : url.toString();
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

beforeEach(() => {
  vi.restoreAllMocks();
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
      expect(headers).toHaveLength(7);
      for (const header of headers) {
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
      render(<App />, { wrapper: createWrapper() });

      await screen.findByText("PROJ-1");
      const statusSelect = screen.getByLabelText("Filter by status");
      const options = within(statusSelect).getAllByRole("option");
      const optionTexts = options.map((o) => o.textContent);
      expect(optionTexts).toContain("All Statuses");
      expect(optionTexts).toContain("In Progress");
      expect(optionTexts).toContain("To Do");
      expect(optionTexts).toContain("Done");
    });
  });

  describe("Scenario: Type filter dropdown shows unique types from data", () => {
    it("Given issues of type Story, Bug, Task, then the type dropdown should list all three", async () => {
      render(<App />, { wrapper: createWrapper() });

      await screen.findByText("PROJ-1");
      const typeSelect = screen.getByLabelText("Filter by type");
      const options = within(typeSelect).getAllByRole("option");
      const optionTexts = options.map((o) => o.textContent);
      expect(optionTexts).toContain("All Types");
      expect(optionTexts).toContain("Story");
      expect(optionTexts).toContain("Bug");
      expect(optionTexts).toContain("Task");
    });
  });

  describe("Scenario: Assignee filter dropdown shows unique assignees from data", () => {
    it("Given issues assigned to 'Alice Martin' and 'Bob Chen', then the assignee dropdown should list both", async () => {
      render(<App />, { wrapper: createWrapper() });

      await screen.findByText("PROJ-1");
      const assigneeSelect = screen.getByLabelText("Filter by assignee");
      const options = within(assigneeSelect).getAllByRole("option");
      const optionTexts = options.map((o) => o.textContent);
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
      const statusSelect = screen.getByLabelText("Filter by status");
      await user.selectOptions(statusSelect, "Done");

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
      const typeSelect = screen.getByLabelText("Filter by type");
      await user.selectOptions(typeSelect, "Bug");

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
      const statusSelect = screen.getByLabelText("Filter by status");
      await user.selectOptions(statusSelect, "Done");

      const clearBtn = screen.getByText("Clear filters");
      await user.click(clearBtn);

      const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const issuesCalls = calls.filter((c: unknown[]) => (c[0] as string).includes("/api/issues"));
      const lastCall = issuesCalls[issuesCalls.length - 1];
      const url = lastCall[0] as string;
      expect(url).not.toContain("status=");
      expect(url).not.toContain("type=");
      expect(url).not.toContain("assignee=");
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

  describe("Scenario: No Edit button when description is plain text only", () => {
    it("Given the issue has no ADF description, then no Edit button should appear next to Description label", async () => {
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
      const editButtons = within(panel).queryAllByRole("button").filter(
        (btn) => btn.textContent?.includes("Edit") && btn.getAttribute("title") === "Edit description"
      );
      expect(editButtons).toHaveLength(0);
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

      const select = within(panel).getByLabelText("priority");
      await user.selectOptions(select, "Medium");

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

      const select = within(panel).getByLabelText("assignee");
      expect(select.tagName).toBe("SELECT");
      const options = within(select).getAllByRole("option");
      const optionTexts = options.map((o) => o.textContent);
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
      const select = within(panel).getByLabelText("assignee");
      await user.selectOptions(select, "def456");

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
      const select = within(panel).getByLabelText("assignee");
      const options = within(select).getAllByRole("option");
      const optionTexts = options.map((o) => o.textContent);
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

      const select = within(panel).getByLabelText("priority");
      const options = within(select).getAllByRole("option");
      const optionTexts = options.map((o) => o.textContent);
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

      const boardBtn = screen.getByRole("button", { name: /board/i });
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

      await user.click(screen.getByRole("button", { name: /board/i }));

      const todoColumn = await screen.findByTestId("board-column-new");
      expect(within(todoColumn).getByText("PROJ-2")).toBeInTheDocument();
    });

    it("Given PROJ-1 has category 'indeterminate', then it should appear in the In Progress column", async () => {
      render(<App />, { wrapper: createWrapper() });
      const user = userEvent.setup();

      await user.click(screen.getByRole("button", { name: /board/i }));

      const inProgressColumn = await screen.findByTestId("board-column-indeterminate");
      expect(within(inProgressColumn).getByText("PROJ-1")).toBeInTheDocument();
    });

    it("Given PROJ-3 has category 'done', then it should appear in the Done column", async () => {
      render(<App />, { wrapper: createWrapper() });
      const user = userEvent.setup();

      await user.click(screen.getByRole("button", { name: /board/i }));

      const doneColumn = await screen.findByTestId("board-column-done");
      expect(within(doneColumn).getByText("PROJ-3")).toBeInTheDocument();
    });
  });

  describe("Scenario: Each column shows the issue count", () => {
    it("Given 1 issue per category, then each column header should show count 1", async () => {
      render(<App />, { wrapper: createWrapper() });
      const user = userEvent.setup();

      await user.click(screen.getByRole("button", { name: /board/i }));

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

      await user.click(screen.getByRole("button", { name: /board/i }));

      const card = await screen.findByRole("article", { name: /Issue PROJ-1/ });
      expect(within(card).getByText("PROJ-1")).toBeInTheDocument();
      expect(within(card).getByText("Implement login page")).toBeInTheDocument();
    });
  });

  describe("Scenario: Card shows priority icon", () => {
    it("Given PROJ-1 has High priority, then the card should show the priority indicator", async () => {
      render(<App />, { wrapper: createWrapper() });
      const user = userEvent.setup();

      await user.click(screen.getByRole("button", { name: /board/i }));

      const card = await screen.findByRole("article", { name: /Issue PROJ-1/ });
      expect(within(card).getByTitle("High")).toBeInTheDocument();
    });
  });

  describe("Scenario: Card shows assignee initials when no avatar URL", () => {
    it("Given PROJ-1 is assigned to Alice Martin with empty avatarUrl, then the card should show initials 'AM'", async () => {
      render(<App />, { wrapper: createWrapper() });
      const user = userEvent.setup();

      await user.click(screen.getByRole("button", { name: /board/i }));

      const card = await screen.findByRole("article", { name: /Issue PROJ-1/ });
      expect(within(card).getByTitle("Alice Martin")).toBeInTheDocument();
      expect(within(card).getByText("AM")).toBeInTheDocument();
    });
  });

  describe("Scenario: Card for unassigned issue does not show avatar", () => {
    it("Given PROJ-2 has no assignee, then no avatar or initials should appear on the card", async () => {
      render(<App />, { wrapper: createWrapper() });
      const user = userEvent.setup();

      await user.click(screen.getByRole("button", { name: /board/i }));

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

      await user.click(screen.getByRole("button", { name: /board/i }));

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

      await user.click(screen.getByRole("button", { name: /board/i }));

      const swimlaneSelect = await screen.findByLabelText("Swimlane grouping");
      expect(swimlaneSelect).toHaveValue("none");
    });
  });

  describe("Scenario: Selecting Assignee swimlane groups cards by assignee", () => {
    it("Given the board view is active, when selecting Assignee swimlane, then swimlane headers should appear", async () => {
      render(<App />, { wrapper: createWrapper() });
      const user = userEvent.setup();

      await user.click(screen.getByRole("button", { name: /board/i }));
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

      await user.click(screen.getByRole("button", { name: /board/i }));
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

      await user.click(screen.getByRole("button", { name: /board/i }));
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

      await user.click(screen.getByRole("button", { name: /board/i }));
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

      expect(screen.getByRole("button", { name: /board/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /list/i })).toBeInTheDocument();
    });

    it("Given the user clicks Board, then the board view should be shown and List view hidden", async () => {
      render(<App />, { wrapper: createWrapper() });
      const user = userEvent.setup();

      await user.click(screen.getByRole("button", { name: /board/i }));

      expect(await screen.findByRole("region", { name: /Kanban board/ })).toBeInTheDocument();
      // List table should not be present
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });
  });

  describe("Scenario: Board cards show issue type", () => {
    it("Given PROJ-1 is a Story, then the card should display 'Story'", async () => {
      render(<App />, { wrapper: createWrapper() });
      const user = userEvent.setup();

      await user.click(screen.getByRole("button", { name: /board/i }));

      const card = await screen.findByRole("article", { name: /Issue PROJ-1/ });
      expect(within(card).getByText("Story")).toBeInTheDocument();
    });
  });
});
