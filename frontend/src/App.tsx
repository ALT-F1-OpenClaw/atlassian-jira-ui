import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

const API = import.meta.env.VITE_API_URL || "";

type View = "board" | "list" | "detail";

interface Issue {
  id: string;
  key: string;
  summary: string;
  status: string;
  priority: string;
  assignee: string;
  type: string;
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

function ListView({ project }: { project: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["issues", project],
    queryFn: async () => {
      const params = new URLSearchParams({ max_results: "50" });
      if (project) params.set("project", project);
      const res = await fetch(`${API}/api/issues?${params}`);
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json() as Promise<{ issues: Issue[]; total: number }>;
    },
  });

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
      <table className="w-full text-left text-sm">
        <thead className="border-b border-zinc-800 text-zinc-400">
          <tr>
            <th className="px-4 py-3 font-medium">Key</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Summary</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Priority</th>
            <th className="px-4 py-3 font-medium">Assignee</th>
            <th className="px-4 py-3 font-medium">Updated</th>
          </tr>
        </thead>
        <tbody>
          {data?.issues.map((issue) => (
            <tr
              key={issue.id}
              className="border-b border-zinc-900 transition-colors hover:bg-zinc-900/50"
            >
              <td className="px-4 py-3 font-mono text-blue-400">
                {issue.key}
              </td>
              <td className="px-4 py-3 text-zinc-400">{issue.type}</td>
              <td className="max-w-md truncate px-4 py-3">{issue.summary}</td>
              <td className="px-4 py-3">
                <StatusBadge status={issue.status} />
              </td>
              <td className="px-4 py-3">
                <PriorityIcon priority={issue.priority} />
              </td>
              <td className="px-4 py-3 text-zinc-400">
                {issue.assignee || "—"}
              </td>
              <td className="px-4 py-3 text-zinc-500">
                {issue.updated?.substring(0, 10) || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-4 py-3 text-sm text-zinc-500">
        {data?.issues.length} of {data?.total} issues
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<View>("list");
  const [project, setProject] = useState("");

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
      <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-3">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold">
            ⚡ <span className="text-zinc-300">Jira UI</span>
          </h1>
          <select
            value={project}
            onChange={(e) => setProject(e.target.value)}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 focus:border-blue-500 focus:outline-none"
          >
            <option value="">All Projects</option>
            {projects?.map((p) => (
              <option key={p.key} value={p.key}>
                {p.key} — {p.name}
              </option>
            ))}
          </select>
        </div>
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
      </header>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {view === "list" && <ListView project={project} />}
        {view === "board" && (
          <div className="p-8 text-zinc-500">
            Board view — coming in Phase 1
          </div>
        )}
      </main>
    </div>
  );
}
