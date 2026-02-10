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
import type { MultiLevelGraphData } from "@/lib/graph-data";
import { RequirementNode } from "./requirement-node";
import { SpecificationNode } from "./specification-node";
import { IssueNode } from "./issue-node";

const nodeTypes = {
  requirement: RequirementNode,
  specification: SpecificationNode,
  issue: IssueNode,
};

const EDGE_STYLES = {
  dependency: {
    style: { stroke: "#94a3b8", strokeWidth: 2 },
    markerEnd: { type: "arrowclosed" as const, color: "#94a3b8" },
    animated: false,
  },
  implements: {
    style: { stroke: "#6366f1", strokeWidth: 2, strokeDasharray: "5,5" },
    markerEnd: { type: "arrowclosed" as const, color: "#6366f1" },
    animated: false,
  },
  tracks: {
    style: { stroke: "#a855f7", strokeWidth: 2, strokeDasharray: "2,2" },
    markerEnd: { type: "arrowclosed" as const, color: "#a855f7" },
    animated: false,
  },
};

export function MultiLevelGraph({ data }: { data: MultiLevelGraphData }) {
  const { initialNodes, initialEdges } = useMemo(() => {
    const rfNodes: Node[] = data.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: n.data,
    }));

    const rfEdges: Edge[] = data.edges.map((e) => {
      const edgeStyle = EDGE_STYLES[e.type];
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        ...edgeStyle,
      };
    });

    return { initialNodes: rfNodes, initialEdges: rfEdges };
  }, [data]);

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
        <MiniMap nodeStrokeWidth={3} zoomable pannable />
      </ReactFlow>
    </div>
  );
}
