import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

const API = import.meta.env.VITE_API_URL || "";
const APP_VERSION = __APP_VERSION__;

type View = "board" | "list" | "detail";

interface Issue {
  id: string;
  key: string;
  summary: string;
  status: { name: string; category: string };
  priority: { name: string; iconUrl: string };
  assignee: { accountId: string; displayName: string; avatarUrl: string } | null;
  type: { name: string; iconUrl: string };
  updated: string;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    "To Do": "bg-zinc-700 text-zinc-200",
    "In Progress": "bg-blue-600 text-white",
    "In Review": "bg-purple-600 text-white",
    Done: "bg-green-600 text-white",
  };
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] || "bg-zinc-700 text-zinc-300"}`}
    >
      {status}
    </span>
  );
}

function PriorityIcon({ priority }: { priority: string }) {
  const icons: Record<string, string> = {
    Highest: "🔴",
    High: "🟠",
    Medium: "🟡",
    Low: "🔵",
    Lowest: "⚪",
  };
  return <span title={priority}>{icons[priority] || "⚪"}</span>;
}

type SortField = "key" | "type" | "summary" | "status" | "priority" | "assignee" | "updated";
type SortOrder = "ASC" | "DESC";

const COLUMNS: { label: string; field: SortField }[] = [
  { label: "Key", field: "key" },
  { label: "Type", field: "type" },
  { label: "Summary", field: "summary" },
  { label: "Status", field: "status" },
  { label: "Priority", field: "priority" },
  { label: "Assignee", field: "assignee" },
  { label: "Updated", field: "updated" },
];

function SortIndicator({ field, sortBy, sortOrder }: { field: SortField; sortBy: SortField; sortOrder: SortOrder }) {
  if (field !== sortBy) return <span className="ml-1 text-zinc-600">↕</span>;
  return <span className="ml-1">{sortOrder === "ASC" ? "↑" : "↓"}</span>;
}

interface Filters {
  status: string;
  type: string;
  assignee: string;
}

const FILTER_SELECT_CLASS =
  "w-full lg:w-auto rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-sm text-zinc-200 focus:border-blue-500 focus:outline-none";

function FilterBar({
  filters,
  onChange,
  issues,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  issues: Issue[];
}) {
  const statuses = [...new Set(issues.map((i) => i.status?.name).filter(Boolean))].sort();
  const types = [...new Set(issues.map((i) => i.type?.name).filter(Boolean))].sort();
  const assignees = [...new Set(issues.map((i) => i.assignee?.displayName).filter(Boolean))].sort() as string[];

  const hasFilters = filters.status || filters.type || filters.assignee;

  return (
    <>
      <select
        aria-label="Filter by type"
        value={filters.type}
        onChange={(e) => onChange({ ...filters, type: e.target.value })}
        className={FILTER_SELECT_CLASS}
      >
        <option value="">All Types</option>
        {types.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
      <select
        aria-label="Filter by status"
        value={filters.status}
        onChange={(e) => onChange({ ...filters, status: e.target.value })}
        className={FILTER_SELECT_CLASS}
      >
        <option value="">All Statuses</option>
        {statuses.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <select
        aria-label="Filter by assignee"
        value={filters.assignee}
        onChange={(e) => onChange({ ...filters, assignee: e.target.value })}
        className={FILTER_SELECT_CLASS}
      >
        <option value="">All Assignees</option>
        {assignees.map((a) => (
          <option key={a} value={a}>{a}</option>
        ))}
      </select>
      {hasFilters && (
        <button
          onClick={() => onChange({ status: "", type: "", assignee: "" })}
          className="rounded-md px-2 py-1 text-xs text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
        >
          Clear filters
        </button>
      )}
    </>
  );
}

const PAGE_SIZE = 50;

function ListView({ project, filters, onIssuesLoaded }: { project: string; filters: Filters; onIssuesLoaded?: (issues: Issue[]) => void }) {
  const [sortBy, setSortBy] = useState<SortField>("updated");
  const [sortOrder, setSortOrder] = useState<SortOrder>("DESC");
  const [page, setPage] = useState(0);

  const handleSort = (field: SortField) => {
    if (field === sortBy) {
      setSortOrder((prev) => (prev === "ASC" ? "DESC" : "ASC"));
    } else {
      setSortBy(field);
      setSortOrder("ASC");
    }
    setPage(0);
  };

  const startAt = page * PAGE_SIZE;

  const { data, isLoading, error } = useQuery({
    queryKey: ["issues", project, sortBy, sortOrder, filters.status, filters.type, filters.assignee, page],
    queryFn: async () => {
      const params = new URLSearchParams({ max_results: String(PAGE_SIZE), start_at: String(startAt), sort_by: sortBy, sort_order: sortOrder });
      if (project) params.set("project", project);
      if (filters.status) params.set("status", filters.status);
      if (filters.type) params.set("type", filters.type);
      if (filters.assignee) params.set("assignee", filters.assignee);
      const res = await fetch(`${API}/api/issues?${params}`);
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json() as Promise<{ issues: Issue[]; total: number }>;
    },
  });

  useEffect(() => {
    setPage(0);
  }, [project, filters.status, filters.type, filters.assignee]);

  useEffect(() => {
    if (data?.issues) onIssuesLoaded?.(data.issues);
  }, [data?.issues, onIssuesLoaded]);

  if (isLoading)
    return <div className="p-8 text-zinc-500">Loading issues...</div>;
  if (error)
    return (
      <div className="p-8 text-red-400">
        Error: {(error as Error).message}
      </div>
    );

  return (
    <div className="overflow-x-auto">
      <table className="block sm:table w-full text-left text-sm">
        <thead className="hidden sm:table-header-group border-b border-zinc-800 text-zinc-400">
          <tr>
            {COLUMNS.map((col) => (
              <th
                key={col.field}
                className="cursor-pointer select-none px-4 py-3 font-medium transition-colors hover:text-zinc-200"
                onClick={() => handleSort(col.field)}
              >
                {col.label}
                <SortIndicator field={col.field} sortBy={sortBy} sortOrder={sortOrder} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="block sm:table-row-group">
          {data?.issues.map((issue) => (
            <tr
              key={issue.id}
              className="flex flex-wrap sm:table-row items-center gap-x-3 gap-y-0.5 sm:gap-0 border-b border-zinc-800 sm:border-zinc-900 px-4 sm:px-0 py-3 sm:py-0 transition-colors hover:bg-zinc-900/50"
            >
              <td className="w-full sm:w-auto sm:table-cell sm:px-4 sm:py-3 font-mono text-blue-400 text-base sm:text-sm order-1 sm:order-none">
                {issue.key}
              </td>
              <td className="sm:table-cell sm:px-4 sm:py-3 text-zinc-400 text-xs sm:text-sm order-3 sm:order-none">{issue.type?.name}</td>
              <td className="w-full sm:w-auto sm:table-cell sm:px-4 sm:py-3 sm:max-w-md sm:truncate order-2 sm:order-none mb-1 sm:mb-0">{issue.summary}</td>
              <td className="sm:table-cell sm:px-4 sm:py-3 order-3 sm:order-none">
                <StatusBadge status={issue.status?.name} />
              </td>
              <td className="sm:table-cell sm:px-4 sm:py-3 order-3 sm:order-none">
                <PriorityIcon priority={issue.priority?.name} />
              </td>
              <td className="sm:table-cell sm:px-4 sm:py-3 text-zinc-400 text-xs sm:text-sm order-3 sm:order-none">
                {issue.assignee?.displayName || "—"}
              </td>
              <td className="sm:table-cell sm:px-4 sm:py-3 text-zinc-500 text-xs sm:text-sm order-3 sm:order-none ml-auto sm:ml-0">
                {issue.updated?.substring(0, 10) || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 py-3 text-sm text-zinc-500">
        <span>
          {startAt + 1}–{Math.min(startAt + (data?.issues.length || 0), data?.total || 0)} of {data?.total} issues
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded-md border border-zinc-700 px-3 py-1 text-sm transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={startAt + PAGE_SIZE >= (data?.total || 0)}
            className="rounded-md border border-zinc-700 px-3 py-1 text-sm transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<View>("list");
  const [project, setProject] = useState("");
  const [filters, setFilters] = useState<Filters>({ status: "", type: "", assignee: "" });
  const [issuesForFilters, setIssuesForFilters] = useState<Issue[]>([]);

  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await fetch(`${API}/api/projects`);
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json() as Promise<
        { key: string; name: string; id: string }[]
      >;
    },
  });

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">
            ⚡ <span className="text-zinc-300">Jira UI</span>
            <span className="ml-2 text-xs font-normal text-zinc-600">v{APP_VERSION}</span>
          </h1>
          <nav className="flex gap-1">
            {(["board", "list"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                  view === v
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {v}
              </button>
            ))}
          </nav>
        </div>
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 lg:flex gap-2 lg:items-center">
          <select
            value={project}
            onChange={(e) => setProject(e.target.value)}
            className="col-span-2 sm:col-span-1 w-full lg:w-auto rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 focus:border-blue-500 focus:outline-none"
          >
            <option value="">All Projects</option>
            {projects?.map((p) => (
              <option key={p.key} value={p.key}>
                {p.key} — {p.name}
              </option>
            ))}
          </select>
          <FilterBar filters={filters} onChange={setFilters} issues={issuesForFilters} />
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {view === "list" && <ListView project={project} filters={filters} onIssuesLoaded={setIssuesForFilters} />}
        {view === "board" && (
          <div className="p-8 text-zinc-500">
            Board view — coming in Phase 1
          </div>
        )}
      </main>
    </div>
  );
}
