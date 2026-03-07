"use client";

import React, { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

const STATUS_COLORS: Record<string, string> = {
  draft: "border border-gray-300 bg-gray-100",
  approved: "border border-blue-300 bg-blue-100",
  implemented: "border border-emerald-300 bg-emerald-100",
  deprecated: "border border-red-300 bg-red-100",
};

type SpecificationNodeData = {
  label: string;
  status: string;
};

function SpecificationNodeComponent({ data, id }: NodeProps) {
  const nodeData = data as SpecificationNodeData;
  const colorClass = STATUS_COLORS[nodeData.status] ?? "border border-gray-300 bg-gray-100";

  return (
    <div
      className={`rounded-lg shadow-sm px-3 py-2 ${colorClass}`}
      style={{ width: 200 }}
    >
      <Handle type="target" position={Position.Left} className="!bg-gray-300" />
      <p className="truncate text-xs font-mono text-gray-900">{id}</p>
      {nodeData.label && nodeData.label !== id && (
        <p className="mt-0.5 truncate text-sm font-medium text-gray-800">{nodeData.label}</p>
      )}
      <div className="mt-1">
        <span className="inline-block rounded-full bg-white/80 backdrop-blur-sm px-2 py-0.5 text-xs text-gray-700">
          {nodeData.status}
        </span>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-gray-300" />
    </div>
  );
}

export const SpecificationNode = memo(SpecificationNodeComponent);
