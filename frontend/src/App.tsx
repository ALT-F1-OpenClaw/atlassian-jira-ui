import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from "recharts";
import Placeholder from "@tiptap/extension-placeholder";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  closestCenter,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";

const API = import.meta.env.VITE_API_URL || "";
const APP_VERSION = __APP_VERSION__;

type View = "board" | "list" | "detail" | "sprint";

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

interface TimeTracking {
  originalEstimate: string;
  remainingEstimate: string;
  timeSpent: string;
  originalEstimateSeconds: number;
  remainingEstimateSeconds: number;
  timeSpentSeconds: number;
}

interface WorklogEntry {
  id: string;
  timeSpent: string;
  timeSpentSeconds: number;
  comment: string;
  created: string;
  updated: string;
  author: { accountId: string; displayName: string; avatarUrl: string };
}

interface TimerState {
  issueKey: string;
  startedAt: number;
  elapsed: number; // accumulated ms before current run
  running: boolean;
}

interface IssueDetail extends Issue {
  description: string;
  descriptionAdf: AdfNode | null;
  reporter: { accountId: string; displayName: string; avatarUrl: string } | null;
  project: { key: string; name: string };
  labels: string[];
  created: string;
  dueDate: string | null;
  transitions: { id: string; name: string }[];
  timeTracking?: TimeTracking;
}

interface JiraPriority {
  id: string;
  name: string;
  iconUrl: string;
}

interface ProjectMember {
  accountId: string;
  displayName: string;
  avatarUrl: string;
  active: boolean;
}

