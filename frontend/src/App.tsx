import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";

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

interface IssueDetail extends Issue {
  description: string;
  descriptionAdf: AdfNode | null;
  reporter: { accountId: string; displayName: string; avatarUrl: string } | null;
  project: { key: string; name: string };
  labels: string[];
  created: string;
  dueDate: string | null;
  transitions: { id: string; name: string }[];
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
          "prose prose-invert prose-sm max-w-none min-h-[120px] px-3 py-2 focus:outline-none text-zinc-200",
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
        className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-200 focus:border-blue-500 focus:outline-none [color-scheme:dark]"
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

/* ── Issue Detail Panel ── */

const FALLBACK_PRIORITIES = ["Highest", "High", "Medium", "Low", "Lowest"];

function IssueDetailPanel({
  issueKey,
  onClose,
  projectKey,
}: {
  issueKey: string;
  onClose: () => void;
  projectKey?: string;
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
    mutationFn: async (fields: { summary?: string; description?: string; description_adf?: AdfNode; priority?: string; assignee?: string; duedate?: string | null }) => {
      const res = await fetch(`${API}/api/issues/${issueKey}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
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
      const res = await fetch(`${API}/api/issues/${issueKey}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transition_id: transitionId }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issue", issueKey] });
      queryClient.invalidateQueries({ queryKey: ["issues"] });
    },
  });

  const [editingDescription, setEditingDescription] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editingDescription) {
          setEditingDescription(false);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, editingDescription]);

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
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 sm:px-6 py-3 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500">{issue.type?.name}</span>
            <span className="font-mono text-blue-400 font-semibold">{issue.key}</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
            aria-label="Close detail panel"
          >
            ✕
          </button>
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

            {/* Labels */}
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Labels</label>
              <div className="flex flex-wrap gap-1">
                {issue.labels?.length > 0 ? issue.labels.map((l) => (
                  <span key={l} className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">{l}</span>
                )) : <span className="text-zinc-600">None</span>}
              </div>
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

          {/* Mutation feedback */}
          {updateMutation.isPending && <p className="text-xs text-zinc-500">Saving changes...</p>}
          {updateMutation.isError && <p className="text-xs text-red-400">Failed to save changes.</p>}
        </div>
      </div>
    </div>
  );
}

/* ── List View ── */

const PAGE_SIZE = 50;

function ListView({ project, filters, onIssuesLoaded, onSelectIssue }: { project: string; filters: Filters; onIssuesLoaded?: (issues: Issue[]) => void; onSelectIssue?: (key: string) => void }) {
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
              className="flex flex-wrap sm:table-row items-center gap-x-3 gap-y-0.5 sm:gap-0 border-b border-zinc-800 sm:border-zinc-900 px-4 sm:px-0 py-3 sm:py-0 transition-colors hover:bg-zinc-900/50 cursor-pointer"
              onClick={() => onSelectIssue?.(issue.key)}
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
  const [selectedIssueKey, setSelectedIssueKey] = useState<string | null>(null);

  const handleCloseDetail = useCallback(() => setSelectedIssueKey(null), []);

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
        {view === "list" && <ListView project={project} filters={filters} onIssuesLoaded={setIssuesForFilters} onSelectIssue={setSelectedIssueKey} />}
        {view === "board" && (
          <div className="p-8 text-zinc-500">
            Board view — coming in Phase 1
          </div>
        )}
      </main>

      {/* Issue Detail Panel */}
      {selectedIssueKey && (
        <IssueDetailPanel issueKey={selectedIssueKey} onClose={handleCloseDetail} projectKey={project || undefined} />
      )}
    </div>
  );
}
