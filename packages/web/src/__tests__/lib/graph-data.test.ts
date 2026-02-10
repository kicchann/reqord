import { describe, it, expect } from "vitest";
import type { Requirement, Specification } from "@reqord/shared";
import {
  buildMultiLevelGraphData,
  type MultiLevelGraphData,
  type MultiLevelNode,
  type MultiLevelEdge,
} from "../../lib/graph-data.js";

// Test helpers
function makeReq(
  id: string,
  overrides: Partial<Requirement> = {},
): Requirement {
  return {
    id,
    version: "1.0.0",
    title: `Requirement ${id}`,
    status: "draft",
    priority: "medium",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    versionHistory: [],
    files: {
      description: `requirements/${id}/description.md`,
      supplementary: [],
    },
    successCriteria: [],
    format: { type: "free-form" },
    dependencies: { blockedBy: [], blocks: [], relatedTo: [] },
    flags: [],
    ...overrides,
  } as Requirement;
}

function makeSpec(
  id: string,
  reqId: string,
  overrides: Partial<Specification> = {},
): Specification {
  return {
    id,
    requirementId: reqId,
    version: "1.0.0",
    status: "draft",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    versionHistory: [],
    files: { design: `specifications/${id}/design.md`, supplementary: [] },
    flags: [],
    ...overrides,
  } as Specification;
}