interface AdfNode {
  type: string;
  version?: number;
  content?: AdfNode[];
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
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

interface SavedFilter {
  id: string;
  name: string;
  project: string;
  filters: Filters;
}

const SAVED_FILTERS_KEY = "jira-ui-saved-filters";

function loadSavedFilters(): SavedFilter[] {
  try {
    const stored = localStorage.getItem(SAVED_FILTERS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function persistSavedFilters(filters: SavedFilter[]) {
  localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(filters));
}

// ─── Offline Mode (12.1–12.5) ───────────────────────────────────────

interface OfflineMutation {
  id: string;
  url: string;
  method: string;
  body: string;
  timestamp: number;
  description: string; // human-readable summary
}

const OFFLINE_DB_NAME = "jira-ui-offline";
const OFFLINE_STORE = "mutations";
const OFFLINE_DB_VERSION = 1;

function hasIndexedDB(): boolean {
  return typeof indexedDB !== "undefined";
}

function openOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!hasIndexedDB()) return reject(new Error("IndexedDB not available"));
    const req = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(OFFLINE_STORE)) {
        db.createObjectStore(OFFLINE_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function addOfflineMutation(mutation: OfflineMutation): Promise<void> {
  if (!hasIndexedDB()) return;
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE, "readwrite");
    tx.objectStore(OFFLINE_STORE).add(mutation);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

async function getAllOfflineMutations(): Promise<OfflineMutation[]> {
  if (!hasIndexedDB()) return [];
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE, "readonly");
    const req = tx.objectStore(OFFLINE_STORE).getAll();
    req.onsuccess = () => { db.close(); resolve(req.result); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

async function removeOfflineMutation(id: string): Promise<void> {
  if (!hasIndexedDB()) return;
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE, "readwrite");
    tx.objectStore(OFFLINE_STORE).delete(id);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

async function clearOfflineMutations(): Promise<void> {
  if (!hasIndexedDB()) return;
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE, "readwrite");
    tx.objectStore(OFFLINE_STORE).clear();
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return isOnline;
}

interface SyncResult {
  total: number;
  succeeded: number;
  failed: number;
  errors: string[];
}

function useOfflineQueue() {
  const [queueCount, setQueueCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const isOnline = useOnlineStatus();
  const queryClient = useQueryClient();

  // Refresh queue count
  const refreshCount = useCallback(async () => {
    try {
      const mutations = await getAllOfflineMutations();
      setQueueCount(mutations.length);
    } catch {
      setQueueCount(0);
    }
  }, []);

  useEffect(() => { refreshCount(); }, [refreshCount]);

  // Queue a mutation for later sync
  const queueMutation = useCallback(async (
    url: string,
    method: string,
    body: unknown,
    description: string
  ) => {
    const mutation: OfflineMutation = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      url,
      method,
      body: JSON.stringify(body),
      timestamp: Date.now(),
      description,
    };
    await addOfflineMutation(mutation);
    await refreshCount();
  }, [refreshCount]);

  // Sync all queued mutations
  const syncQueue = useCallback(async (): Promise<SyncResult> => {
    setSyncing(true);
    const mutations = await getAllOfflineMutations();
    const result: SyncResult = { total: mutations.length, succeeded: 0, failed: 0, errors: [] };

    // Process in order (FIFO)
    for (const m of mutations) {
      try {
        const res = await fetch(m.url, {
          method: m.method,
          headers: { "Content-Type": "application/json" },
          body: m.body,
        });
        if (!res.ok) {
          throw new Error(`${m.description}: HTTP ${res.status}`);
        }
        await removeOfflineMutation(m.id);
        result.succeeded++;
      } catch (err) {
        result.failed++;
        result.errors.push(err instanceof Error ? err.message : `${m.description}: Unknown error`);
      }
    }

    await refreshCount();
    setSyncing(false);
    setLastSyncResult(result);

    // Invalidate queries to refresh data
    if (result.succeeded > 0) {
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      queryClient.invalidateQueries({ queryKey: ["issue"] });
    }

    return result;
  }, [refreshCount, queryClient]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && queueCount > 0 && !syncing) {
      syncQueue();
    }
  }, [isOnline, queueCount, syncing, syncQueue]);

  const dismissSyncResult = useCallback(() => setLastSyncResult(null), []);

  return { isOnline, queueCount, syncing, syncQueue, queueMutation, lastSyncResult, dismissSyncResult, clearQueue: clearOfflineMutations };
}

function OfflineIndicator({
  isOnline,
  queueCount,
  syncing,
  lastSyncResult,
  onSync,
  onDismiss,
}: {
  isOnline: boolean;
  queueCount: number;
  syncing: boolean;
  lastSyncResult: SyncResult | null;
  onSync: () => void;
  onDismiss: () => void;
}) {
  const [dismissed, setDismissed] = useState(false);

  // Reset dismissed state when going offline
  useEffect(() => {
    if (!isOnline) setDismissed(false);
  }, [isOnline]);

  // Sync result banner
  if (lastSyncResult && lastSyncResult.total > 0) {
    const allOk = lastSyncResult.failed === 0;
    return (
      <div
        className={`flex items-center justify-between gap-2 px-4 py-2 text-sm ${
          allOk ? "bg-green-900/80 text-green-200" : "bg-yellow-900/80 text-yellow-200"
        }`}
        role="status"
        aria-label="Sync result"
      >
        <span>
          {allOk
            ? `Synced ${lastSyncResult.succeeded} offline change${lastSyncResult.succeeded !== 1 ? "s" : ""} successfully`
            : `Synced ${lastSyncResult.succeeded}/${lastSyncResult.total} — ${lastSyncResult.failed} failed: ${lastSyncResult.errors[0]}`}
        </span>
        <button
          onClick={onDismiss}
          className="rounded px-2 py-0.5 text-xs hover:bg-white/10 cursor-pointer"
          aria-label="Dismiss sync result"
        >
          ✕
        </button>
      </div>
    );
  }

  // Offline banner
  if (!isOnline && !dismissed) {
    return (
      <div
        className="flex items-center justify-between gap-2 bg-amber-900/80 px-4 py-2 text-sm text-amber-200"
        role="alert"
        aria-label="Offline mode"
      >
        <span className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-400 animate-pulse" aria-hidden="true" />
          You are offline — changes will be queued and synced when reconnected
          {queueCount > 0 && (
            <span className="ml-1 rounded-full bg-amber-800 px-2 py-0.5 text-xs font-medium">
              {queueCount} queued
            </span>
          )}
        </span>
        <button
          onClick={() => setDismissed(true)}
          className="rounded px-2 py-0.5 text-xs hover:bg-white/10 cursor-pointer"
          aria-label="Dismiss offline banner"
        >
          ✕
        </button>
      </div>
    );
  }

  // Online with queued items (shouldn't normally happen, but show sync button)
  if (isOnline && queueCount > 0) {
    return (
      <div
        className="flex items-center justify-between gap-2 bg-blue-900/80 px-4 py-2 text-sm text-blue-200"
        role="status"
      >
        <span>
          {syncing ? "Syncing offline changes..." : `${queueCount} offline change${queueCount !== 1 ? "s" : ""} pending`}
        </span>
        {!syncing && (
          <button
            onClick={onSync}
            className="rounded bg-blue-700 px-2 py-0.5 text-xs font-medium hover:bg-blue-600 cursor-pointer"
            aria-label="Sync offline changes"
          >
            Sync now
          </button>
        )}
      </div>
    );
  }

  // Online badge in header (small dot)
  return null;
}

// Offline-aware fetch wrapper: queues mutations when offline
async function offlineFetch(
  url: string,
  init: RequestInit,
  queueFn: (url: string, method: string, body: unknown, desc: string) => Promise<void>,
  isOnline: boolean,
  description: string
): Promise<Response> {
  if (!isOnline) {
    await queueFn(url, init.method || "POST", JSON.parse(init.body as string), description);
    // Return a fake success response so mutations don't error
    return new Response(JSON.stringify({ queued: true, offline: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  return fetch(url, init);
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

/* ── Saved Filters ── */

function SavedFiltersDropdown({
  savedFilters,
  onApply,
  onSave,
  onRename,
  onDelete,
  hasActiveFilters,
}: {
  savedFilters: SavedFilter[];
  onApply: (sf: SavedFilter) => void;
  onSave: () => void;
  onRename: (id: string, newName: string) => void;
  onDelete: (id: string) => void;
  hasActiveFilters: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setEditingId(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const startEdit = (sf: SavedFilter) => {
    setEditingId(sf.id);
    setEditName(sf.name);
  };

  const submitEdit = () => {
    if (editingId && editName.trim()) {
      onRename(editingId, editName.trim());
      setEditingId(null);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex gap-1">
        <button
          onClick={() => setOpen(!open)}
          className="rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200 cursor-pointer"
          aria-label="Saved filters"
          aria-expanded={open}
        >
          <span className="hidden sm:inline">Saved Filters</span>
          <span className="sm:hidden">★</span>
          {savedFilters.length > 0 && (
            <span className="ml-1 rounded-full bg-zinc-700 px-1.5 text-[10px]">{savedFilters.length}</span>
          )}
        </button>
        {hasActiveFilters && (
          <button
            onClick={onSave}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-400 transition-colors hover:border-blue-600 hover:text-blue-400 cursor-pointer"
            aria-label="Save current filter"
            title="Save current filter combination"
          >
            <span className="hidden sm:inline">Save Filter</span>
            <span className="sm:hidden">+★</span>
          </button>
        )}
      </div>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-md border border-zinc-700 bg-zinc-900 shadow-lg" role="listbox" aria-label="Saved filters list">
          {savedFilters.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-zinc-500">
              No saved filters yet.{" "}
              {hasActiveFilters ? "Use \"Save Filter\" to save current filters." : "Apply some filters first."}
            </div>
          ) : (
            <ul className="max-h-60 overflow-y-auto py-1">
              {savedFilters.map((sf) => (
                <li key={sf.id} className="group flex items-center gap-1 px-2 py-1.5 hover:bg-zinc-800">
                  {editingId === sf.id ? (
                    <form
                      className="flex flex-1 gap-1"
                      onSubmit={(e) => {
                        e.preventDefault();
                        submitEdit();
                      }}
                    >
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 rounded border border-zinc-600 bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-200 focus:border-blue-500 focus:outline-none"
                        aria-label="Rename filter"
                        autoFocus
                      />
                      <button type="submit" className="text-xs text-green-400 hover:text-green-300" aria-label="Confirm rename">✓</button>
                      <button type="button" onClick={() => setEditingId(null)} className="text-xs text-zinc-500 hover:text-zinc-300" aria-label="Cancel rename">✕</button>
                    </form>
                  ) : (
                    <>
                      <button
                        className="flex-1 truncate text-left text-xs text-zinc-300 hover:text-white"
                        onClick={() => {
                          onApply(sf);
                          setOpen(false);
                        }}
                        role="option"
                        aria-label={`Apply filter ${sf.name}`}
                      >
                        <span className="font-medium">{sf.name}</span>
                        <span className="ml-1.5 text-zinc-600">
                          {[sf.project, sf.filters.type, sf.filters.status, sf.filters.assignee].filter(Boolean).join(", ")}
                        </span>
                      </button>
                      <button
                        onClick={() => startEdit(sf)}
                        className="invisible text-xs text-zinc-500 hover:text-zinc-300 group-hover:visible"
                        aria-label={`Edit filter ${sf.name}`}
                        title="Rename"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => onDelete(sf.id)}
                        className="invisible text-xs text-zinc-500 hover:text-red-400 group-hover:visible"
                        aria-label={`Delete filter ${sf.name}`}
                        title="Delete"
                      >
                        ✕
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/* ── ADF Renderer ── */

function AdfRenderer({ node }: { node: AdfNode }) {
  if (!node) return null;

  if (node.type === "text") {
    let element: React.ReactNode = node.text || "";
    if (node.marks) {
      for (const mark of node.marks) {
        if (mark.type === "strong") element = <strong>{element}</strong>;
        else if (mark.type === "em") element = <em>{element}</em>;
        else if (mark.type === "code") element = <code className="rounded bg-zinc-800 px-1 py-0.5 text-sm font-mono text-pink-400">{element}</code>;
        else if (mark.type === "link" && mark.attrs?.href) {
          element = <a href={mark.attrs.href as string} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline hover:text-blue-300">{element}</a>;
        }
        else if (mark.type === "strike") element = <s>{element}</s>;
      }
    }
    return <>{element}</>;
  }

  const children = (node.content || []).map((child, i) => <AdfRenderer key={i} node={child} />);

  switch (node.type) {
    case "doc":
      return <div className="adf-content space-y-3">{children}</div>;
    case "paragraph":
      return <p className="text-zinc-300 leading-relaxed">{children}</p>;
    case "heading": {
      const level = (node.attrs?.level as number) || 1;
      const cls = level === 1 ? "text-xl font-bold text-zinc-100" : level === 2 ? "text-lg font-semibold text-zinc-100" : "text-base font-semibold text-zinc-200";
      return <div className={cls} role="heading" aria-level={level}>{children}</div>;
    }
    case "bulletList":
      return <ul className="list-disc pl-5 space-y-1 text-zinc-300">{children}</ul>;
    case "orderedList":
      return <ol className="list-decimal pl-5 space-y-1 text-zinc-300">{children}</ol>;
    case "listItem":
      return <li>{children}</li>;
    case "codeBlock":
      return (
        <pre className="rounded-lg bg-zinc-900 border border-zinc-800 p-3 text-sm font-mono text-zinc-300 overflow-x-auto">
          <code>{children}</code>
        </pre>
      );
    case "blockquote":
      return <blockquote className="border-l-4 border-zinc-700 pl-4 text-zinc-400 italic">{children}</blockquote>;
    case "hardBreak":
      return <br />;
    default:
      return <>{children}</>;
  }
}

/* ── ADF ↔ TipTap Conversion ── */

const ADF_TO_TIPTAP_MARKS: Record<string, string> = {
  strong: "bold",
  em: "italic",
  strike: "strike",
  code: "code",
  link: "link",
};

const TIPTAP_TO_ADF_MARKS: Record<string, string> = {
  bold: "strong",
  italic: "em",
  strike: "strike",
  code: "code",
  link: "link",
};

function adfToTiptap(node: AdfNode): Record<string, unknown> {
  if (node.type === "text") {
    const result: Record<string, unknown> = { type: "text", text: node.text || "" };
    if (node.marks?.length) {
      result.marks = node.marks.map((m) => ({
        type: ADF_TO_TIPTAP_MARKS[m.type] || m.type,
        ...(m.attrs ? { attrs: m.attrs } : {}),
      }));
    }
    return result;
  }

  const result: Record<string, unknown> = { type: node.type };

  if (node.attrs) {
    result.attrs = node.attrs;
  }

  if (node.content?.length) {
    result.content = node.content.map(adfToTiptap);
  }

  return result;
}

function tiptapToAdf(node: Record<string, unknown>): AdfNode {
  if (node.type === "text") {
    const result: AdfNode = { type: "text", text: (node.text as string) || "" };
    if (node.marks && Array.isArray(node.marks) && node.marks.length) {
      result.marks = node.marks.map((m: { type: string; attrs?: Record<string, unknown> }) => {
        const adfType = TIPTAP_TO_ADF_MARKS[m.type] || m.type;
        if (adfType === "link" && m.attrs) {
          return { type: adfType, attrs: { href: m.attrs.href as string } };
        }
        return { type: adfType, ...(m.attrs ? { attrs: m.attrs } : {}) };
      });
    }
    return result;
  }

  const result: AdfNode = { type: node.type as string };

  if (node.type === "doc") {
    result.version = 1;
  }

  if (node.attrs) {
    const attrs = node.attrs as Record<string, unknown>;
    // Only include non-null attrs that ADF expects
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(attrs)) {
      if (v != null) cleaned[k] = v;
    }
    if (Object.keys(cleaned).length) {
      result.attrs = cleaned;
    }
  }

  if (node.content && Array.isArray(node.content) && node.content.length) {
    result.content = node.content.map(tiptapToAdf);
  }

  return result;
}

/* ── Rich Text Editor ── */

const TOOLBAR_BTN =
  "rounded px-1.5 py-1 text-xs transition-colors cursor-pointer";
const TOOLBAR_BTN_ACTIVE = "bg-zinc-700 text-zinc-100";
const TOOLBAR_BTN_INACTIVE = "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200";

function RichTextEditor({
  initialAdf,
  onSave,
  onCancel,
}: {
  initialAdf: AdfNode | null;
  onSave: (adf: AdfNode) => void;
  onCancel: () => void;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-blue-400 underline" },
      }),
      Placeholder.configure({ placeholder: "Write a description..." }),
    ],
    content: initialAdf ? adfToTiptap(initialAdf) : undefined,
    editorProps: {
      attributes: {
        class:
          "prose dark:prose-invert prose-sm max-w-none min-h-[120px] px-3 py-2 focus:outline-none text-zinc-200",
      },
    },
  });

  const handleSave = () => {
    if (!editor) return;
    const json = editor.getJSON();
    const adf = tiptapToAdf(json);
    onSave(adf);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onCancel();
    }
  };

  const addLink = () => {
    if (!editor) return;
    const url = window.prompt("Enter URL:");
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  if (!editor) return null;

  return (
    <div onKeyDown={handleKeyDown} role="textbox" aria-label="Rich text editor">
      {/* Toolbar */}
      <div
        className="flex flex-wrap gap-0.5 border border-zinc-700 border-b-0 rounded-t bg-zinc-900 px-1.5 py-1"
        role="toolbar"
        aria-label="Formatting toolbar"
      >
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`${TOOLBAR_BTN} ${editor.isActive("bold") ? TOOLBAR_BTN_ACTIVE : TOOLBAR_BTN_INACTIVE} font-bold`}
          aria-label="Bold"
          title="Bold"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`${TOOLBAR_BTN} ${editor.isActive("italic") ? TOOLBAR_BTN_ACTIVE : TOOLBAR_BTN_INACTIVE} italic`}
          aria-label="Italic"
          title="Italic"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`${TOOLBAR_BTN} ${editor.isActive("strike") ? TOOLBAR_BTN_ACTIVE : TOOLBAR_BTN_INACTIVE} line-through`}
          aria-label="Strikethrough"
          title="Strikethrough"
        >
          S
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={`${TOOLBAR_BTN} ${editor.isActive("code") ? TOOLBAR_BTN_ACTIVE : TOOLBAR_BTN_INACTIVE} font-mono`}
          aria-label="Code"
          title="Code"
        >
          {"<>"}
        </button>
        <span className="w-px bg-zinc-700 mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`${TOOLBAR_BTN} ${editor.isActive("heading", { level: 1 }) ? TOOLBAR_BTN_ACTIVE : TOOLBAR_BTN_INACTIVE}`}
          aria-label="Heading 1"
          title="Heading 1"
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`${TOOLBAR_BTN} ${editor.isActive("heading", { level: 2 }) ? TOOLBAR_BTN_ACTIVE : TOOLBAR_BTN_INACTIVE}`}
          aria-label="Heading 2"
          title="Heading 2"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`${TOOLBAR_BTN} ${editor.isActive("heading", { level: 3 }) ? TOOLBAR_BTN_ACTIVE : TOOLBAR_BTN_INACTIVE}`}
          aria-label="Heading 3"
          title="Heading 3"
        >
          H3
        </button>
        <span className="w-px bg-zinc-700 mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`${TOOLBAR_BTN} ${editor.isActive("bulletList") ? TOOLBAR_BTN_ACTIVE : TOOLBAR_BTN_INACTIVE}`}
          aria-label="Bullet list"
          title="Bullet list"
        >
          •
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`${TOOLBAR_BTN} ${editor.isActive("orderedList") ? TOOLBAR_BTN_ACTIVE : TOOLBAR_BTN_INACTIVE}`}
          aria-label="Ordered list"
          title="Ordered list"
        >
          1.
        </button>
        <button
          type="button"
          onClick={addLink}
          className={`${TOOLBAR_BTN} ${editor.isActive("link") ? TOOLBAR_BTN_ACTIVE : TOOLBAR_BTN_INACTIVE}`}
          aria-label="Link"
          title="Link"
        >
          🔗
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`${TOOLBAR_BTN} ${editor.isActive("codeBlock") ? TOOLBAR_BTN_ACTIVE : TOOLBAR_BTN_INACTIVE} font-mono`}
          aria-label="Code block"
          title="Code block"
        >
          {"{ }"}
        </button>
      </div>

      {/* Editor */}
      <div className="rounded-b border border-zinc-700 bg-zinc-900 overflow-y-auto max-h-[400px]">
        <EditorContent editor={editor} />
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-2">
        <button
          onClick={handleSave}
          className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-500 transition-colors cursor-pointer"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="rounded bg-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-600 transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ── Inline Edit Components ── */

function InlineEditText({
  value,
  onSave,
  label,
  multiline,
}: {
  value: string;
  onSave: (v: string) => void;
  label: string;
  multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(value);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [editing, value]);

  const save = () => {
    if (draft.trim() && draft !== value) onSave(draft.trim());
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="w-full text-left rounded px-1 -mx-1 hover:bg-zinc-800 transition-colors cursor-pointer"
        aria-label={`Edit ${label}`}
        title={`Click to edit ${label}`}
      >
        {value || <span className="text-zinc-600 italic">None</span>}
      </button>
    );
  }

  if (multiline) {
    return (
      <textarea
        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Escape") cancel();
        }}
        aria-label={label}
        className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-200 focus:border-blue-500 focus:outline-none resize-y min-h-[80px]"
        rows={4}
      />
    );
  }

  return (
    <input
      ref={inputRef as React.RefObject<HTMLInputElement>}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") save();
        if (e.key === "Escape") cancel();
      }}
      aria-label={label}
      className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-200 focus:border-blue-500 focus:outline-none"
    />
  );
}

type SelectOption = string | { value: string; label: string };

function InlineEditSelect({
  value,
  displayValue,
  options,
  onSave,
  label,
  placeholder,
}: {
  value: string;
  displayValue?: string;
  options: SelectOption[];
  onSave: (v: string) => void;
  label: string;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (editing) setTimeout(() => selectRef.current?.focus(), 0);
  }, [editing]);

  const shownValue = displayValue || value;

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="w-full text-left rounded px-1 -mx-1 hover:bg-zinc-800 transition-colors cursor-pointer"
        aria-label={`Edit ${label}`}
        title={`Click to edit ${label}`}
      >
        {shownValue || <span className="text-zinc-600 italic">None</span>}
      </button>
    );
  }

  return (
    <select
      ref={selectRef}
      value={value}
      onChange={(e) => {
        onSave(e.target.value);
        setEditing(false);
      }}
      onBlur={() => setEditing(false)}
      onKeyDown={(e) => {
        if (e.key === "Escape") setEditing(false);
      }}
      aria-label={label}
      className={FILTER_SELECT_CLASS}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => {
        const optValue = typeof o === "string" ? o : o.value;
        const optLabel = typeof o === "string" ? o : o.label;
        return <option key={optValue} value={optValue}>{optLabel}</option>;
      })}
    </select>
  );
}

