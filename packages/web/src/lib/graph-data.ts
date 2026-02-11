import type { Requirement, Specification } from "@reqord/shared";

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

// Column positions for node types
const COLUMN_X = {
  requirement: 0,
  specification: 400,
  issue: 800,
} as const;

// Vertical spacing between nodes
const NODE_SPACING = {
  requirement: 120,
  specification: 120,
  issue: 80,
} as const;

/**
 * Creates a requirement node
 */
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

/**
 * Creates dependency edges from a requirement's blockedBy list
 */
function createDependencyEdges(req: Requirement): MultiLevelEdge[] {
  return req.dependencies.blockedBy.map((blockerId) => ({
    id: `dep-${blockerId}-${req.id}`,
    source: blockerId,
    target: req.id,
    type: "dependency" as const,
  }));
}

/**
 * Creates a specification node
 */
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

/**
 * Creates an implements edge from specification to requirement
 */
function createImplementsEdge(spec: Specification): MultiLevelEdge {
  return {
    id: `impl-${spec.id}-${spec.requirementId}`,
    source: spec.id,
    target: spec.requirementId,
    type: "implements",
  };
}

/**
 * Creates an issue node
 */
function createIssueNode(
  spec: Specification,
  issueNumber: number,
  issueData: {
    title: string;
    url: string;
    priority: string;
    status: string;
  },
  specIndex: number,
  issueIndex: number,
): MultiLevelNode {
  const issueId = `issue-${spec.id}-${issueNumber}`;
  return {
    id: issueId,
    type: "issue",
    data: {
      label: `Issue #${issueNumber}`,
      status: issueData.status,
      priority: issueData.priority,
      issueNumber,
      issueUrl: issueData.url,
    },
    position: {
      x: COLUMN_X.issue,
      y: specIndex * NODE_SPACING.specification + issueIndex * NODE_SPACING.issue,
    },
  };
}

/**
 * Creates a tracks edge from issue to specification
 */
function createTracksEdge(issueId: string, specId: string): MultiLevelEdge {
  return {
    id: `track-${issueId}-${specId}`,
    source: issueId,
    target: specId,
    type: "tracks",
  };
}

/**
 * Builds multi-level graph data from requirements and specifications
 */
export function buildMultiLevelGraphData(
  requirements: Requirement[],
  specifications: Specification[],
): MultiLevelGraphData {
  const nodes: MultiLevelNode[] = [];
  const edges: MultiLevelEdge[] = [];

  // Process requirements: create nodes and dependency edges
  requirements.forEach((req, index) => {
    nodes.push(createRequirementNode(req, index));
    edges.push(...createDependencyEdges(req));
  });

  // Process specifications: create nodes, implements edges, and issue data
  specifications.forEach((spec, specIndex) => {
    nodes.push(createSpecificationNode(spec, specIndex));
    edges.push(createImplementsEdge(spec));

    // Process issues if implementation exists
    if (spec.implementation?.issues) {
      spec.implementation.issues.forEach((issue, issueIndex) => {
        const issueId = `issue-${spec.id}-${issue.number}`;
        nodes.push(
          createIssueNode(spec, issue.number, issue, specIndex, issueIndex),
        );
        edges.push(createTracksEdge(issueId, spec.id));
      });
    }
  });

  return { nodes, edges };
}
