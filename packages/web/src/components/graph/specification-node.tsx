"use client";

import React, { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-blue-200",
  approved: "bg-green-200",
  implemented: "bg-emerald-300",
  deprecated: "bg-red-200",
};

type SpecificationNodeData = {
  label: string;
  status: string;
};

function SpecificationNodeComponent({ data, id }: NodeProps) {
  const nodeData = data as SpecificationNodeData;
  const bgClass = STATUS_COLORS[nodeData.status] ?? "bg-gray-200";

  return (
    <div
      className={`rounded-lg border shadow-sm px-3 py-2 ${bgClass}`}
      style={{ width: 200 }}
    >
      <Handle type="target" position={Position.Left} className="!bg-gray-400" />
      <p className="truncate text-xs font-mono text-gray-900">{id}</p>
      <div className="mt-1">
        <span className="inline-block rounded-full bg-white px-2 py-0.5 text-xs text-gray-700">
          {nodeData.status}
        </span>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-gray-400" />
    </div>
  );
}

export const SpecificationNode = memo(SpecificationNodeComponent);
