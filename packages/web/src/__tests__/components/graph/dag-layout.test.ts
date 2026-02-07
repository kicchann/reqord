import { describe, it, expect } from "vitest";
import type { Requirement } from "@reqord/shared";
import { computeDagLayout } from "../../../components/graph/dag-layout";

function makeReq(
  id: string,
  blockedBy: string[] = [],
  blocks: string[] = [],
): Requirement {
  return {
    id,
    version: "1.0.0",
    title: `Requirement ${id}`,
    status: "draft",
    priority: "medium",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
    versionHistory: [],
    files: { description: `${id}/description.md` },
    successCriteria: [],
    format: { type: "free-form" },
    dependencies: { blockedBy, blocks, relatedTo: [] },
  };
}

describe("computeDagLayout", () => {
  it("returns empty layout for empty input", () => {
    const { nodes, edges } = computeDagLayout([]);
    expect(nodes).toEqual([]);
    expect(edges).toEqual([]);
  });

  it("places a single node at origin", () => {
    const { nodes, edges } = computeDagLayout([makeReq("req-000001")]);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].x).toBe(0);
    expect(nodes[0].y).toBe(0);
    expect(edges).toHaveLength(0);
  });

  it("places dependent node in a later column", () => {
    const reqs = [
      makeReq("req-000001"),
      makeReq("req-000002", ["req-000001"]),
    ];
    const { nodes, edges } = computeDagLayout(reqs);

    const node1 = nodes.find((n) => n.id === "req-000001")!;
    const node2 = nodes.find((n) => n.id === "req-000002")!;

    expect(node1.x).toBeLessThan(node2.x);
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({
      source: "req-000001",
      target: "req-000002",
    });
  });

  it("handles a chain of dependencies", () => {
    const reqs = [
      makeReq("req-000001"),
      makeReq("req-000002", ["req-000001"]),
      makeReq("req-000003", ["req-000002"]),
    ];
    const { nodes } = computeDagLayout(reqs);

    const n1 = nodes.find((n) => n.id === "req-000001")!;
    const n2 = nodes.find((n) => n.id === "req-000002")!;
    const n3 = nodes.find((n) => n.id === "req-000003")!;

    expect(n1.x).toBeLessThan(n2.x);
    expect(n2.x).toBeLessThan(n3.x);
  });

  it("places independent nodes in the same column", () => {
    const reqs = [makeReq("req-000001"), makeReq("req-000002")];
    const { nodes } = computeDagLayout(reqs);

    const n1 = nodes.find((n) => n.id === "req-000001")!;
    const n2 = nodes.find((n) => n.id === "req-000002")!;

    expect(n1.x).toBe(n2.x);
    expect(n1.y).not.toBe(n2.y);
  });

  it("ignores edges to non-existent requirements", () => {
    const reqs = [makeReq("req-000001", ["req-999999"])];
    const { nodes, edges } = computeDagLayout(reqs);

    expect(nodes).toHaveLength(1);
    expect(edges).toHaveLength(0);
  });

  it("uses longest path for depth calculation (diamond dependency)", () => {
    // A -> B -> D
    // A -> C -> D
    const reqs = [
      makeReq("req-000001"),
      makeReq("req-000002", ["req-000001"]),
      makeReq("req-000003", ["req-000001"]),
      makeReq("req-000004", ["req-000002", "req-000003"]),
    ];
    const { nodes } = computeDagLayout(reqs);

    const nA = nodes.find((n) => n.id === "req-000001")!;
    const nD = nodes.find((n) => n.id === "req-000004")!;

    // D should be 2 columns after A
    expect(nD.x).toBeGreaterThan(nA.x);
    // B and C should be at the same depth (1)
    const nB = nodes.find((n) => n.id === "req-000002")!;
    const nC = nodes.find((n) => n.id === "req-000003")!;
    expect(nB.x).toBe(nC.x);
  });

  it("preserves requirement metadata in layout nodes", () => {
    const req = makeReq("req-000001");
    req.status = "approved";
    req.priority = "high";
    const { nodes } = computeDagLayout([req]);

    expect(nodes[0]).toMatchObject({
      id: "req-000001",
      title: "Requirement req-000001",
      status: "approved",
      priority: "high",
    });
  });
});
