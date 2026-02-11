"use client";

import React, { useMemo, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { Requirement } from "@reqord/shared";
import { computeDagLayout } from "./dag-layout";
import { RequirementNode } from "./requirement-node";
import { EDGE_STYLES } from "./edge-styles";

const nodeTypes = { requirement: RequirementNode };

export function DependencyGraph({
  requirements,
  specCountMap = {},
  onRequirementClick,
}: {
  requirements: Requirement[];
  specCountMap?: Record<string, number>;
  onRequirementClick?: (reqId: string) => void;
}) {
  const { initialNodes, initialEdges } = useMemo(() => {
    const { nodes: layoutNodes, edges: layoutEdges } = computeDagLayout(requirements);

    const rfNodes: Node[] = layoutNodes.map((n) => ({
      id: n.id,
      type: "requirement",
      position: { x: n.x, y: n.y },
      data: {
        label: n.title,
        status: n.status,
        priority: n.priority,
        specCount: specCountMap[n.id] ?? 0,
        ...(onRequirementClick ? { onDrillDown: onRequirementClick } : {}),
      },
    }));

    const rfEdges: Edge[] = layoutEdges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      animated: false,
      style: EDGE_STYLES.dependency,
      markerEnd: { type: "arrowclosed" as const, color: EDGE_STYLES.dependency.stroke },
    }));

    return { initialNodes: rfNodes, initialEdges: rfEdges };
  }, [requirements, specCountMap, onRequirementClick]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const onInit = useCallback((instance: { fitView: () => void }) => {
    instance.fitView();
  }, []);

  return (
    <div className="h-[calc(100vh-10rem)] w-full rounded-lg border border-gray-200 bg-white">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onInit={onInit}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls />
        <MiniMap
          nodeStrokeWidth={3}
          zoomable
          pannable
        />
      </ReactFlow>
    </div>
  );
}
