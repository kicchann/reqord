"use client";

import type { Requirement } from "@reqord/shared";
import { useMemo } from "react";

interface Props {
  label: string;
  selected: string[];
  onChange: (ids: string[]) => void;
  allRequirements: Requirement[];
  excludeId?: string;
}

export function DependencyEditor({
  label,
  selected,
  onChange,
  allRequirements,
  excludeId,
}: Props) {
  const options = useMemo(
    () => allRequirements.filter((r) => r.id !== excludeId),
    [allRequirements, excludeId],
  );

  function handleToggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="max-h-40 overflow-y-auto rounded-md border border-gray-300 p-2">
        {options.length === 0 ? (
          <p className="text-sm text-gray-400">No other requirements</p>
        ) : (
          options.map((req) => (
            <label
              key={req.id}
              className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={selected.includes(req.id)}
                onChange={() => handleToggle(req.id)}
                className="rounded border-gray-300"
              />
              <span className="font-mono text-gray-500">{req.id}</span>
              <span className="truncate">{req.title}</span>
            </label>
          ))
        )}
      </div>
      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {selected.map((id) => (
            <span
              key={id}
              className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-mono text-blue-700"
            >
              {id}
              <button
                type="button"
                onClick={() => onChange(selected.filter((s) => s !== id))}
                className="hover:text-blue-900"
              >
                x
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
