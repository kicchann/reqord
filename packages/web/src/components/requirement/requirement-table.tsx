"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import type { Requirement, Status, Priority } from "@reqord/shared";
import { StatusBadge, PriorityBadge, ComplexityBadge } from "@/components/ui/badge";

type SortKey = "id" | "title" | "status" | "priority" | "updatedAt";
type SortDir = "asc" | "desc";

const STATUS_OPTIONS: { value: Status | "all"; label: string }[] = [
  { value: "all", label: "All Status" },
  { value: "draft", label: "Draft" },
  { value: "approved", label: "Approved" },
  { value: "implemented", label: "Implemented" },
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
    const isActive = sortKey === column;
    return (
      <th
        key={column}
        className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
      >
        <button
          type="button"
          onClick={() => handleSort(column)}
          className={`inline-flex items-center gap-1 transition-colors ${
            isActive ? "text-brand-600" : "hover:text-gray-900"
          }`}
          aria-sort={isActive ? (sortDir === "asc" ? "ascending" : "descending") : undefined}
        >
          {label}
          <span className={`text-[10px] ${isActive ? "opacity-100" : "opacity-30"}`}>
            {isActive && sortDir === "desc" ? "▼" : "▲"}
          </span>
        </button>
      </th>
    );
  }

  const hasActiveFilters = search || statusFilter !== "all" || priorityFilter !== "all";

  function clearAllFilters() {
    setSearch("");
    setStatusFilter("all");
    setPriorityFilter("all");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search by ID or title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search requirements by ID or title"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as Status | "all")}
          aria-label="Filter by status"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
          aria-label="Filter by priority"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
          <thead className="bg-gray-50 border-b-2 border-gray-200">
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
                <td colSpan={6} className="px-4 py-12 text-center">
                  <div className="text-gray-400">
                    <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p className="mt-2 text-sm font-medium text-gray-900">No requirements found</p>
                    <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filter criteria</p>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={clearAllFilters}
                        className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        Clear all filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((req, index) => (
                <tr
                  key={req.id}
                  className={`hover:bg-blue-50/50 transition-colors duration-150 ${
                    index % 2 === 1 ? "bg-gray-50/50" : ""
                  }`}
                >
                  <td className="whitespace-nowrap px-4 py-3.5 text-sm font-mono">
                    <Link
                      href={`/requirements/${req.id}`}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {req.id}
                    </Link>
                  </td>
                  <td className="px-4 py-3.5 text-sm">
                    <Link
                      href={`/requirements/${req.id}`}
                      className="text-gray-900 hover:text-blue-600"
                    >
                      {req.title}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5">
                    <StatusBadge status={req.status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5">
                    <PriorityBadge priority={req.priority} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5">
                    {req.estimatedComplexity ? (
                      <ComplexityBadge complexity={req.estimatedComplexity} />
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-sm text-gray-500">
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
