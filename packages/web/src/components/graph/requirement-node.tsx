"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import Link from "next/link";

const STATUS_COLORS: Record<string, string> = {
  draft: "border-gray-300 bg-gray-50",
  pending_approval: "border-yellow-300 bg-yellow-50",
  approved: "border-green-300 bg-green-50",
  implemented: "border-blue-300 bg-blue-50",
  deprecated: "border-red-300 bg-red-50",
};

type RequirementNodeData = {
  label: string;
  status: string;
  priority: string;
  specCount?: number;
};

function RequirementNodeComponent({ data, id }: NodeProps) {
  const nodeData = data as RequirementNodeData;
  const borderClass = STATUS_COLORS[nodeData.status] ?? "border-gray-300 bg-white";

  return (
    <div
      className={`rounded-lg border-2 px-3 py-2 shadow-sm ${borderClass}`}
      style={{ width: 220 }}
    >
      <Handle type="target" position={Position.Left} className="!bg-gray-400" />
      <Link href={`/requirements/${id}`} className="block">
        <p className="truncate text-xs font-mono text-gray-500">{id}</p>
        <p className="mt-0.5 truncate text-sm font-medium text-gray-900">
          {nodeData.label}
        </p>
      </Link>
      {nodeData.specCount && nodeData.specCount > 0 ? (
        <p className="mt-1 text-xs text-gray-400">
          📄 {nodeData.specCount} spec{nodeData.specCount > 1 ? "s" : ""}
        </p>
      ) : null}
      <Handle type="source" position={Position.Right} className="!bg-gray-400" />
    </div>
  );
}

export const RequirementNode = memo(RequirementNodeComponent);
