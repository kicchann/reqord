import type { Requirement } from "@reqord/shared";

export interface LayoutNode {
  id: string;
  title: string;
  status: string;
  priority: string;
  x: number;
  y: number;
}

export interface LayoutEdge {
  id: string;
  source: string;
  target: string;
}

const NODE_WIDTH = 240;
const NODE_HEIGHT = 80;
const HORIZONTAL_GAP = 80;
const VERTICAL_GAP = 40;

/**
 * Compute a simple left-to-right DAG layout using topological sorting.
 * Each node is placed in a column based on its longest path from a root.
 */
export function computeDagLayout(requirements: Requirement[]): {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
} {
  const idSet = new Set(requirements.map((r) => r.id));
  const reqMap = new Map(requirements.map((r) => [r.id, r]));

  // Build edges: blockedBy means target depends on source
  const edges: LayoutEdge[] = [];
  for (const req of requirements) {
    for (const depId of req.dependencies.blockedBy) {
      if (idSet.has(depId)) {
        edges.push({
          id: `${depId}->${req.id}`,
          source: depId,
          target: req.id,
        });
      }
    }
  }

  // Compute depth (longest path from root) for each node
  const inDegree = new Map<string, number>();
  const outEdges = new Map<string, string[]>();

  for (const id of idSet) {
    inDegree.set(id, 0);
    outEdges.set(id, []);
  }

  for (const edge of edges) {
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
    outEdges.get(edge.source)!.push(edge.target);
  }

  // Topological sort with depth tracking
  const depth = new Map<string, number>();
  const queue: string[] = [];

  for (const [id, deg] of inDegree) {
    if (deg === 0) {
      queue.push(id);
      depth.set(id, 0);
    }
  }

  let head = 0;
  while (head < queue.length) {
    const current = queue[head++];
    const currentDepth = depth.get(current)!;

    for (const next of outEdges.get(current)!) {
      const newDepth = currentDepth + 1;
      if (newDepth > (depth.get(next) ?? 0)) {
        depth.set(next, newDepth);
      }

      inDegree.set(next, inDegree.get(next)! - 1);
      if (inDegree.get(next) === 0) {
        queue.push(next);
      }
    }
  }

  // Handle cycles: assign depth 0 to any unprocessed nodes
  for (const id of idSet) {
    if (!depth.has(id)) {
      depth.set(id, 0);
    }
  }

  // Group nodes by depth
  const columns = new Map<number, string[]>();
  for (const [id, d] of depth) {
    const col = columns.get(d) ?? [];
    col.push(id);
    columns.set(d, col);
  }

  // Sort within each column for stability
  for (const col of columns.values()) {
    col.sort();
  }

  // Assign positions
  const nodes: LayoutNode[] = [];
  for (const [col, ids] of columns) {
    const x = col * (NODE_WIDTH + HORIZONTAL_GAP);
    for (let row = 0; row < ids.length; row++) {
      const id = ids[row];
      const req = reqMap.get(id)!;
      const y = row * (NODE_HEIGHT + VERTICAL_GAP);
      nodes.push({
        id: req.id,
        title: req.title,
        status: req.status,
        priority: req.priority,
        x,
        y,
      });
    }
  }

  return { nodes, edges };
}
