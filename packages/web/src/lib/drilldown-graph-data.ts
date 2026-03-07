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

  // Pre-calculate task counts per spec for dynamic Y positioning
  const specTaskCounts = specifications.map(
    (spec) =>
      tasks.filter(
        (t) => t.linkedTo.specifications.includes(spec.id),
      ).length,
  );

  // Calculate cumulative Y positions for specs based on previous spec's task count
  const specYPositions: number[] = [];
  let currentY = 0;
  for (let i = 0; i < specifications.length; i++) {
    specYPositions.push(currentY);
    const issueHeight = specTaskCounts[i] * LAYOUT.ISSUE_VERTICAL_GAP;
    currentY += Math.max(LAYOUT.VERTICAL_GAP, issueHeight);
  }

  // Center requirement node vertically
  const lastSpecY = specYPositions.length > 0 ? specYPositions[specYPositions.length - 1] : 0;
  nodes.push({
    id: requirement.id,
    type: "requirement",
    position: { x: LAYOUT.REQ_X, y: lastSpecY / 2 },
    data: {
      label: requirement.title,
      status: requirement.status,
      priority: requirement.priority,
      specCount: specifications.length,
    },
  });

  // 2. Specification nodes (middle column) + implements edges
  const addedIssueIds = new Set<string>();
  specifications.forEach((spec, i) => {
    const specNodeId = spec.id;
    const specY = specYPositions[i];
    nodes.push({
      id: specNodeId,
      type: "specification",
      position: { x: LAYOUT.SPEC_X, y: specY },
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
    let issueOffset = 0;
    specTasks.forEach((task) => {
      const issueNodeId = `issue-${task.number}`;
      if (!addedIssueIds.has(issueNodeId)) {
        addedIssueIds.add(issueNodeId);
        nodes.push({
          id: issueNodeId,
          type: "issue",
          position: {
            x: LAYOUT.ISSUE_X,
            y: specY + issueOffset * LAYOUT.ISSUE_VERTICAL_GAP,
          },
          data: {
            label: task.title,
            status: task.status,
            issueNumber: task.number,
            issueUrl: task.url,
          },
        });
        issueOffset++;
      }

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
