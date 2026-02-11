"use client";

import React, { useMemo } from "react";
import { ReactFlow, Background, Controls } from "@xyflow/react";
import { RequirementNode } from "./requirement-node";
import { SpecificationNode } from "./specification-node";
import { IssueNode } from "./issue-node";
import { buildDrillDownGraphData } from "@/lib/drilldown-graph-data";
import type { Requirement, Specification } from "@reqord/shared";

interface DrillDownGraphProps {
  requirement: Requirement;
  specifications: Specification[];
}

const nodeTypes = {
  requirement: RequirementNode,
  specification: SpecificationNode,
  issue: IssueNode,
};

export function DrillDownGraph({ requirement, specifications }: DrillDownGraphProps) {
  const { nodes, edges } = useMemo(
    () => buildDrillDownGraphData(requirement, specifications),
    [requirement, specifications],
  );

  return (
    <div className="h-[calc(100vh-10rem)] w-full rounded-lg border border-gray-200 bg-white">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