function InlineEditDate({
  value,
  onSave,
  label,
}: {
  value: string | null;
  onSave: (v: string | null) => void;
  label: string;
}) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) setTimeout(() => inputRef.current?.focus(), 0);
  }, [editing]);

  const formatDisplay = (d: string | null) => {
    if (!d) return "—";
    return d.substring(0, 10);
  };

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="w-full text-left rounded px-1 -mx-1 hover:bg-zinc-800 transition-colors cursor-pointer text-zinc-300"
        aria-label={`Edit ${label}`}
        title={`Click to edit ${label}`}
      >
        {formatDisplay(value)}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <input
        ref={inputRef}
        type="date"
        value={value?.substring(0, 10) || ""}
        onChange={(e) => {
          const newVal = e.target.value || null;
          onSave(newVal);
          setEditing(false);
        }}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setEditing(false);
        }}
        aria-label={label}
        className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-200 focus:border-blue-500 focus:outline-none"
      />
      {value && (
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            onSave(null);
            setEditing(false);
          }}
          className="rounded px-1.5 py-0.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors cursor-pointer"
          aria-label="Clear due date"
          title="Clear date"
        >
          ✕
        </button>
      )}
    </div>
  );
}

function InlineEditLabels({
  labels,
  onSave,
}: {
  labels: string[];
  onSave: (labels: string[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);
  const allLabelsRef = useRef<string[]>([]);
  const fetchedRef = useRef(false);

  const fetchLabels = useCallback(async () => {
    if (fetchedRef.current) return;
    try {
      const res = await fetch(`${API}/api/labels`);
      if (res.ok) {
        allLabelsRef.current = await res.json();
        fetchedRef.current = true;
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (adding) {
      fetchLabels();
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setInput("");
      setSuggestions([]);
      setHighlightIdx(-1);
    }
  }, [adding, fetchLabels]);

  useEffect(() => {
    if (!input.trim()) {
      setSuggestions([]);
      setHighlightIdx(-1);
      return;
    }
    const q = input.toLowerCase();
    const filtered = allLabelsRef.current
      .filter((l) => l.toLowerCase().includes(q) && !labels.includes(l))
      .slice(0, 8);
    setSuggestions(filtered);
    setHighlightIdx(-1);
  }, [input, labels]);

  const addLabel = (label: string) => {
    const trimmed = label.trim();
    if (!trimmed || labels.includes(trimmed)) return;
    onSave([...labels, trimmed]);
    setInput("");
    setSuggestions([]);
    setHighlightIdx(-1);
    inputRef.current?.focus();
  };

  const removeLabel = (label: string) => {
    onSave(labels.filter((l) => l !== label));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setAdding(false);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightIdx >= 0 && highlightIdx < suggestions.length) {
        addLabel(suggestions[highlightIdx]);
      } else if (input.trim()) {
        addLabel(input);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((i) => Math.max(i - 1, 0));
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1 items-center">
        {labels.length > 0 ? labels.map((l) => (
          <span key={l} className="inline-flex items-center gap-0.5 rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
            {l}
            <button
              onClick={() => removeLabel(l)}
              className="ml-0.5 text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer"
              aria-label={`Remove label ${l}`}
              title={`Remove ${l}`}
            >
              ✕
            </button>
          </span>
        )) : !adding && <span className="text-zinc-600">None</span>}
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="rounded-full bg-zinc-800 hover:bg-zinc-700 px-1.5 py-0.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            aria-label="Add label"
            title="Add label"
          >
            +
          </button>
        )}
      </div>
      {adding && (
        <div className="relative mt-1">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={(e) => {
              if (dropdownRef.current?.contains(e.relatedTarget as Node)) return;
              setTimeout(() => setAdding(false), 150);
            }}
            placeholder="Type a label…"
            aria-label="Label input"
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-200 focus:border-blue-500 focus:outline-none"
          />
          {suggestions.length > 0 && (
            <ul
              ref={dropdownRef}
              role="listbox"
              aria-label="Label suggestions"
              className="absolute z-50 mt-0.5 w-full max-h-40 overflow-auto rounded border border-zinc-700 bg-zinc-900 shadow-lg"
            >
              {suggestions.map((s, i) => (
                <li
                  key={s}
                  role="option"
                  aria-selected={i === highlightIdx}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addLabel(s)}
                  className={`cursor-pointer px-2 py-1 text-sm ${i === highlightIdx ? "bg-blue-600 text-white" : "text-zinc-300 hover:bg-zinc-800"}`}
                >
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Time Tracking ── */

const TIMER_STORAGE_KEY = "jira-ui-timers";

function loadTimers(): Record<string, TimerState> {
  try {
    const stored = localStorage.getItem(TIMER_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function persistTimers(timers: Record<string, TimerState>) {
  localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(timers));
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function formatSecondsToJira(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return "1m";
}

function useIssueTimer(issueKey: string) {
  const [timers, setTimers] = useState<Record<string, TimerState>>(loadTimers);
  const timer = timers[issueKey];
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!timer?.running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [timer?.running]);

  const elapsed = timer
    ? timer.running
      ? timer.elapsed + (now - timer.startedAt)
      : timer.elapsed
    : 0;

  const updateTimers = (fn: (prev: Record<string, TimerState>) => Record<string, TimerState>) => {
    setTimers((prev) => {
      const next = fn(prev);
      persistTimers(next);
      return next;
    });
  };

  const start = () => {
    setNow(Date.now());
    updateTimers((prev) => ({
      ...prev,
      [issueKey]: {
        issueKey,
        startedAt: Date.now(),
        elapsed: prev[issueKey]?.elapsed || 0,
        running: true,
      },
    }));
  };

  const pause = () => {
    updateTimers((prev) => {
      const t = prev[issueKey];
      if (!t || !t.running) return prev;
      return {
        ...prev,
        [issueKey]: {
          ...t,
          elapsed: t.elapsed + (Date.now() - t.startedAt),
          running: false,
        },
      };
    });
  };

  const stop = () => {
    updateTimers((prev) => {
      const copy = { ...prev };
      delete copy[issueKey];
      return copy;
    });
  };

  return { elapsed, running: timer?.running || false, hasTimer: !!timer, start, pause, stop };
}

function IssueTimer({ issueKey, onLogWork }: { issueKey: string; onLogWork: (prefill: string) => void }) {
  const { elapsed, running, hasTimer, start, pause, stop } = useIssueTimer(issueKey);

  const handleStop = () => {
    const totalSeconds = Math.floor(elapsed / 1000);
    onLogWork(totalSeconds > 0 ? formatSecondsToJira(totalSeconds) : "");
    stop();
  };

  return (
    <div className="flex items-center gap-2" data-testid="issue-timer">
      <span className="font-mono text-sm text-zinc-300" data-testid="timer-display">
        {hasTimer ? formatElapsed(elapsed) : "0s"}
      </span>
      {!running ? (
        <button
          onClick={start}
          className="rounded bg-green-700 px-2 py-0.5 text-xs text-white hover:bg-green-600 transition-colors cursor-pointer"
          aria-label={hasTimer ? "Resume timer" : "Start timer"}
          data-testid="timer-start"
        >
          {hasTimer ? "▶ Resume" : "▶ Start"}
        </button>
      ) : (
        <button
          onClick={pause}
          className="rounded bg-yellow-700 px-2 py-0.5 text-xs text-white hover:bg-yellow-600 transition-colors cursor-pointer"
          aria-label="Pause timer"
          data-testid="timer-pause"
        >
          ⏸ Pause
        </button>
      )}
      {hasTimer && (
        <button
          onClick={handleStop}
          className="rounded bg-red-700 px-2 py-0.5 text-xs text-white hover:bg-red-600 transition-colors cursor-pointer"
          aria-label="Stop timer and log"
          data-testid="timer-stop"
        >
          ⏹ Stop & Log
        </button>
      )}
    </div>
  );
}

function LogWorkModal({
  issueKey,
  prefill,
  onClose,
  onSuccess,
}: {
  issueKey: string;
  prefill?: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [timeSpent, setTimeSpent] = useState(prefill || "");
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!timeSpent.trim()) {
      setError("Time spent is required (e.g. 1h 30m)");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/issues/${issueKey}/worklog`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeSpent: timeSpent.trim(), comment: comment.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Error ${res.status}`);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log work");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" role="dialog" aria-label="Log work">
      <div className="w-full max-w-md mx-4 rounded-lg border border-zinc-700 bg-zinc-900 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-zinc-100">Log Work — {issueKey}</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200" aria-label="Close log work modal">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Time Spent *</label>
            <input
              type="text"
              value={timeSpent}
              onChange={(e) => setTimeSpent(e.target.value)}
              placeholder="e.g. 1h 30m, 2h, 45m"
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-blue-500 focus:outline-none"
              aria-label="Time spent"
              autoFocus
              data-testid="log-work-time"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Description</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What did you work on?"
              rows={3}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-blue-500 focus:outline-none resize-none"
              aria-label="Work description"
              data-testid="log-work-comment"
            />
          </div>
          {error && <p className="text-xs text-red-400" data-testid="log-work-error">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-500 disabled:opacity-50 transition-colors cursor-pointer"
              data-testid="log-work-submit"
            >
              {submitting ? "Logging..." : "Log Work"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TimeTrackingBar({ timeTracking }: { timeTracking?: TimeTracking }) {
  if (!timeTracking) return null;
  const { originalEstimateSeconds, timeSpentSeconds, timeSpent, originalEstimate, remainingEstimate } = timeTracking;
  if (!originalEstimateSeconds && !timeSpentSeconds) return null;

  const percent = originalEstimateSeconds > 0
    ? Math.min(100, Math.round((timeSpentSeconds / originalEstimateSeconds) * 100))
    : 0;
  const overEstimate = originalEstimateSeconds > 0 && timeSpentSeconds > originalEstimateSeconds;

  return (
    <div data-testid="time-tracking-bar">
      <label className="block text-xs text-zinc-500 mb-1">Time Tracking</label>
      <div className="space-y-1">
        {originalEstimateSeconds > 0 && (
          <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
            <div
              className={`h-full rounded-full transition-all ${overEstimate ? "bg-red-500" : "bg-blue-500"}`}
              style={{ width: `${Math.min(percent, 100)}%` }}
            />
          </div>
        )}
        <div className="flex justify-between text-xs text-zinc-400">
          <span data-testid="time-logged">Logged: {timeSpent || "0m"}</span>
          {originalEstimate && <span data-testid="time-estimated">Estimated: {originalEstimate}</span>}
          {remainingEstimate && <span>Remaining: {remainingEstimate}</span>}
        </div>
        {originalEstimateSeconds > 0 && (
          <span className="text-xs text-zinc-500" data-testid="time-percent">{percent}%</span>
        )}
      </div>
    </div>
  );
}

function WorklogHistory({ issueKey }: { issueKey: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["worklogs", issueKey],
    queryFn: async () => {
      const res = await fetch(`${API}/api/issues/${issueKey}/worklog`);
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json() as Promise<{ worklogs: WorklogEntry[]; total: number }>;
    },
    enabled: !!issueKey,
  });

  if (isLoading) return <p className="text-xs text-zinc-500">Loading work logs...</p>;
  if (!data?.worklogs?.length) return <p className="text-xs text-zinc-500" data-testid="no-worklogs">No work logged yet.</p>;

  return (
    <div data-testid="worklog-history">
      <label className="block text-xs text-zinc-500 mb-2">Work Log ({data.total} {data.total === 1 ? "entry" : "entries"})</label>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {data.worklogs.map((w) => (
          <div key={w.id} className="rounded border border-zinc-800 bg-zinc-900/50 p-2 text-xs" data-testid="worklog-entry">
            <div className="flex items-center justify-between">
              <span className="font-medium text-zinc-200">{w.timeSpent}</span>
              <span className="text-zinc-500">{w.created ? new Date(w.created).toLocaleDateString() : ""}</span>
            </div>
            {w.author?.displayName && (
              <span className="text-zinc-400">{w.author.displayName}</span>
            )}
            {w.comment && <p className="mt-1 text-zinc-400">{w.comment}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Issue Detail Panel ── */

const FALLBACK_PRIORITIES = ["Highest", "High", "Medium", "Low", "Lowest"];

function IssueDetailPanel({
  issueKey,
  onClose,
  projectKey,
  isOnline = true,
  queueMutation,
}: {
  issueKey: string;
  onClose: () => void;
  projectKey?: string;
  isOnline?: boolean;
  queueMutation?: (url: string, method: string, body: unknown, desc: string) => Promise<void>;
}) {
  const queryClient = useQueryClient();

  const { data: issue, isLoading, error } = useQuery({
    queryKey: ["issue", issueKey],
    queryFn: async () => {
      const res = await fetch(`${API}/api/issues/${issueKey}`);
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json() as Promise<IssueDetail>;
    },
    enabled: !!issueKey,
  });

  const resolvedProjectKey = projectKey || issue?.project?.key;

  const { data: priorities } = useQuery({
    queryKey: ["priorities"],
    queryFn: async () => {
      const res = await fetch(`${API}/api/priorities`);
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json() as Promise<JiraPriority[]>;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: members } = useQuery({
    queryKey: ["members", resolvedProjectKey],
    queryFn: async () => {
      const res = await fetch(`${API}/api/projects/${resolvedProjectKey}/members`);
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json() as Promise<ProjectMember[]>;
    },
    enabled: !!resolvedProjectKey,
    staleTime: 5 * 60 * 1000,
  });

  const updateMutation = useMutation({
    mutationFn: async (fields: { summary?: string; description?: string; description_adf?: AdfNode; priority?: string; assignee?: string; duedate?: string | null; labels?: string[] }) => {
      const url = `${API}/api/issues/${issueKey}`;
      const init: RequestInit = { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(fields) };
      const res = queueMutation
        ? await offlineFetch(url, init, queueMutation, isOnline, `Update ${issueKey}`)
        : await fetch(url, init);
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issue", issueKey] });
      queryClient.invalidateQueries({ queryKey: ["issues"] });
    },
  });

  const transitionMutation = useMutation({
    mutationFn: async (transitionId: string) => {
      const url = `${API}/api/issues/${issueKey}/transition`;
      const init: RequestInit = { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transition_id: transitionId }) };
      const res = queueMutation
        ? await offlineFetch(url, init, queueMutation, isOnline, `Transition ${issueKey}`)
        : await fetch(url, init);
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issue", issueKey] });
      queryClient.invalidateQueries({ queryKey: ["issues"] });
    },
  });

  const [editingDescription, setEditingDescription] = useState(false);
  const [logWorkOpen, setLogWorkOpen] = useState(false);
  const [logWorkPrefill, setLogWorkPrefill] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (logWorkOpen) {
          setLogWorkOpen(false);
        } else if (editingDescription) {
          setEditingDescription(false);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, editingDescription, logWorkOpen]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex" role="dialog" aria-label="Issue detail">
        <div className="hidden md:block flex-1 bg-black/50" onClick={onClose} />
        <div className="w-full md:w-[600px] lg:w-[720px] bg-zinc-950 border-l border-zinc-800 p-6 overflow-y-auto">
          <p className="text-zinc-500">Loading issue...</p>
        </div>
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="fixed inset-0 z-50 flex" role="dialog" aria-label="Issue detail">
        <div className="hidden md:block flex-1 bg-black/50" onClick={onClose} />
        <div className="w-full md:w-[600px] lg:w-[720px] bg-zinc-950 border-l border-zinc-800 p-6 overflow-y-auto">
          <p className="text-red-400">Error loading issue.</p>
          <button onClick={onClose} className="mt-4 text-zinc-400 hover:text-zinc-200 text-sm">Close</button>
        </div>
      </div>
    );
  }

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return d.substring(0, 10);
  };

  const formatDateTime = (d: string | null) => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleString();
    } catch {
      return d;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-label="Issue detail">
      <div className="hidden md:block flex-1 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="w-full md:w-[600px] lg:w-[720px] bg-zinc-950 border-l border-zinc-800 overflow-y-auto flex flex-col">
        {/* Panel header */}
        <div className="border-b border-zinc-800 px-4 sm:px-6 py-3 shrink-0 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-500">{issue.type?.name}</span>
              <span className="font-mono text-blue-400 font-semibold">{issue.key}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setLogWorkPrefill(""); setLogWorkOpen(true); }}
                className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-400 hover:border-blue-600 hover:text-blue-400 transition-colors cursor-pointer"
                aria-label="Log work"
                data-testid="log-work-button"
              >
                Log Work
              </button>
              <button
                onClick={onClose}
                className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
                aria-label="Close detail panel"
              >
                ✕
              </button>
            </div>
          </div>
          <IssueTimer issueKey={issueKey} onLogWork={(prefill) => { setLogWorkPrefill(prefill); setLogWorkOpen(true); }} />
        </div>

        {/* Panel body */}
        <div className="flex-1 px-4 sm:px-6 py-4 space-y-6">
          {/* Summary (editable) */}
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-zinc-100">
              <InlineEditText
                value={issue.summary}
                onSave={(v) => updateMutation.mutate({ summary: v })}
                label="summary"
              />
            </h2>
          </div>

          {/* Status + Priority row */}
          <div className="flex flex-wrap gap-4 items-start">
            {/* Status transition */}
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Status</label>
              {issue.transitions?.length > 0 ? (
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) transitionMutation.mutate(e.target.value);
                  }}
                  aria-label="Transition status"
                  className={FILTER_SELECT_CLASS}
                >
                  <option value="" disabled>{issue.status?.name}</option>
                  {issue.transitions.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              ) : (
                <StatusBadge status={issue.status?.name} />
              )}
              {transitionMutation.isPending && <span className="text-xs text-zinc-500 ml-2">Saving...</span>}
            </div>

            {/* Priority (editable) */}
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Priority</label>
              <div className="flex items-center gap-1.5">
                <PriorityIcon priority={issue.priority?.name} />
                <InlineEditSelect
                  value={issue.priority?.name}
                  options={priorities?.map((p) => p.name) || FALLBACK_PRIORITIES}
                  onSave={(v) => updateMutation.mutate({ priority: v })}
                  label="priority"
                />
              </div>
            </div>
          </div>

          {/* Description (ADF with rich text edit, or editable plain text) */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <label className="block text-xs text-zinc-500">Description</label>
              {issue.descriptionAdf && !editingDescription && (
                <button
                  onClick={() => setEditingDescription(true)}
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                  aria-label="Edit description"
                  title="Edit description"
                >
                  ✏️ Edit
                </button>
              )}
            </div>
            {editingDescription ? (
              <RichTextEditor
                initialAdf={issue.descriptionAdf}
                onSave={(adf) => {
                  updateMutation.mutate({ description_adf: adf });
                  setEditingDescription(false);
                }}
                onCancel={() => setEditingDescription(false)}
              />
            ) : issue.descriptionAdf ? (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                <AdfRenderer node={issue.descriptionAdf} />
              </div>
            ) : (
              <InlineEditText
                value={issue.description || ""}
                onSave={(v) => updateMutation.mutate({ description: v })}
                label="description"
                multiline
              />
            )}
          </div>

          {/* Metadata grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {/* Assignee (editable) */}
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Assignee</label>
              <div className="flex items-center gap-2 text-zinc-200">
                {issue.assignee?.avatarUrl && (
                  <img src={issue.assignee.avatarUrl} alt="" className="w-5 h-5 rounded-full" />
                )}
                {members ? (
                  <InlineEditSelect
                    value={issue.assignee?.accountId || ""}
                    displayValue={issue.assignee?.displayName || ""}
                    options={members.map((m) => ({ value: m.accountId, label: m.displayName }))}
                    onSave={(v) => updateMutation.mutate({ assignee: v })}
                    label="assignee"
                    placeholder="Unassigned"
                  />
                ) : (
                  <InlineEditText
                    value={issue.assignee?.displayName || ""}
                    onSave={(v) => updateMutation.mutate({ assignee: v })}
                    label="assignee"
                  />
                )}
              </div>
            </div>

            {/* Reporter */}
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Reporter</label>
              <div className="flex items-center gap-2 text-zinc-300">
                {issue.reporter?.avatarUrl && (
                  <img src={issue.reporter.avatarUrl} alt="" className="w-5 h-5 rounded-full" />
                )}
                <span>{issue.reporter?.displayName || "—"}</span>
              </div>
            </div>

            {/* Labels (editable) */}
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Labels</label>
              <InlineEditLabels
                labels={issue.labels || []}
                onSave={(newLabels) => updateMutation.mutate({ labels: newLabels })}
              />
            </div>

            {/* Due Date (editable) */}
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Due Date</label>
              <InlineEditDate
                value={issue.dueDate}
                onSave={(v) => updateMutation.mutate({ duedate: v })}
                label="due date"
              />
            </div>

            {/* Created */}
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Created</label>
              <span className="text-zinc-400 text-xs">{formatDateTime(issue.created)}</span>
            </div>

            {/* Updated */}
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Updated</label>
              <span className="text-zinc-400 text-xs">{formatDateTime(issue.updated)}</span>
            </div>
          </div>

          {/* Time Tracking */}
          <TimeTrackingBar timeTracking={issue.timeTracking} />

          {/* Work Log History */}
          <WorklogHistory issueKey={issueKey} />

          {/* Mutation feedback */}
          {updateMutation.isPending && <p className="text-xs text-zinc-500">Saving changes...</p>}
          {updateMutation.isError && <p className="text-xs text-red-400">Failed to save changes.</p>}
        </div>
      </div>

      {/* Log Work Modal */}
      {logWorkOpen && (
        <LogWorkModal
          issueKey={issueKey}
          prefill={logWorkPrefill}
          onClose={() => setLogWorkOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["issue", issueKey] });
            queryClient.invalidateQueries({ queryKey: ["worklogs", issueKey] });
          }}
        />
      )}
    </div>
  );
}

/* ── Board View (Kanban) ── */

type StatusCategory = "new" | "indeterminate" | "done";
type SwimlaneSetting = "none" | "assignee" | "priority";

const CATEGORY_LABELS: Record<StatusCategory, string> = {
  new: "To Do",
  indeterminate: "In Progress",
  done: "Done",
};

const CATEGORY_COLORS: Record<StatusCategory, string> = {
  new: "border-zinc-600",
  indeterminate: "border-blue-600",
  done: "border-green-600",
};

const CATEGORY_ORDER: StatusCategory[] = ["new", "indeterminate", "done"];

function DraggableCard({
  issue,
  onSelect,
  isDragOverlay,
  onMoveToCategory,
}: {
  issue: Issue;
  onSelect?: (key: string) => void;
  isDragOverlay?: boolean;
  onMoveToCategory?: (issueKey: string, targetCategory: StatusCategory) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: issue.key,
    data: { issue },
  });

  const initials = issue.assignee?.displayName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "";

  return (
    <div
      ref={isDragOverlay ? undefined : setNodeRef}
      {...(isDragOverlay ? {} : { ...listeners, ...attributes })}
      onClick={(e) => {
        if (!isDragging) {
          e.stopPropagation();
          onSelect?.(issue.key);
        }
      }}
      className={`rounded-lg border border-zinc-800 bg-zinc-900 p-3 cursor-grab active:cursor-grabbing transition-all hover:border-zinc-700 ${
        isDragging && !isDragOverlay ? "opacity-30" : ""
      } ${isDragOverlay ? "shadow-xl shadow-black/50 ring-2 ring-blue-500/50" : ""}`}
      role="article"
      aria-label={`Issue ${issue.key}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className="font-mono text-xs text-blue-400">{issue.key}</span>
          <p className="mt-0.5 text-sm text-zinc-200 line-clamp-2">{issue.summary}</p>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <PriorityIcon priority={issue.priority?.name} />
          <span className="text-xs text-zinc-500">{issue.type?.name}</span>
        </div>
        {issue.assignee ? (
          issue.assignee.avatarUrl ? (
            <img
              src={issue.assignee.avatarUrl}
              alt={issue.assignee.displayName}
              title={issue.assignee.displayName}
              className="h-6 w-6 rounded-full"
            />
          ) : (
            <span
              title={issue.assignee.displayName}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-700 text-[10px] font-medium text-zinc-300"
            >
              {initials}
            </span>
          )
        ) : null}
      </div>
      {/* Quick-action arrows for mobile */}
      {onMoveToCategory && !isDragOverlay && (
        <div className="mt-2 flex items-center justify-between sm:hidden" role="group" aria-label={`Move ${issue.key}`}>
          {(issue.status?.category as StatusCategory) !== "new" ? (
            <button
              onClick={(e) => { e.stopPropagation(); const idx = CATEGORY_ORDER.indexOf(issue.status.category as StatusCategory); if (idx > 0) onMoveToCategory(issue.key, CATEGORY_ORDER[idx - 1]); }}
              className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 transition-colors"
              aria-label={`Move ${issue.key} left`}
            >
              ←
            </button>
          ) : <span />}
          {(issue.status?.category as StatusCategory) !== "done" ? (
            <button
              onClick={(e) => { e.stopPropagation(); const idx = CATEGORY_ORDER.indexOf(issue.status.category as StatusCategory); if (idx < CATEGORY_ORDER.length - 1) onMoveToCategory(issue.key, CATEGORY_ORDER[idx + 1]); }}
              className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 transition-colors"
              aria-label={`Move ${issue.key} right`}
            >
              →
            </button>
          ) : <span />}
        </div>
      )}
    </div>
  );
}

function DroppableColumn({
  category,
  issues,
  swimlane,
  onSelectIssue,
  onMoveToCategory,
}: {
  category: StatusCategory;
  issues: Issue[];
  swimlane: SwimlaneSetting;
  onSelectIssue?: (key: string) => void;
  onMoveToCategory?: (issueKey: string, targetCategory: StatusCategory) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${category}`,
    data: { category },
  });

  const renderCards = (cardIssues: Issue[]) =>
    cardIssues.map((issue) => (
      <DraggableCard key={issue.key} issue={issue} onSelect={onSelectIssue} onMoveToCategory={onMoveToCategory} />
    ));

  const renderSwimlanes = () => {
    if (swimlane === "none") return renderCards(issues);

    const groups = new Map<string, Issue[]>();
    for (const issue of issues) {
      const key =
        swimlane === "assignee"
          ? issue.assignee?.displayName || "Unassigned"
          : issue.priority?.name || "None";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(issue);
    }

    // Sort groups
    const sortedKeys = [...groups.keys()].sort((a, b) => {
      if (swimlane === "assignee") {
        if (a === "Unassigned") return 1;
        if (b === "Unassigned") return -1;
        return a.localeCompare(b);
      }
      // Priority order
      const order = ["Highest", "High", "Medium", "Low", "Lowest", "None"];
      return order.indexOf(a) - order.indexOf(b);
    });

    return sortedKeys.map((key) => (
      <SwimlaneGroup key={key} label={key} issues={groups.get(key)!} onSelectIssue={onSelectIssue} onMoveToCategory={onMoveToCategory} />
    ));
  };

  return (
    <div
      ref={setNodeRef}
      className={`flex min-w-[280px] flex-1 flex-col rounded-lg border-t-2 bg-zinc-950/50 ${CATEGORY_COLORS[category]} ${
        isOver ? "ring-2 ring-blue-500/30 bg-blue-950/20" : ""
      }`}
      data-testid={`board-column-${category}`}
    >
      <div className="flex items-center justify-between px-3 py-2">
        <h3 className="text-sm font-semibold text-zinc-300">
          {CATEGORY_LABELS[category]}
        </h3>
        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
          {issues.length}
        </span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto px-2 pb-2">
        {renderSwimlanes()}
      </div>
    </div>
  );
}

function SwimlaneGroup({
  label,
  issues,
  onSelectIssue,
  onMoveToCategory,
}: {
  label: string;
  issues: Issue[];
  onSelectIssue?: (key: string) => void;
  onMoveToCategory?: (issueKey: string, targetCategory: StatusCategory) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="mb-1">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors cursor-pointer"
        aria-expanded={!collapsed}
        aria-label={`Swimlane ${label}`}
      >
        <span className={`transition-transform ${collapsed ? "" : "rotate-90"}`}>▶</span>
        <span className="font-medium">{label}</span>
        <span className="text-zinc-600">({issues.length})</span>
      </button>
      {!collapsed && (
        <div className="mt-1 space-y-2">
          {issues.map((issue) => (
            <DraggableCard key={issue.key} issue={issue} onSelect={onSelectIssue} onMoveToCategory={onMoveToCategory} />
          ))}
        </div>
      )}
    </div>
  );
}

function BoardView({
  project,
  filters,
  onIssuesLoaded,
  onSelectIssue,
  isOnline = true,
  queueMutation,
}: {
  project: string;
  filters: Filters;
  onIssuesLoaded?: (issues: Issue[]) => void;
  onSelectIssue?: (key: string) => void;
  isOnline?: boolean;
  queueMutation?: (url: string, method: string, body: unknown, desc: string) => Promise<void>;
}) {
  const queryClient = useQueryClient();
  const [swimlane, setSwimlane] = useState<SwimlaneSetting>("none");
  const [activeIssue, setActiveIssue] = useState<Issue | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ["issues", project, "updated", "DESC", filters.status, filters.type, filters.assignee, "board"],
    queryFn: async () => {
      const params = new URLSearchParams({ max_results: "200", start_at: "0", sort_by: "updated", sort_order: "DESC" });
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
    if (data?.issues) onIssuesLoaded?.(data.issues);
  }, [data?.issues, onIssuesLoaded]);

  const transitionMutation = useMutation({
    mutationFn: async ({ issueKey, transitionId }: { issueKey: string; transitionId: string }) => {
      const url = `${API}/api/issues/${issueKey}/transition`;
      const init: RequestInit = { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transition_id: transitionId }) };
      const res = queueMutation
        ? await offlineFetch(url, init, queueMutation, isOnline, `Transition ${issueKey}`)
        : await fetch(url, init);
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issues"] });
    },
  });

  const handleDragStart = (event: DragStartEvent) => {
    const issue = event.active.data.current?.issue as Issue | undefined;
    if (issue) setActiveIssue(issue);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveIssue(null);
    const { active, over } = event;
    if (!over) return;

    const issue = active.data.current?.issue as Issue | undefined;
    if (!issue) return;

    const targetColumnId = over.id as string;
    const targetCategory = targetColumnId.replace("column-", "") as StatusCategory;
    const currentCategory = issue.status.category as StatusCategory;

    if (targetCategory === currentCategory) return;

    // Fetch issue detail to get available transitions
    try {
      const res = await fetch(`${API}/api/issues/${issue.key}`);
      if (!res.ok) return;
      const detail = (await res.json()) as IssueDetail;

      // Map target category to likely transition names
      const categoryTransitionNames: Record<StatusCategory, string[]> = {
        new: ["to do", "backlog", "open", "reopen", "reopened"],
        indeterminate: ["in progress", "in review", "start progress", "start", "review"],
        done: ["done", "close", "closed", "resolve", "resolved", "complete"],
      };

      const targetNames = categoryTransitionNames[targetCategory];
      const transition = detail.transitions.find((t) =>
        targetNames.some((name) => t.name.toLowerCase().includes(name)),
      ) || detail.transitions[0]; // Fallback to first available transition

      if (transition) {
        // Optimistic update
        queryClient.setQueryData(
          ["issues", project, "updated", "DESC", filters.status, filters.type, filters.assignee, "board"],
          (old: { issues: Issue[]; total: number } | undefined) => {
            if (!old) return old;
            return {
              ...old,
              issues: old.issues.map((i) =>
                i.key === issue.key
                  ? { ...i, status: { ...i.status, category: targetCategory, name: CATEGORY_LABELS[targetCategory] } }
                  : i,
              ),
            };
          },
        );
        transitionMutation.mutate({ issueKey: issue.key, transitionId: transition.id });
      }
    } catch {
      // Ignore transition errors silently
    }
  };

  const handleMoveToCategory = async (issueKey: string, targetCategory: StatusCategory) => {
    const issueInData = data?.issues.find((i) => i.key === issueKey);
    if (!issueInData) return;
    const currentCategory = issueInData.status.category as StatusCategory;
    if (targetCategory === currentCategory) return;

    try {
      const res = await fetch(`${API}/api/issues/${issueKey}`);
      if (!res.ok) return;
      const detail = (await res.json()) as IssueDetail;

      const categoryTransitionNames: Record<StatusCategory, string[]> = {
        new: ["to do", "backlog", "open", "reopen", "reopened"],
        indeterminate: ["in progress", "in review", "start progress", "start", "review"],
        done: ["done", "close", "closed", "resolve", "resolved", "complete"],
      };

      const targetNames = categoryTransitionNames[targetCategory];
      const transition = detail.transitions.find((t) =>
        targetNames.some((name) => t.name.toLowerCase().includes(name)),
      ) || detail.transitions[0];

      if (transition) {
        queryClient.setQueryData(
          ["issues", project, "updated", "DESC", filters.status, filters.type, filters.assignee, "board"],
          (old: { issues: Issue[]; total: number } | undefined) => {
            if (!old) return old;
            return {
              ...old,
              issues: old.issues.map((i) =>
                i.key === issueKey
                  ? { ...i, status: { ...i.status, category: targetCategory, name: CATEGORY_LABELS[targetCategory] } }
                  : i,
              ),
            };
          },
        );
        transitionMutation.mutate({ issueKey, transitionId: transition.id });
      }
    } catch {
      // Ignore transition errors silently
    }
  };

  if (isLoading) return <div className="p-8 text-zinc-500">Loading board...</div>;
  if (error) return <div className="p-8 text-red-400">Error: {(error as Error).message}</div>;

  const issues = data?.issues || [];
  const columns: Record<StatusCategory, Issue[]> = { new: [], indeterminate: [], done: [] };
  for (const issue of issues) {
    const cat = (issue.status?.category || "new") as StatusCategory;
    if (columns[cat]) columns[cat].push(issue);
    else columns.new.push(issue);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="p-3">
        {/* Board header with swimlane toggle */}
        <div className="mb-3 flex items-center gap-2">
          <label className="text-xs text-zinc-500">Swimlanes:</label>
          <select
            value={swimlane}
            onChange={(e) => setSwimlane(e.target.value as SwimlaneSetting)}
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-300 focus:border-blue-500 focus:outline-none"
            aria-label="Swimlane grouping"
          >
            <option value="none">None</option>
            <option value="assignee">Assignee</option>
            <option value="priority">Priority</option>
          </select>
        </div>

        {/* Columns */}
        <div className="flex gap-3 overflow-x-auto pb-2" role="region" aria-label="Kanban board">
          {CATEGORY_ORDER.map((cat) => (
            <DroppableColumn
              key={cat}
              category={cat}
              issues={columns[cat]}
              swimlane={swimlane}
              onSelectIssue={onSelectIssue}
              onMoveToCategory={handleMoveToCategory}
            />
          ))}
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeIssue ? (
          <div className="w-[280px]">
            <DraggableCard issue={activeIssue} isDragOverlay />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

/* ── List View ── */

const PAGE_SIZE = 50;

function ListView({ project, filters, onIssuesLoaded, onSelectIssue, highlightedIndex, onHighlightChange, selectedIssueIds, onSelectionChange }: { project: string; filters: Filters; onIssuesLoaded?: (issues: Issue[]) => void; onSelectIssue?: (key: string) => void; highlightedIndex: number; onHighlightChange: (i: number) => void; selectedIssueIds: Set<string>; onSelectionChange: (ids: Set<string>) => void }) {
  const [sortBy, setSortBy] = useState<SortField>("updated");
  const [sortOrder, setSortOrder] = useState<SortOrder>("DESC");
  const [page, setPage] = useState(0);
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

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

  // Scroll highlighted row into view
  useEffect(() => {
    if (highlightedIndex >= 0 && rowRefs.current[highlightedIndex]) {
      rowRefs.current[highlightedIndex]?.scrollIntoView?.({ block: "nearest" });
    }
  }, [highlightedIndex]);

  // Reset highlight when data changes
  useEffect(() => {
    onHighlightChange(-1);
  }, [page, sortBy, sortOrder, filters.status, filters.type, filters.assignee]);

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
            <th className="px-2 py-3 w-8">
              <input
                type="checkbox"
                aria-label="Select all issues"
                checked={data?.issues != null && data.issues.length > 0 && data.issues.every((i) => selectedIssueIds.has(i.key))}
                onChange={(e) => {
                  if (e.target.checked && data?.issues) {
                    onSelectionChange(new Set([...selectedIssueIds, ...data.issues.map((i) => i.key)]));
                  } else if (data?.issues) {
                    const next = new Set(selectedIssueIds);
                    data.issues.forEach((i) => next.delete(i.key));
                    onSelectionChange(next);
                  }
                }}
                className="accent-blue-600 cursor-pointer"
              />
            </th>
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
          {data?.issues.map((issue, idx) => (
            <tr
              key={issue.id}
              ref={(el) => { rowRefs.current[idx] = el; }}
              className={`flex flex-wrap sm:table-row items-center gap-x-3 gap-y-0.5 sm:gap-0 border-b border-zinc-800 sm:border-zinc-900 px-4 sm:px-0 py-3 sm:py-0 transition-colors cursor-pointer ${selectedIssueIds.has(issue.key) ? "bg-blue-900/20" : ""} ${idx === highlightedIndex ? "bg-blue-900/30 ring-1 ring-blue-500/40" : "hover:bg-zinc-900/50"}`}
              onClick={() => onSelectIssue?.(issue.key)}
            >
              <td className="sm:table-cell sm:px-2 sm:py-3 order-first sm:order-none">
                <input
                  type="checkbox"
                  aria-label={`Select ${issue.key}`}
                  checked={selectedIssueIds.has(issue.key)}
                  onChange={(e) => {
                    e.stopPropagation();
                    const next = new Set(selectedIssueIds);
                    if (e.target.checked) next.add(issue.key);
                    else next.delete(issue.key);
                    onSelectionChange(next);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="accent-blue-600 cursor-pointer"
                />
              </td>
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

/* ── Command Palette ── */

const RECENT_SEARCHES_KEY = "jira-ui-recent-searches";
const MAX_RECENT_SEARCHES = 10;

interface QuickSearchResult {
  id: string;
  key: string;
  summary: string;
  status: string;
  project: string;
}

function CommandPalette({
  open,
  onClose,
  onSelectIssue,
  project,
}: {
  open: boolean;
  onClose: () => void;
  onSelectIssue: (key: string) => void;
  project: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<QuickSearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    if (open) {
      try {
        const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
        if (stored) setRecentSearches(JSON.parse(stored));
      } catch { /* ignore */ }
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setResults([]);
      setSelectedIndex(0);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: query.trim() });
        if (project) params.set("project", project);
        const res = await fetch(`${API}/api/search/quick?${params}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.issues || []);
          setSelectedIndex(0);
        }
      } catch { /* ignore */ }
      setIsSearching(false);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open, project]);

  const saveRecentSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    const updated = [trimmed, ...recentSearches.filter((s) => s !== trimmed)].slice(0, MAX_RECENT_SEARCHES);
    setRecentSearches(updated);
    try {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch { /* ignore */ }
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch { /* ignore */ }
  };

  const selectResult = (key: string) => {
    if (query.trim()) saveRecentSearch(query.trim());
    onSelectIssue(key);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results.length > 0 && selectedIndex >= 0 && selectedIndex < results.length) {
        selectResult(results[selectedIndex].key);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  const handleRecentClick = (term: string) => {
    setQuery(term);
  };

  if (!open) return null;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/60 pt-[15vh] sm:pt-[20vh]"
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
      role="dialog"
      aria-label="Command palette"
    >
      <div className="w-full max-w-lg mx-4 rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-2 border-b border-zinc-700 px-4 py-3">
          <span className="text-zinc-500 text-sm">🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search issues..."
            aria-label="Search issues"
            className="flex-1 bg-transparent text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none"
          />
          <kbd className="hidden sm:inline-block rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500">
            ESC
          </kbd>
        </div>

        {/* Results / Recent searches */}
        <div className="max-h-[300px] overflow-y-auto" role="listbox" aria-label="Search results">
          {query.trim() ? (
            <>
              {isSearching && results.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-zinc-500">Searching...</div>
              )}
              {!isSearching && results.length === 0 && query.trim() && (
                <div className="px-4 py-6 text-center text-sm text-zinc-500">No results found</div>
              )}
              {results.map((result, i) => (
                <button
                  key={result.id}
                  role="option"
                  aria-selected={i === selectedIndex}
                  onClick={() => selectResult(result.key)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors cursor-pointer ${
                    i === selectedIndex ? "bg-blue-600/20 text-zinc-100" : "text-zinc-300 hover:bg-zinc-800"
                  }`}
                >
                  <span className="font-mono text-xs text-blue-400 shrink-0">{result.key}</span>
                  <span className="flex-1 truncate">{result.summary}</span>
                  <StatusBadge status={result.status} />
                  {result.project && (
                    <span className="text-xs text-zinc-500 shrink-0">{result.project}</span>
                  )}
                </button>
              ))}
            </>
          ) : (
            <>
              {recentSearches.length > 0 && (
                <>
                  <div className="flex items-center justify-between px-4 pt-3 pb-1">
                    <span className="text-xs text-zinc-500">Recent searches</span>
                    <button
                      onClick={clearRecentSearches}
                      className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer"
                      aria-label="Clear recent searches"
                    >
                      Clear
                    </button>
                  </div>
                  {recentSearches.map((term) => (
                    <button
                      key={term}
                      onClick={() => handleRecentClick(term)}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors cursor-pointer"
                      role="option"
                      aria-selected={false}
                    >
                      <span className="text-zinc-600">🕐</span>
                      <span>{term}</span>
                    </button>
                  ))}
                </>
              )}
              {recentSearches.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-zinc-500">
                  Type to search issues...
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer hint */}
        <div className="border-t border-zinc-800 px-4 py-2 text-[11px] text-zinc-600 flex gap-4">
          <span>↑↓ Navigate</span>
          <span>↵ Open</span>
          <span>ESC Close</span>
        </div>
      </div>
    </div>
  );
}

/* ── Shortcut Help Overlay ── */

const SHORTCUTS: { key: string; description: string }[] = [
  { key: "j", description: "Move down in list view" },
  { key: "k", description: "Move up in list view" },
  { key: "Enter", description: "Open highlighted issue" },
  { key: "Escape", description: "Close detail panel / modal" },
  { key: "b", description: "Switch to board view" },
  { key: "l", description: "Switch to list view" },
  { key: "s", description: "Switch to sprint view" },
  { key: "c", description: "Create new issue" },
  { key: "?", description: "Show this help" },
  { key: "Ctrl+K / ⌘K", description: "Open command palette" },
];

function ShortcutHelpOverlay({ onClose }: { onClose: () => void }) {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "?") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60"
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
      role="dialog"
      aria-label="Keyboard shortcuts"
    >
      <div className="w-full max-w-md mx-4 rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-zinc-700 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-200">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
            aria-label="Close shortcuts help"
          >
            ✕
          </button>
        </div>
        <div className="px-4 py-3 space-y-1">
          {SHORTCUTS.map((s) => (
            <div key={s.key} className="flex items-center justify-between py-1.5">
              <span className="text-sm text-zinc-300">{s.description}</span>
              <kbd className="rounded border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-xs font-mono text-zinc-400">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Create Issue Modal ── */

const ISSUE_TYPES = ["Task", "Bug", "Story", "Epic"];

const CREATE_FIELD_CLASS =
  "w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 focus:border-blue-500 focus:outline-none";

function CreateIssueModal({
  onClose,
  defaultProject,
  isOnline = true,
  queueMutation,
}: {
  onClose: () => void;
  defaultProject: string;
  isOnline?: boolean;
  queueMutation?: (url: string, method: string, body: unknown, desc: string) => Promise<void>;
}) {
  const queryClient = useQueryClient();
  const backdropRef = useRef<HTMLDivElement>(null);

  const [formProject, setFormProject] = useState(defaultProject);
  const [summary, setSummary] = useState("");
  const [issueType, setIssueType] = useState("Task");
  const [priority, setPriority] = useState("");
  const [assignee, setAssignee] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<{ project?: string; summary?: string }>({});
  const [submitError, setSubmitError] = useState("");

  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await fetch(`${API}/api/projects`);
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json() as Promise<{ key: string; name: string; id: string }[]>;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: priorities } = useQuery({
    queryKey: ["priorities"],
    queryFn: async () => {
      const res = await fetch(`${API}/api/priorities`);
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json() as Promise<JiraPriority[]>;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: members } = useQuery({
    queryKey: ["members", formProject],
    queryFn: async () => {
      const res = await fetch(`${API}/api/projects/${formProject}/members`);
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json() as Promise<ProjectMember[]>;
    },
    enabled: !!formProject,
    staleTime: 5 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { project: string; summary: string; issue_type: string; priority?: string; assignee?: string; description?: string }) => {
      const url = `${API}/api/issues`;
      const init: RequestInit = { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) };
      const res = queueMutation
        ? await offlineFetch(url, init, queueMutation, isOnline, `Create issue in ${data.project}`)
        : await fetch(url, init);
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json() as Promise<{ id: string; key: string; self: string }>;
    },
    onSuccess: (data) => {
      // Optimistic: add a placeholder issue to the cache immediately
      queryClient.setQueriesData<{ issues: Issue[]; total: number }>(
        { queryKey: ["issues"] },
        (old) => {
          if (!old) return old;
          const newIssue: Issue = {
            id: data.id,
            key: data.key,
            summary,
            status: { name: "To Do", category: "new" },
            priority: { name: priority || "Medium", iconUrl: "" },
            assignee: assignee && members
              ? (() => {
                  const m = members.find((mem) => mem.accountId === assignee);
                  return m ? { accountId: m.accountId, displayName: m.displayName, avatarUrl: m.avatarUrl } : null;
                })()
              : null,
            type: { name: issueType, iconUrl: "" },
            updated: new Date().toISOString(),
          };
          return { issues: [newIssue, ...old.issues], total: old.total + 1 };
        },
      );
      // Then invalidate to get fresh data from server
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      onClose();
    },
    onError: () => {
      setSubmitError("Failed to create issue. Please try again.");
    },
  });

  const validate = (): boolean => {
    const newErrors: { project?: string; summary?: string } = {};
    if (!formProject) newErrors.project = "Project is required";
    if (!summary.trim()) newErrors.summary = "Summary is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    if (!validate()) return;
    createMutation.mutate({
      project: formProject,
      summary: summary.trim(),
      issue_type: issueType,
      ...(priority && { priority }),
      ...(assignee && { assignee }),
      ...(description.trim() && { description: description.trim() }),
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-[10vh] overflow-y-auto"
      onClick={(e) => e.target === backdropRef.current && onClose()}
      role="dialog"
      aria-label="Create issue"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <h2 className="text-lg font-semibold text-zinc-100">Create Issue</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 cursor-pointer"
            aria-label="Close create modal"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          {submitError && (
            <div className="rounded-md bg-red-900/50 border border-red-700 px-3 py-2 text-sm text-red-300" role="alert">
              {submitError}
            </div>
          )}

          {/* Project */}
          <div>
            <label htmlFor="create-project" className="block text-sm font-medium text-zinc-300 mb-1">
              Project <span className="text-red-400">*</span>
            </label>
            <select
              id="create-project"
              value={formProject}
              onChange={(e) => { setFormProject(e.target.value); setAssignee(""); setErrors((prev) => ({ ...prev, project: undefined })); }}
              className={CREATE_FIELD_CLASS}
            >
              <option value="">Select project...</option>
              {projects?.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.key} — {p.name}
                </option>
              ))}
            </select>
            {errors.project && <p className="mt-1 text-xs text-red-400">{errors.project}</p>}
          </div>

          {/* Summary */}
          <div>
            <label htmlFor="create-summary" className="block text-sm font-medium text-zinc-300 mb-1">
              Summary <span className="text-red-400">*</span>
            </label>
            <input
              id="create-summary"
              type="text"
              value={summary}
              onChange={(e) => { setSummary(e.target.value); setErrors((prev) => ({ ...prev, summary: undefined })); }}
              className={CREATE_FIELD_CLASS}
              placeholder="What needs to be done?"
              autoFocus
            />
            {errors.summary && <p className="mt-1 text-xs text-red-400">{errors.summary}</p>}
          </div>

          {/* Type + Priority row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="create-type" className="block text-sm font-medium text-zinc-300 mb-1">Type</label>
              <select
                id="create-type"
                value={issueType}
                onChange={(e) => setIssueType(e.target.value)}
                className={CREATE_FIELD_CLASS}
              >
                {ISSUE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="create-priority" className="block text-sm font-medium text-zinc-300 mb-1">Priority</label>
              <select
                id="create-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className={CREATE_FIELD_CLASS}
              >
                <option value="">Default</option>
                {priorities?.map((p) => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Assignee */}
          <div>
            <label htmlFor="create-assignee" className="block text-sm font-medium text-zinc-300 mb-1">Assignee</label>
            <select
              id="create-assignee"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className={CREATE_FIELD_CLASS}
              disabled={!formProject}
            >
              <option value="">Unassigned</option>
              {members?.filter((m) => m.active).map((m) => (
                <option key={m.accountId} value={m.accountId}>{m.displayName}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="create-description" className="block text-sm font-medium text-zinc-300 mb-1">Description</label>
            <textarea
              id="create-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`${CREATE_FIELD_CLASS} min-h-[100px] resize-y`}
              placeholder="Add a description..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 cursor-pointer"
            >
              {createMutation.isPending ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Bulk Action Bar ── */

interface BulkActionResult {
  total: number;
  succeeded: number;
  failed: number;
}

function BulkActionBar({
  selectedIds,
  onDeselect,
  project,
}: {
  selectedIds: Set<string>;
  onDeselect: () => void;
  project: string;
}) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<BulkActionResult | null>(null);

  const { data: priorities } = useQuery({
    queryKey: ["priorities"],
    queryFn: async () => {
      const res = await fetch(`${API}/api/priorities`);
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json() as Promise<JiraPriority[]>;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: members } = useQuery({
    queryKey: ["members", project],
    queryFn: async () => {
      const res = await fetch(`${API}/api/projects/${project}/members`);
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json() as Promise<ProjectMember[]>;
    },
    enabled: !!project,
    staleTime: 5 * 60 * 1000,
  });

  const showResult = (r: BulkActionResult) => {
    setResult(r);
    setTimeout(() => setResult(null), 3000);
  };

  const handleBulkTransition = async (transitionName: string) => {
    setBusy(true);
    const keys = [...selectedIds];
    const results = await Promise.allSettled(
      keys.map(async (key) => {
        const detailRes = await fetch(`${API}/api/issues/${key}`);
        if (!detailRes.ok) throw new Error(`Failed to fetch ${key}`);
        const detail = (await detailRes.json()) as IssueDetail;
        const transition = detail.transitions.find(
          (t) => t.name.toLowerCase() === transitionName.toLowerCase(),
        );
        if (!transition) throw new Error(`No transition "${transitionName}" for ${key}`);
        const res = await fetch(`${API}/api/issues/${key}/transition`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transition_id: transition.id }),
        });
        if (!res.ok) throw new Error(`Transition failed for ${key}`);
      }),
    );
    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    showResult({ total: keys.length, succeeded, failed: keys.length - succeeded });
    queryClient.invalidateQueries({ queryKey: ["issues"] });
    setBusy(false);
  };

  const handleBulkAssign = async (accountId: string) => {
    setBusy(true);
    const keys = [...selectedIds];
    const results = await Promise.allSettled(
      keys.map(async (key) => {
        const res = await fetch(`${API}/api/issues/${key}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assignee: accountId || null }),
        });
        if (!res.ok) throw new Error(`Assign failed for ${key}`);
      }),
    );
    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    showResult({ total: keys.length, succeeded, failed: keys.length - succeeded });
    queryClient.invalidateQueries({ queryKey: ["issues"] });
    setBusy(false);
  };

  const handleBulkPriority = async (priorityName: string) => {
    setBusy(true);
    const keys = [...selectedIds];
    const results = await Promise.allSettled(
      keys.map(async (key) => {
        const res = await fetch(`${API}/api/issues/${key}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ priority: priorityName }),
        });
        if (!res.ok) throw new Error(`Priority failed for ${key}`);
      }),
    );
    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    showResult({ total: keys.length, succeeded, failed: keys.length - succeeded });
    queryClient.invalidateQueries({ queryKey: ["issues"] });
    setBusy(false);
  };

  if (selectedIds.size === 0) return null;

  const COMMON_TRANSITIONS = ["To Do", "In Progress", "Done"];

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-40 border-t border-zinc-700 bg-zinc-900/95 backdrop-blur-sm px-4 py-3 shadow-lg"
      role="toolbar"
      aria-label="Bulk actions"
    >
      <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
        <span className="text-sm font-medium text-zinc-200 shrink-0">
          {selectedIds.size} selected
        </span>

        {busy ? (
          <span className="text-sm text-zinc-400">Processing...</span>
        ) : (
          <>
            {/* Transition */}
            <select
              aria-label="Bulk transition"
              value=""
              onChange={(e) => { if (e.target.value) handleBulkTransition(e.target.value); }}
              className={FILTER_SELECT_CLASS}
              disabled={busy}
            >
              <option value="" disabled>Transition...</option>
              {COMMON_TRANSITIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            {/* Assign */}
            <select
              aria-label="Bulk assign"
              value=""
              onChange={(e) => { if (e.target.value !== "") handleBulkAssign(e.target.value); }}
              className={FILTER_SELECT_CLASS}
              disabled={busy || !project}
            >
              <option value="" disabled>Assign...</option>
              <option value="__unassign__">Unassigned</option>
              {members?.filter((m) => m.active).map((m) => (
                <option key={m.accountId} value={m.accountId}>{m.displayName}</option>
              ))}
            </select>

            {/* Priority */}
            <select
              aria-label="Bulk priority"
              value=""
              onChange={(e) => { if (e.target.value) handleBulkPriority(e.target.value); }}
              className={FILTER_SELECT_CLASS}
              disabled={busy}
            >
              <option value="" disabled>Priority...</option>
              {(priorities || FALLBACK_PRIORITIES.map((p) => ({ id: p, name: p, iconUrl: "" }))).map((p) => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
          </>
        )}

        {result && (
          <span className={`text-sm ${result.failed > 0 ? "text-yellow-400" : "text-green-400"}`}>
            {result.succeeded}/{result.total} succeeded{result.failed > 0 ? `, ${result.failed} failed` : ""}
          </span>
        )}

        <button
          onClick={onDeselect}
          className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors cursor-pointer sm:ml-auto"
          aria-label="Deselect all"
        >
          Deselect all
        </button>
      </div>
    </div>
  );
}

interface SprintInfo {
  id: number;
  name: string;
  state: string;
  startDate: string;
  endDate: string;
  goal: string;
  boardId: number;
  boardName: string;
}

interface SprintIssue {
  id: string;
  key: string;
  summary: string;
  status: string;
  statusCategory: string;
  priority: string;
  assignee: string;
  type: string;
  storyPoints: number | null;
  created: string;
}

interface BurndownPoint {
  date: string;
  remaining: number;
  ideal: number;
}

interface VelocityEntry {
  sprintId: number;
  sprintName: string;
  state: string;
  committedPoints: number;
  completedPoints: number;
  committedCount: number;
  completedCount: number;
}

const SPRINT_CHART_COLORS = ["#3b82f6", "#22c55e", "#eab308", "#ef4444", "#a855f7", "#06b6d4", "#f97316", "#ec4899"];

function SprintDashboard({ project }: { project: string }) {
  const [selectedSprintId, setSelectedSprintId] = useState<number | null>(null);

  // Fetch available sprints
  const { data: sprintsData, isLoading: sprintsLoading } = useQuery({
    queryKey: ["sprints", project],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (project) params.set("project", project);
      const res = await fetch(`${API}/api/sprints?${params}`);
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json() as Promise<{ sprints: SprintInfo[] }>;
    },
  });

  const sprints = sprintsData?.sprints || [];
  const activeSprint = selectedSprintId
    ? sprints.find((s) => s.id === selectedSprintId) || sprints[0]
    : sprints[0];

  // Auto-select first sprint
  useEffect(() => {
    if (sprints.length > 0 && !selectedSprintId) {
      setSelectedSprintId(sprints[0].id);
    }
  }, [sprints, selectedSprintId]);

  const sprintId = activeSprint?.id;
  const boardId = activeSprint?.boardId;

  // Fetch sprint issues with status counts
  const { data: issuesData, isLoading: issuesLoading } = useQuery({
    queryKey: ["sprint-issues", sprintId],
    queryFn: async () => {
      const res = await fetch(`${API}/api/sprints/${sprintId}/issues`);
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json() as Promise<{
        issues: SprintIssue[];
        total: number;
        statusCounts: { status: string; count: number }[];
        categoryCounts: { todo: number; inProgress: number; done: number };
      }>;
    },
    enabled: !!sprintId,
  });

  // Fetch burndown data
  const { data: burndownData } = useQuery({
    queryKey: ["sprint-burndown", sprintId, boardId],
    queryFn: async () => {
      const res = await fetch(`${API}/api/sprints/${sprintId}/burndown?board_id=${boardId}`);
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json() as Promise<{ burndown: BurndownPoint[]; sprint: unknown }>;
    },
    enabled: !!sprintId && !!boardId,
  });

  // Fetch velocity data
  const { data: velocityData } = useQuery({
    queryKey: ["sprint-velocity", sprintId, boardId],
    queryFn: async () => {
      const res = await fetch(`${API}/api/sprints/${sprintId}/velocity?board_id=${boardId}`);
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json() as Promise<{ velocity: VelocityEntry[] }>;
    },
    enabled: !!sprintId && !!boardId,
  });

  if (sprintsLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-zinc-500" data-testid="sprint-loading">
        Loading sprints…
      </div>
    );
  }

  if (sprints.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-500" data-testid="no-active-sprint">
        <span className="text-4xl mb-4">🏃</span>
        <p className="text-lg font-medium">No active sprint</p>
        <p className="text-sm mt-1">Start a sprint in Jira to see the dashboard here.</p>
      </div>
    );
  }

  const categoryCounts = issuesData?.categoryCounts || { todo: 0, inProgress: 0, done: 0 };
  const totalIssues = issuesData?.total || 0;
  const statusCounts = issuesData?.statusCounts || [];
  const burndown = burndownData?.burndown || [];
  const velocity = velocityData?.velocity || [];

  // Scope change: issues created after sprint start
  const sprintStart = activeSprint?.startDate;
  const scopeChanges = sprintStart
    ? (issuesData?.issues || []).filter((i) => i.created > sprintStart)
    : [];

  // Format dates for display
  const formatDate = (d: string) => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return d;
    }
  };

  const daysRemaining = activeSprint?.endDate
    ? Math.max(0, Math.ceil((new Date(activeSprint.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const completionPct = totalIssues > 0 ? Math.round((categoryCounts.done / totalIssues) * 100) : 0;

  return (
    <div className="p-4 sm:p-6 space-y-6" data-testid="sprint-dashboard">
      {/* Sprint selector + header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          {sprints.length > 1 && (
            <select
              value={selectedSprintId || ""}
              onChange={(e) => setSelectedSprintId(Number(e.target.value))}
              className="mb-2 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 focus:border-blue-500 focus:outline-none"
              aria-label="Select sprint"
            >
              {sprints.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.boardName})
                </option>
              ))}
            </select>
          )}
          <h2 className="text-xl font-bold text-zinc-100" data-testid="sprint-name">{activeSprint.name}</h2>
          <p className="text-sm text-zinc-400 mt-1">
            {formatDate(activeSprint.startDate)} — {formatDate(activeSprint.endDate)}
            {daysRemaining !== null && (
              <span className="ml-2 text-zinc-500">({daysRemaining} days remaining)</span>
            )}
          </p>
          {activeSprint.goal && (
            <p className="text-sm text-zinc-500 mt-1 italic">Goal: {activeSprint.goal}</p>
          )}
        </div>
        <div className="flex gap-3 text-center">
          <div className="rounded-lg bg-zinc-900 border border-zinc-800 px-4 py-3 min-w-[80px]">
            <div className="text-2xl font-bold text-zinc-100">{totalIssues}</div>
            <div className="text-xs text-zinc-500">Total</div>
          </div>
          <div className="rounded-lg bg-zinc-900 border border-zinc-800 px-4 py-3 min-w-[80px]">
            <div className="text-2xl font-bold text-green-400">{categoryCounts.done}</div>
            <div className="text-xs text-zinc-500">Done</div>
          </div>
          <div className="rounded-lg bg-zinc-900 border border-zinc-800 px-4 py-3 min-w-[80px]">
            <div className="text-2xl font-bold text-blue-400">{categoryCounts.inProgress}</div>
            <div className="text-xs text-zinc-500">In Progress</div>
          </div>
          <div className="rounded-lg bg-zinc-900 border border-zinc-800 px-4 py-3 min-w-[80px]">
            <div className="text-2xl font-bold text-zinc-400">{categoryCounts.todo}</div>
            <div className="text-xs text-zinc-500">To Do</div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs text-zinc-500 mb-1">
          <span>Progress</span>
          <span data-testid="sprint-completion">{completionPct}% complete</span>
        </div>
        <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-green-500 transition-all"
            style={{ width: `${completionPct}%` }}
          />
        </div>
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status breakdown pie chart */}
        <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-4">
          <h3 className="text-sm font-medium text-zinc-300 mb-3">Issues by Status</h3>
          {issuesLoading ? (
            <div className="flex items-center justify-center h-48 text-zinc-500">Loading…</div>
          ) : statusCounts.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusCounts}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {statusCounts.map((_entry, idx) => (
                    <Cell key={idx} fill={SPRINT_CHART_COLORS[idx % SPRINT_CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: "6px", color: "#e4e4e7" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-zinc-500">No data</div>
          )}
        </div>

        {/* Burndown chart */}
        <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-4">
          <h3 className="text-sm font-medium text-zinc-300 mb-3">Burndown Chart</h3>
          {burndown.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={burndown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                <XAxis dataKey="date" tick={{ fill: "#a1a1aa", fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: "6px", color: "#e4e4e7" }} />
                <Legend wrapperStyle={{ color: "#a1a1aa" }} />
                <Line type="monotone" dataKey="remaining" stroke="#3b82f6" strokeWidth={2} name="Remaining" dot={false} />
                <Line type="monotone" dataKey="ideal" stroke="#6b7280" strokeWidth={1} strokeDasharray="5 5" name="Ideal" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-zinc-500">No burndown data</div>
          )}
        </div>

        {/* Velocity chart */}
        <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-4">
          <h3 className="text-sm font-medium text-zinc-300 mb-3">Velocity Chart</h3>
          {velocity.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={velocity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                <XAxis dataKey="sprintName" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: "6px", color: "#e4e4e7" }} />
                <Legend wrapperStyle={{ color: "#a1a1aa" }} />
                <Bar dataKey="committedPoints" fill="#6b7280" name="Committed" />
                <Bar dataKey="completedPoints" fill="#22c55e" name="Completed" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-zinc-500">No velocity data</div>
          )}
        </div>

        {/* Scope change tracking */}
        <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-4">
          <h3 className="text-sm font-medium text-zinc-300 mb-3">
            Scope Changes
            {scopeChanges.length > 0 && (
              <span className="ml-2 rounded-full bg-yellow-600 px-2 py-0.5 text-xs font-medium text-white" data-testid="scope-change-count">
                +{scopeChanges.length}
              </span>
            )}
          </h3>
          {scopeChanges.length > 0 ? (
            <div className="space-y-2 max-h-[230px] overflow-y-auto">
              {scopeChanges.map((issue) => (
                <div key={issue.key} className="flex items-center gap-2 text-sm rounded-md bg-zinc-800 px-3 py-2">
                  <span className="font-mono text-xs text-blue-400">{issue.key}</span>
                  <span className="text-zinc-300 truncate flex-1">{issue.summary}</span>
                  <StatusBadge status={issue.status} />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-zinc-500" data-testid="no-scope-changes">
              No scope changes — sprint is on track
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function isInputFocused(): boolean {
  const tag = document.activeElement?.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (document.activeElement?.getAttribute("contenteditable") === "true") return true;
  return false;
}

/* ── Theme ── */

const THEME_KEY = "jira-ui-theme";
type Theme = "light" | "dark";

function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.classList.contains("dark") ? "dark" : "light"
  );

  const toggleTheme = useCallback(() => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem(THEME_KEY, next);
    // Update meta theme-color
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", next === "dark" ? "#09090b" : "#ffffff");
  }, [theme]);

  return [theme, toggleTheme];
}

export default function App() {
  const [theme, toggleTheme] = useTheme();
  const { isOnline, queueCount, syncing, syncQueue, queueMutation, lastSyncResult, dismissSyncResult } = useOfflineQueue();
  const [view, setView] = useState<View>("list");
  const [project, setProject] = useState("");
  const [filters, setFilters] = useState<Filters>({ status: "", type: "", assignee: "" });
  const [issuesForFilters, setIssuesForFilters] = useState<Issue[]>([]);
  const [selectedIssueKey, setSelectedIssueKey] = useState<string | null>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [selectedIssueIds, setSelectedIssueIds] = useState<Set<string>>(new Set());
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(loadSavedFilters);

  const handleCloseDetail = useCallback(() => setSelectedIssueKey(null), []);
  const handleCloseShortcutHelp = useCallback(() => setShowShortcutHelp(false), []);
  const handleCloseCreateModal = useCallback(() => setShowCreateModal(false), []);

  const hasActiveFilters = !!(project || filters.status || filters.type || filters.assignee);

  const handleSaveFilter = useCallback(() => {
    const name = prompt("Name for this filter:");
    if (!name?.trim()) return;
    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name: name.trim(),
      project,
      filters: { ...filters },
    };
    setSavedFilters((prev) => {
      const updated = [...prev, newFilter];
      persistSavedFilters(updated);
      return updated;
    });
  }, [project, filters]);

  const handleApplySavedFilter = useCallback((sf: SavedFilter) => {
    setProject(sf.project);
    setFilters(sf.filters);
  }, []);

  const handleRenameSavedFilter = useCallback((id: string, newName: string) => {
    setSavedFilters((prev) => {
      const updated = prev.map((sf) => (sf.id === id ? { ...sf, name: newName } : sf));
      persistSavedFilters(updated);
      return updated;
    });
  }, []);

  const handleDeleteSavedFilter = useCallback((id: string) => {
    setSavedFilters((prev) => {
      const updated = prev.filter((sf) => sf.id !== id);
      persistSavedFilters(updated);
      return updated;
    });
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K / Cmd+K always works
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
        return;
      }

      // Skip single-key shortcuts when typing in inputs or when modals are open
      if (isInputFocused()) return;
      if (commandPaletteOpen) return;
      if (showShortcutHelp) return; // handled by ShortcutHelpOverlay itself
      if (showCreateModal) return;

      // Escape: close detail panel
      if (e.key === "Escape") {
        if (selectedIssueKey) {
          setSelectedIssueKey(null);
          e.preventDefault();
        }
        return;
      }

      // ? — show shortcut help
      if (e.key === "?") {
        e.preventDefault();
        setShowShortcutHelp(true);
        return;
      }

      // c — create new issue
      if (e.key === "c") {
        e.preventDefault();
        setShowCreateModal(true);
        return;
      }

      // b / l — switch views (only when detail panel is not open)
      if (!selectedIssueKey) {
        if (e.key === "b") {
          e.preventDefault();
          setView("board");
          return;
        }
        if (e.key === "l") {
          e.preventDefault();
          setView("list");
          return;
        }
        if (e.key === "s") {
          e.preventDefault();
          setView("sprint");
          return;
        }
      }

      // j / k — navigate list view
      if (view === "list" && !selectedIssueKey) {
        const issueCount = issuesForFilters.length;
        if (e.key === "j") {
          e.preventDefault();
          setHighlightedIndex((prev) => Math.min(prev + 1, issueCount - 1));
          return;
        }
        if (e.key === "k") {
          e.preventDefault();
          setHighlightedIndex((prev) => Math.max(prev - 1, 0));
          return;
        }
        // Enter — open highlighted issue
        if (e.key === "Enter" && highlightedIndex >= 0 && highlightedIndex < issueCount) {
          e.preventDefault();
          setSelectedIssueKey(issuesForFilters[highlightedIndex].key);
          return;
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [commandPaletteOpen, showShortcutHelp, showCreateModal, selectedIssueKey, view, highlightedIndex, issuesForFilters]);

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
      {/* Offline indicator banner */}
      <OfflineIndicator
        isOnline={isOnline}
        queueCount={queueCount}
        syncing={syncing}
        lastSyncResult={lastSyncResult}
        onSync={syncQueue}
        onDismiss={dismissSyncResult}
      />

      {/* Header */}
      <header className="border-b border-zinc-800 px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">
            ⚡ <span className="text-zinc-300">Jira UI</span>
            <span className="ml-2 text-xs font-normal text-zinc-600">v{APP_VERSION}</span>
            {!isOnline && (
              <span className="ml-2 inline-block h-2 w-2 rounded-full bg-amber-500" title="Offline" aria-label="Offline status indicator" />
            )}
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-500 cursor-pointer"
              aria-label="Create issue"
              title="Create issue (c)"
            >
              <span className="hidden sm:inline">+ Create</span>
              <span className="sm:hidden">+</span>
            </button>
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-500 transition-colors hover:border-zinc-600 hover:text-zinc-400 cursor-pointer"
              aria-label="Open command palette"
              title="Search (Ctrl+K)"
            >
              <span>🔍</span>
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden sm:inline rounded border border-zinc-700 bg-zinc-800 px-1 py-0.5 text-[10px]">⌘K</kbd>
            </button>
            <button
              onClick={() => setShowShortcutHelp(true)}
              className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-500 transition-colors hover:border-zinc-600 hover:text-zinc-400 cursor-pointer"
              aria-label="Show shortcuts"
              title="Shortcuts (?)"
            >
              ?
            </button>
            <button
              onClick={toggleTheme}
              className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-500 transition-colors hover:border-zinc-600 hover:text-zinc-400 cursor-pointer"
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              title={theme === "dark" ? "Light mode" : "Dark mode"}
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
            <nav className="flex gap-1">
              {(["board", "list", "sprint"] as View[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                    view === v
                      ? "bg-blue-600 text-white"
                      : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                  }`}
                >
                  {v}
                </button>
              ))}
            </nav>
          </div>
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
          <SavedFiltersDropdown
            savedFilters={savedFilters}
            onApply={handleApplySavedFilter}
            onSave={handleSaveFilter}
            onRename={handleRenameSavedFilter}
            onDelete={handleDeleteSavedFilter}
            hasActiveFilters={hasActiveFilters}
          />
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {view === "list" && <ListView project={project} filters={filters} onIssuesLoaded={setIssuesForFilters} onSelectIssue={setSelectedIssueKey} highlightedIndex={highlightedIndex} onHighlightChange={setHighlightedIndex} selectedIssueIds={selectedIssueIds} onSelectionChange={setSelectedIssueIds} />}
        {view === "board" && (
          <BoardView project={project} filters={filters} onIssuesLoaded={setIssuesForFilters} onSelectIssue={setSelectedIssueKey} isOnline={isOnline} queueMutation={queueMutation} />
        )}
        {view === "sprint" && <SprintDashboard project={project} />}
      </main>

      {/* Issue Detail Panel */}
      {selectedIssueKey && (
        <IssueDetailPanel issueKey={selectedIssueKey} onClose={handleCloseDetail} projectKey={project || undefined} isOnline={isOnline} queueMutation={queueMutation} />
      )}

      {/* Command Palette */}
      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onSelectIssue={(key) => setSelectedIssueKey(key)}
        project={project}
      />

      {/* Shortcut Help Overlay */}
      {showShortcutHelp && <ShortcutHelpOverlay onClose={handleCloseShortcutHelp} />}

      {/* Create Issue Modal */}
      {showCreateModal && <CreateIssueModal onClose={handleCloseCreateModal} defaultProject={project} isOnline={isOnline} queueMutation={queueMutation} />}

      {/* Bulk Action Bar */}
      {view === "list" && selectedIssueIds.size > 0 && (
        <BulkActionBar
          selectedIds={selectedIssueIds}
          onDeselect={() => setSelectedIssueIds(new Set())}
          project={project}
        />
      )}
    </div>
  );
}