describe("buildMultiLevelGraphData", () => {
  describe("empty inputs", () => {
    it("returns empty nodes and edges when both arrays are empty", () => {
      const result = buildMultiLevelGraphData([], []);

      expect(result.nodes).toEqual([]);
      expect(result.edges).toEqual([]);
    });
  });

  describe("requirements only", () => {
    it("creates requirement nodes without specification or issue nodes", () => {
      const req1 = makeReq("req-000001");
      const req2 = makeReq("req-000002");

      const result = buildMultiLevelGraphData([req1, req2], []);

      expect(result.nodes).toHaveLength(2);
      expect(result.nodes[0]).toMatchObject({
        id: "req-000001",
        type: "requirement",
        data: {
          label: "Requirement req-000001",
          status: "draft",
          priority: "medium",
        },
        position: { x: 0, y: 0 },
      });
      expect(result.nodes[1]).toMatchObject({
        id: "req-000002",
        type: "requirement",
        position: { x: 0, y: 120 },
      });
      expect(result.edges).toEqual([]);
    });

    it("creates dependency edges from blockedBy relationships", () => {
      const req1 = makeReq("req-000001");
      const req2 = makeReq("req-000002", {
        dependencies: { blockedBy: ["req-000001"], blocks: [], relatedTo: [] },
      });

      const result = buildMultiLevelGraphData([req1, req2], []);

      expect(result.edges).toHaveLength(1);
      expect(result.edges[0]).toMatchObject({
        id: "dep-req-000001-req-000002",
        source: "req-000001",
        target: "req-000002",
        type: "dependency",
      });
    });
  });

  describe("requirements and specifications", () => {
    it("creates specification nodes at center column", () => {
      const req1 = makeReq("req-000001");
      const spec1 = makeSpec("spec-000001", "req-000001");

      const result = buildMultiLevelGraphData([req1], [spec1]);

      const specNode = result.nodes.find((n) => n.type === "specification");
      expect(specNode).toMatchObject({
        id: "spec-000001",
        type: "specification",
        data: {
          label: "spec-000001",
          status: "draft",
        },
        position: { x: 400, y: 0 },
      });
    });

    it("creates implements edge from specification to requirement", () => {
      const req1 = makeReq("req-000001");
      const spec1 = makeSpec("spec-000001", "req-000001");

      const result = buildMultiLevelGraphData([req1], [spec1]);

      const implementsEdge = result.edges.find((e) => e.type === "implements");
      expect(implementsEdge).toMatchObject({
        id: "impl-spec-000001-req-000001",
        source: "spec-000001",
        target: "req-000001",
        type: "implements",
      });
    });

    it("creates implements edge even when requirementId does not exist", () => {
      const spec1 = makeSpec("spec-000001", "req-999999");

      const result = buildMultiLevelGraphData([], [spec1]);

      expect(result.edges).toHaveLength(1);
      expect(result.edges[0]).toMatchObject({
        source: "spec-000001",
        target: "req-999999",
        type: "implements",
      });
    });

    it("creates multiple implements edges when multiple specs reference same requirement", () => {
      const req1 = makeReq("req-000001");
      const spec1 = makeSpec("spec-000001", "req-000001");
      const spec2 = makeSpec("spec-000002", "req-000001");

      const result = buildMultiLevelGraphData([req1], [spec1, spec2]);

      const implementsEdges = result.edges.filter((e) => e.type === "implements");
      expect(implementsEdges).toHaveLength(2);
      expect(implementsEdges[0].target).toBe("req-000001");
      expect(implementsEdges[1].target).toBe("req-000001");
    });
  });

  describe("requirements, specifications, and issues", () => {
    it("creates issue nodes at right column", () => {
      const req1 = makeReq("req-000001");
      const spec1 = makeSpec("spec-000001", "req-000001", {
        implementation: {
          issues: [
            {
              number: 123,
              title: "Implement feature X",
              url: "https://github.com/test/repo/issues/123",
              priority: "P1",
              status: "open",
            },
          ],
          totalEstimatedHours: 8,
          createdAt: "2026-01-01T00:00:00Z",
        },
      });

      const result = buildMultiLevelGraphData([req1], [spec1]);

      const issueNode = result.nodes.find((n) => n.type === "issue");
      expect(issueNode).toMatchObject({
        id: "issue-spec-000001-123",
        type: "issue",
        data: {
          label: "Issue #123",
          status: "open",
          priority: "P1",
          issueNumber: 123,
          issueUrl: "https://github.com/test/repo/issues/123",
        },
        position: { x: 800, y: 0 },
      });
    });

    it("creates tracks edge from issue to specification", () => {
      const req1 = makeReq("req-000001");
      const spec1 = makeSpec("spec-000001", "req-000001", {
        implementation: {
          issues: [
            {
              number: 123,
              title: "Implement feature X",
              url: "https://github.com/test/repo/issues/123",
              priority: "P1",
              status: "open",
            },
          ],
          totalEstimatedHours: 8,
          createdAt: "2026-01-01T00:00:00Z",
        },
      });

      const result = buildMultiLevelGraphData([req1], [spec1]);

      const tracksEdge = result.edges.find((e) => e.type === "tracks");
      expect(tracksEdge).toMatchObject({
        id: "track-issue-spec-000001-123-spec-000001",
        source: "issue-spec-000001-123",
        target: "spec-000001",
        type: "tracks",
      });
    });

    it("creates all three node types and three edge types correctly", () => {
      const req1 = makeReq("req-000001");
      const req2 = makeReq("req-000002", {
        dependencies: { blockedBy: ["req-000001"], blocks: [], relatedTo: [] },
      });
      const spec1 = makeSpec("spec-000001", "req-000002", {
        implementation: {
          issues: [
            {
              number: 123,
              title: "Implement feature X",
              url: "https://github.com/test/repo/issues/123",
              priority: "P1",
              status: "open",
            },
          ],
          totalEstimatedHours: 8,
          createdAt: "2026-01-01T00:00:00Z",
        },
      });

      const result = buildMultiLevelGraphData([req1, req2], [spec1]);

      // Verify node types
      const reqNodes = result.nodes.filter((n) => n.type === "requirement");
      const specNodes = result.nodes.filter((n) => n.type === "specification");
      const issueNodes = result.nodes.filter((n) => n.type === "issue");

      expect(reqNodes).toHaveLength(2);
      expect(specNodes).toHaveLength(1);
      expect(issueNodes).toHaveLength(1);

      // Verify edge types
      const depEdges = result.edges.filter((e) => e.type === "dependency");
      const implEdges = result.edges.filter((e) => e.type === "implements");
      const trackEdges = result.edges.filter((e) => e.type === "tracks");

      expect(depEdges).toHaveLength(1);
      expect(implEdges).toHaveLength(1);
      expect(trackEdges).toHaveLength(1);
    });

    it("does not create issue nodes or tracks edges when implementation field is missing", () => {
      const req1 = makeReq("req-000001");
      const spec1 = makeSpec("spec-000001", "req-000001");

      const result = buildMultiLevelGraphData([req1], [spec1]);

      const issueNodes = result.nodes.filter((n) => n.type === "issue");
      const trackEdges = result.edges.filter((e) => e.type === "tracks");

      expect(issueNodes).toHaveLength(0);
      expect(trackEdges).toHaveLength(0);
    });

    it("positions multiple issues vertically with offset", () => {
      const req1 = makeReq("req-000001");
      const spec1 = makeSpec("spec-000001", "req-000001", {
        implementation: {
          issues: [
            {
              number: 123,
              title: "Issue 1",
              url: "https://github.com/test/repo/issues/123",
              priority: "P1",
              status: "open",
            },
            {
              number: 124,
              title: "Issue 2",
              url: "https://github.com/test/repo/issues/124",
              priority: "P2",
              status: "open",
            },
          ],
          totalEstimatedHours: 16,
          createdAt: "2026-01-01T00:00:00Z",
        },
      });

      const result = buildMultiLevelGraphData([req1], [spec1]);

      const issueNodes = result.nodes.filter((n) => n.type === "issue");
      expect(issueNodes).toHaveLength(2);
      expect(issueNodes[0].position).toEqual({ x: 800, y: 0 });
      expect(issueNodes[1].position).toEqual({ x: 800, y: 80 });
    });
  });

  describe("node positioning", () => {
    it("positions requirement nodes at x=0", () => {
      const req1 = makeReq("req-000001");
      const req2 = makeReq("req-000002");

      const result = buildMultiLevelGraphData([req1, req2], []);

      expect(result.nodes[0].position.x).toBe(0);
      expect(result.nodes[1].position.x).toBe(0);
    });

    it("positions specification nodes at x=400", () => {
      const req1 = makeReq("req-000001");
      const spec1 = makeSpec("spec-000001", "req-000001");
      const spec2 = makeSpec("spec-000002", "req-000001");

      const result = buildMultiLevelGraphData([req1], [spec1, spec2]);

      const specNodes = result.nodes.filter((n) => n.type === "specification");
      expect(specNodes[0].position.x).toBe(400);
      expect(specNodes[1].position.x).toBe(400);
    });

    it("positions issue nodes at x=800", () => {
      const req1 = makeReq("req-000001");
      const spec1 = makeSpec("spec-000001", "req-000001", {
        implementation: {
          issues: [
            {
              number: 123,
              title: "Issue 1",
              url: "https://github.com/test/repo/issues/123",
              priority: "P1",
              status: "open",
            },
          ],
          totalEstimatedHours: 8,
          createdAt: "2026-01-01T00:00:00Z",
        },
      });

      const result = buildMultiLevelGraphData([req1], [spec1]);

      const issueNode = result.nodes.find((n) => n.type === "issue");
      expect(issueNode?.position.x).toBe(800);
    });
  });
});
