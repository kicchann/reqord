"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Requirement, Status, Priority } from "@reqord/shared";
import { StatusBadge, PriorityBadge, ComplexityBadge } from "@/components/ui/badge";

type SortKey = "id" | "title" | "status" | "priority" | "updatedAt";
type SortDir = "asc" | "desc";

const STATUS_OPTIONS: { value: Status | "all"; label: string }[] = [
  { value: "all", label: "All Status" },
  { value: "draft", label: "Draft" },
  { value: "pending_approval", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "deprecated", label: "Deprecated" },
];

const PRIORITY_OPTIONS: { value: Priority | "all"; label: string }[] = [
  { value: "all", label: "All Priority" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

export function RequirementTable({ requirements }: { requirements: Requirement[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("id");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const filtered = useMemo(() => {
    let result = requirements;

    if (statusFilter !== "all") {
      result = result.filter((r) => r.status === statusFilter);
    }

    if (priorityFilter !== "all") {
      result = result.filter((r) => r.priority === priorityFilter);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q),
      );
    }

    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "id":
          cmp = a.id.localeCompare(b.id);
          break;
        case "title":
          cmp = a.title.localeCompare(b.title);
          break;
        case "status":
          cmp = a.status.localeCompare(b.status);
          break;
        case "priority": {
          const order: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
          cmp = order[a.priority] - order[b.priority];
          break;
        }
        case "updatedAt":
          cmp = a.updatedAt.localeCompare(b.updatedAt);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [requirements, search, statusFilter, priorityFilter, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function renderSortHeader(column: SortKey, label: string) {
    const arrow = sortKey === column ? (sortDir === "asc" ? " ↑" : " ↓") : "";
    return (
      <th
        key={column}
        className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-900"
        onClick={() => handleSort(column)}
      >
        {label}{arrow}
      </th>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search by ID or title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as Status | "all")}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as Priority | "all")}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm"
        >
          {PRIORITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="text-sm text-gray-500">
          {filtered.length} / {requirements.length} items
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {renderSortHeader("id", "ID")}
              {renderSortHeader("title", "Title")}
              {renderSortHeader("status", "Status")}
              {renderSortHeader("priority", "Priority")}
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Complexity
              </th>
              {renderSortHeader("updatedAt", "Updated")}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                  No requirements found.
                </td>
              </tr>
            ) : (
              filtered.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-mono">
                    <Link
                      href={`/requirements/${req.id}`}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {req.id}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <Link
                      href={`/requirements/${req.id}`}
                      className="text-gray-900 hover:text-blue-600"
                    >
                      {req.title}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <StatusBadge status={req.status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <PriorityBadge priority={req.priority} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {req.estimatedComplexity ? (
                      <ComplexityBadge complexity={req.estimatedComplexity} />
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {new Date(req.updatedAt).toLocaleDateString("ja-JP")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
