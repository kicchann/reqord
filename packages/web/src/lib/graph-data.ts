import type { Requirement, Specification, TaskEntry } from "@reqord/shared";

export type NodeType = "requirement" | "specification" | "issue";
export type EdgeType = "dependency" | "implements" | "tracks";

export type MultiLevelNode = {
  id: string;
  type: NodeType;
  data: {
    label: string;
    status: string;
    priority?: string;
    issueNumber?: number;
    issueUrl?: string;
  };
  position: { x: number; y: number };
};

export type MultiLevelEdge = {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
};

export type MultiLevelGraphData = {
  nodes: MultiLevelNode[];
  edges: MultiLevelEdge[];
};

const COLUMN_X = {
  requirement: 0,
  specification: 400,
  issue: 800,
} as const;

const NODE_SPACING = {
  requirement: 120,
  specification: 120,
  issue: 80,
} as const;

function createRequirementNode(
  req: Requirement,
  index: number,
): MultiLevelNode {
  return {
    id: req.id,
    type: "requirement",
    data: {
      label: req.title,
      status: req.status,
      priority: req.priority,
    },
    position: { x: COLUMN_X.requirement, y: index * NODE_SPACING.requirement },
  };
}

function createDependencyEdges(req: Requirement): MultiLevelEdge[] {
  return req.dependencies.blockedBy.map((blockerId) => ({
    id: `dep-${blockerId}-${req.id}`,
    source: blockerId,
    target: req.id,
    type: "dependency" as const,
  }));
}

function createSpecificationNode(
  spec: Specification,
  specIndex: number,
): MultiLevelNode {
  return {
    id: spec.id,
    type: "specification",
    data: {
      label: spec.id,
      status: spec.status,
    },
    position: {
      x: COLUMN_X.specification,
      y: specIndex * NODE_SPACING.specification,
    },
  };
}

function createImplementsEdge(spec: Specification): MultiLevelEdge {
  return {
    id: `impl-${spec.id}-${spec.requirementId}`,
    source: spec.id,
    target: spec.requirementId,
    type: "implements",
  };
}

function createIssueNode(
  task: TaskEntry,
  specIndex: number,
  issueIndex: number,
): MultiLevelNode {
  const issueId = `issue-${task.number}`;
  return {
    id: issueId,
    type: "issue",
    data: {
      label: `Issue #${task.number}`,
      status: task.status,
      priority: task.priority,
      issueNumber: task.number,
      issueUrl: task.url,
    },
    position: {
      x: COLUMN_X.issue,
      y:
        specIndex * NODE_SPACING.specification +
        issueIndex * NODE_SPACING.issue,
    },
  };
}

function createTracksEdge(issueId: string, specId: string): MultiLevelEdge {
  return {
    id: `track-${issueId}-${specId}`,
    source: issueId,
    target: specId,
    type: "tracks",
  };
}

export function buildMultiLevelGraphData(
  requirements: Requirement[],
  specifications: Specification[],
  tasks: TaskEntry[],
): MultiLevelGraphData {
  const nodes: MultiLevelNode[] = [];
  const edges: MultiLevelEdge[] = [];

  requirements.forEach((req, index) => {
    nodes.push(createRequirementNode(req, index));
    edges.push(...createDependencyEdges(req));
  });

  specifications.forEach((spec, specIndex) => {
    nodes.push(createSpecificationNode(spec, specIndex));
    edges.push(createImplementsEdge(spec));

    const specTasks = tasks.filter((t) =>
      t.linkedTo.specifications.includes(spec.id),
    );
    specTasks.forEach((task, issueIndex) => {
      const issueId = `issue-${task.number}`;
      nodes.push(createIssueNode(task, specIndex, issueIndex));
      edges.push(createTracksEdge(issueId, spec.id));
    });
  });

  return { nodes, edges };
}
