"use client";

import { useState } from "react";
import { MarkdownRenderer } from "./markdown-renderer";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function MarkdownEditor({ value, onChange }: Props) {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Description (Markdown)
        </label>
        <button
          type="button"
          onClick={() => setShowPreview((prev) => !prev)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {showPreview ? "Edit" : "Preview"}
        </button>
      </div>
      {showPreview ? (
        <div className="min-h-[200px] rounded-md border border-gray-300 bg-white p-4">
          {value.trim() ? (
            <MarkdownRenderer content={value} />
          ) : (
            <p className="text-sm text-gray-400">No content</p>
          )}
        </div>
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={10}
          className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Enter requirement description in Markdown..."
        />
      )}
    </div>
  );
}
