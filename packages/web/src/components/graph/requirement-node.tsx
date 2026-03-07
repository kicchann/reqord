"use client";

import React, { memo, useCallback } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useRouter } from "next/navigation";

const STATUS_COLORS: Record<string, string> = {
  draft: "border-gray-300 bg-gray-50",
  approved: "border-blue-300 bg-blue-50",
  implemented: "border-emerald-300 bg-emerald-50",
  deprecated: "border-red-300 bg-red-50",
};

type RequirementNodeData = {
  label: string;
  status: string;
  priority: string;
  specCount?: number;
  onDrillDown?: (reqId: string) => void;
};

function RequirementNodeComponent({ data, id }: NodeProps) {
  const nodeData = data as RequirementNodeData;
  const borderClass = STATUS_COLORS[nodeData.status] ?? "border-gray-300 bg-white";
  const router = useRouter();

  const handleBodyClick = useCallback(() => {
    router.push(`/requirements/${id}`);
  }, [router, id]);

  const handleDrillDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      nodeData.onDrillDown?.(id);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodeData.onDrillDown, id],
  );

  const handleButtonMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <div
      className={`cursor-pointer rounded-lg border-2 px-3 py-2 shadow-md ${borderClass}`}
      style={{ width: 220 }}
      onClick={handleBodyClick}
    >
      <Handle type="target" position={Position.Left} className="!bg-gray-300" />
      <p className="truncate text-xs font-mono text-gray-500">{id}</p>
      <p className="mt-0.5 truncate text-sm font-medium text-gray-900">
        {nodeData.label}
      </p>
      {nodeData.onDrillDown && nodeData.specCount && nodeData.specCount > 0 ? (
        <button
          className="nodrag mt-1 text-xs text-gray-400"
          onClick={handleDrillDown}
          onMouseDown={handleButtonMouseDown}
        >
          📄 {nodeData.specCount} spec{nodeData.specCount > 1 ? "s" : ""}
        </button>
      ) : null}
      <Handle type="source" position={Position.Right} className="!bg-gray-300" />
    </div>
  );
}

export const RequirementNode = memo(RequirementNodeComponent);
