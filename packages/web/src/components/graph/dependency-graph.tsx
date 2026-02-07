"use client";

import { useMemo, useCallback } from "react";
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

const nodeTypes = { requirement: RequirementNode };

export function DependencyGraph({ requirements }: { requirements: Requirement[] }) {
  const { initialNodes, initialEdges } = useMemo(() => {
    const { nodes: layoutNodes, edges: layoutEdges } = computeDagLayout(requirements);

    const rfNodes: Node[] = layoutNodes.map((n) => ({
      id: n.id,
      type: "requirement",
      position: { x: n.x, y: n.y },
      data: { label: n.title, status: n.status, priority: n.priority },
    }));

    const rfEdges: Edge[] = layoutEdges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      animated: false,
      style: { stroke: "#94a3b8" },
      markerEnd: { type: "arrowclosed" as const, color: "#94a3b8" },
    }));

    return { initialNodes: rfNodes, initialEdges: rfEdges };
  }, [requirements]);

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
