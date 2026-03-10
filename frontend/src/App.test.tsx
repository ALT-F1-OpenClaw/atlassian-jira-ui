import { render, screen, within } from "@testing-library/react";
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

beforeEach(() => {
  vi.restoreAllMocks();
  global.fetch = vi.fn((url: string | URL | Request) => {
    const urlStr = typeof url === "string" ? url : url.toString();
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
    return Promise.resolve({
      ok: false,
      status: 404,
      json: () => Promise.resolve({}),
    } as Response);
  });
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
          await screen.findByRole("columnheader", { name: column })
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
      expect(screen.getByText("Story")).toBeInTheDocument();
      expect(screen.getByText("Bug")).toBeInTheDocument();
      expect(screen.getByText("Task")).toBeInTheDocument();
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

      expect(await screen.findByText("In Progress")).toBeInTheDocument();
      expect(screen.getByText("To Do")).toBeInTheDocument();
      expect(screen.getByText("Done")).toBeInTheDocument();
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

      expect(await screen.findByText("Alice Martin")).toBeInTheDocument();
      expect(screen.getByText("Bob Chen")).toBeInTheDocument();
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
    it("Given 3 issues out of 3 total, then '3 of 3 issues' should be shown", async () => {
      render(<App />, { wrapper: createWrapper() });

      expect(await screen.findByText("3 of 3 issues")).toBeInTheDocument();
    });
  });
});
