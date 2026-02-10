"use client";

import React, { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-yellow-200",
  in_progress: "bg-blue-200",
  closed: "bg-green-200",
};

type IssueNodeData = {
  label: string;
  status: string;
  issueNumber: number;
  issueUrl: string;
};

function IssueNodeComponent({ data, id }: NodeProps) {
  const nodeData = data as IssueNodeData;
  const bgClass = STATUS_COLORS[nodeData.status] ?? "bg-gray-200";

  const handleClick = () => {
    if (nodeData.issueUrl) {
      window.open(nodeData.issueUrl, "_blank");
    }
  };

  return (
    <div
      className={`rounded-lg border shadow-sm px-3 py-2 cursor-pointer ${bgClass}`}
      style={{ width: 180 }}
      onClick={handleClick}
    >
      <Handle type="target" position={Position.Left} className="!bg-gray-400" />
      <p className="truncate text-sm font-medium text-gray-900">{nodeData.label}</p>
      <div className="mt-1">
        <span className="inline-block rounded-full bg-white px-2 py-0.5 text-xs text-gray-700">
          {nodeData.status}
        </span>
      </div>
    </div>
  );
}

export const IssueNode = memo(IssueNodeComponent);
