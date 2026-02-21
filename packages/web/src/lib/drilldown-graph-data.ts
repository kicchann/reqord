import type { Node, Edge } from "@xyflow/react";
import type { Requirement, Specification, TaskEntry } from "@reqord/shared";
import { EDGE_STYLES } from "@/components/graph/edge-styles";

export interface DrillDownGraphData {
  nodes: Node[];
  edges: Edge[];
}

const LAYOUT = {
  REQ_X: 0,
  SPEC_X: 400,
  ISSUE_X: 800,
  VERTICAL_GAP: 120,
  ISSUE_VERTICAL_GAP: 80,
};

export function buildDrillDownGraphData(
  requirement: Requirement,
  specifications: Specification[],
  tasks: TaskEntry[],
): DrillDownGraphData {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // 1. Requirement node (left)
  nodes.push({
    id: requirement.id,
    type: "requirement",
    position: { x: LAYOUT.REQ_X, y: 0 },
    data: {
      label: requirement.title,
      status: requirement.status,
      priority: requirement.priority,
      specCount: specifications.length,
    },
  });

  // 2. Specification nodes (middle column) + implements edges
  specifications.forEach((spec, i) => {
    const specNodeId = spec.id;
    nodes.push({
      id: specNodeId,
      type: "specification",
      position: { x: LAYOUT.SPEC_X, y: i * LAYOUT.VERTICAL_GAP },
      data: {
        label: spec.id,
        status: spec.status,
      },
    });

    edges.push({
      id: `impl-${requirement.id}-${specNodeId}`,
      source: requirement.id,
      target: specNodeId,
      style: EDGE_STYLES.implements,
      animated: false,
    });

    // 3. Issue nodes (right column) from tasks.yaml linked to this spec
    const specTasks = tasks.filter((t) =>
      t.linkedTo.specifications.includes(spec.id),
    );
    specTasks.forEach((task, j) => {
      const issueNodeId = `issue-${task.number}`;
      nodes.push({
        id: issueNodeId,
        type: "issue",
        position: {
          x: LAYOUT.ISSUE_X,
          y: i * LAYOUT.VERTICAL_GAP + j * LAYOUT.ISSUE_VERTICAL_GAP,
        },
        data: {
          label: task.title,
          status: task.status,
          issueNumber: task.number,
          issueUrl: task.url,
        },
      });

      edges.push({
        id: `track-${specNodeId}-${issueNodeId}`,
        source: specNodeId,
        target: issueNodeId,
        style: EDGE_STYLES.tracks,
        animated: false,
      });
    });
  });

  return { nodes, edges };
}
