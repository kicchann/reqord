"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Specification, Status } from "@reqord/shared";
import { StatusBadge } from "@/components/ui/badge";

type SortKey = "id" | "requirementId" | "status" | "version" | "updatedAt";
type SortDir = "asc" | "desc";

const STATUS_OPTIONS: { value: Status | "all"; label: string }[] = [
  { value: "all", label: "All Status" },
  { value: "draft", label: "Draft" },
  { value: "pending_approval", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "deprecated", label: "Deprecated" },
];

export function SpecificationTable({
  specifications,
  requirementTitleMap,
}: {
  specifications: Specification[];
  requirementTitleMap: Record<string, string>;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("id");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const filtered = useMemo(() => {
    let result = specifications;

    if (statusFilter !== "all") {
      result = result.filter((s) => s.status === statusFilter);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (s) =>
          s.id.toLowerCase().includes(q) ||
          s.requirementId.toLowerCase().includes(q) ||
          (requirementTitleMap[s.requirementId] ?? "").toLowerCase().includes(q),
      );
    }

    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "id":
          cmp = a.id.localeCompare(b.id);
          break;
        case "requirementId":
          cmp = a.requirementId.localeCompare(b.requirementId);
          break;
        case "status":
          cmp = a.status.localeCompare(b.status);
          break;
        case "version":
          cmp = a.version.localeCompare(b.version);
          break;
        case "updatedAt":
          cmp = a.updatedAt.localeCompare(b.updatedAt);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [specifications, requirementTitleMap, search, statusFilter, sortKey, sortDir]);

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
          placeholder="Search by ID or requirement..."
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
        <span className="text-sm text-gray-500">
          {filtered.length} / {specifications.length} items
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {renderSortHeader("id", "ID")}
              {renderSortHeader("requirementId", "Requirement")}
              {renderSortHeader("status", "Status")}
              {renderSortHeader("version", "Version")}
              {renderSortHeader("updatedAt", "Updated")}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                  No specifications found.
                </td>
              </tr>
            ) : (
              filtered.map((spec) => (
                <tr key={spec.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-mono">
                    <Link
                      href={`/specifications/${spec.id}`}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {spec.id}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <Link
                      href={`/requirements/${spec.requirementId}`}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      <span className="font-mono">{spec.requirementId}</span>
                      {requirementTitleMap[spec.requirementId] && (
                        <span className="ml-2 text-gray-600">
                          {requirementTitleMap[spec.requirementId]}
                        </span>
                      )}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <StatusBadge status={spec.status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {spec.version}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {new Date(spec.updatedAt).toLocaleDateString("ja-JP")}
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
