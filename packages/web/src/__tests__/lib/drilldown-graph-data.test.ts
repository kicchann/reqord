import { describe, it, expect } from "vitest";
import type { Requirement, Specification } from "@reqord/shared";
import { buildDrillDownGraphData } from "../../lib/drilldown-graph-data";
import { EDGE_STYLES } from "../../components/graph/edge-styles";

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

describe("buildDrillDownGraphData", () => {
  describe("requirement only (no specifications)", () => {
    it("returns a single requirement node at x=0, y=0 and no edges", () => {
      const req = makeReq("req-000001");

      const result = buildDrillDownGraphData(req, []);

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0]).toMatchObject({
        id: "req-000001",
        type: "requirement",
        position: { x: 0, y: 0 },
      });
      expect(result.edges).toHaveLength(0);
    });

    it("includes requirement data in the node matching RequirementNodeData", () => {
      const req = makeReq("req-000001", {
        title: "My Feature",
        status: "approved",
        priority: "high",
      });

      const result = buildDrillDownGraphData(req, []);

      expect(result.nodes[0].data).toMatchObject({
        label: "My Feature",
        status: "approved",
        priority: "high",
        specCount: 0,
      });
    });
  });

  describe("requirement with specifications", () => {
    it("creates 3 nodes and 2 implements edges for 2 specs", () => {
      const req = makeReq("req-000001");
      const spec1 = makeSpec("spec-000001", "req-000001");
      const spec2 = makeSpec("spec-000002", "req-000001");

      const result = buildDrillDownGraphData(req, [spec1, spec2]);

      expect(result.nodes).toHaveLength(3);
      expect(result.edges).toHaveLength(2);
    });

    it("positions spec nodes at x=400 with vertical gap of 120", () => {
      const req = makeReq("req-000001");
      const spec1 = makeSpec("spec-000001", "req-000001");
      const spec2 = makeSpec("spec-000002", "req-000001");

      const result = buildDrillDownGraphData(req, [spec1, spec2]);

      const specNodes = result.nodes.filter((n) => n.type === "specification");
      expect(specNodes[0].position).toEqual({ x: 400, y: 0 });
      expect(specNodes[1].position).toEqual({ x: 400, y: 120 });
    });

    it("creates implements edges from requirement to spec with correct style", () => {
      const req = makeReq("req-000001");
      const spec1 = makeSpec("spec-000001", "req-000001");

      const result = buildDrillDownGraphData(req, [spec1]);

      expect(result.edges[0]).toMatchObject({
        id: "impl-req-000001-spec-000001",
        source: "req-000001",
        target: "spec-000001",
        style: EDGE_STYLES.implements,
      });
    });

    it("includes spec data in specification nodes matching SpecificationNodeData", () => {
      const req = makeReq("req-000001");
      const spec1 = makeSpec("spec-000001", "req-000001", {
        status: "approved",
      });

      const result = buildDrillDownGraphData(req, [spec1]);

      const specNode = result.nodes.find((n) => n.type === "specification");
      expect(specNode?.data).toMatchObject({
        label: "spec-000001",
        status: "approved",
      });
    });
  });

  describe("requirement with specifications and issues", () => {
    it("creates issue nodes at x=800 with tracks edges", () => {
      const req = makeReq("req-000001");
      const spec1 = makeSpec("spec-000001", "req-000001", {
        implementation: {
          issues: [
            {
              number: 42,
              title: "Implement feature",
              url: "https://github.com/test/repo/issues/42",
              priority: "P1",
              status: "open",
            },
          ],
          totalEstimatedHours: 8,
          createdAt: "2026-01-01T00:00:00Z",
        },
      });

      const result = buildDrillDownGraphData(req, [spec1]);

      const issueNode = result.nodes.find((n) => n.type === "issue");
      expect(issueNode).toMatchObject({
        id: "issue-42",
        type: "issue",
        position: { x: 800, y: 0 },
      });
    });

    it("includes issue data in the node matching IssueNodeData", () => {
      const req = makeReq("req-000001");
      const spec1 = makeSpec("spec-000001", "req-000001", {
        implementation: {
          issues: [
            {
              number: 42,
              title: "Implement feature",
              url: "https://github.com/test/repo/issues/42",
              priority: "P1",
              status: "in_progress",
            },
          ],
          totalEstimatedHours: 8,
          createdAt: "2026-01-01T00:00:00Z",
        },
      });

      const result = buildDrillDownGraphData(req, [spec1]);

      const issueNode = result.nodes.find((n) => n.type === "issue");
      expect(issueNode?.data).toMatchObject({
        label: "Implement feature",
        status: "in_progress",
        issueNumber: 42,
        issueUrl: "https://github.com/test/repo/issues/42",
      });
    });

    it("creates tracks edges from spec to issue (source=spec, target=issue for handle compatibility)", () => {
      const req = makeReq("req-000001");
      const spec1 = makeSpec("spec-000001", "req-000001", {
        implementation: {
          issues: [
            {
              number: 42,
              title: "Implement feature",
              url: "https://github.com/test/repo/issues/42",
              priority: "P1",
              status: "open",
            },
          ],
          totalEstimatedHours: 8,
          createdAt: "2026-01-01T00:00:00Z",
        },
      });

      const result = buildDrillDownGraphData(req, [spec1]);

      const tracksEdge = result.edges.find((e) =>
        e.id.startsWith("track-"),
      );
      expect(tracksEdge).toMatchObject({
        id: "track-spec-000001-issue-42",
        source: "spec-000001",
        target: "issue-42",
        style: EDGE_STYLES.tracks,
      });
    });

    it("positions issues based on spec index and issue index", () => {
      const req = makeReq("req-000001");
      const spec1 = makeSpec("spec-000001", "req-000001", {
        implementation: {
          issues: [
            {
              number: 10,
              title: "Issue 1",
              url: "https://github.com/test/repo/issues/10",
              priority: "P1",
              status: "open",
            },
            {
              number: 11,
              title: "Issue 2",
              url: "https://github.com/test/repo/issues/11",
              priority: "P2",
              status: "open",
            },
          ],
          totalEstimatedHours: 16,
          createdAt: "2026-01-01T00:00:00Z",
        },
      });
      const spec2 = makeSpec("spec-000002", "req-000001", {
        implementation: {
          issues: [
            {
              number: 20,
              title: "Issue 3",
              url: "https://github.com/test/repo/issues/20",
              priority: "P0",
              status: "open",
            },
          ],
          totalEstimatedHours: 4,
          createdAt: "2026-01-01T00:00:00Z",
        },
      });

      const result = buildDrillDownGraphData(req, [spec1, spec2]);

      const issueNodes = result.nodes.filter((n) => n.type === "issue");
      expect(issueNodes).toHaveLength(3);
      // spec1 (index 0): issues at y = 0*120 + 0*80 = 0, y = 0*120 + 1*80 = 80
      expect(issueNodes[0].position).toEqual({ x: 800, y: 0 });
      expect(issueNodes[1].position).toEqual({ x: 800, y: 80 });
      // spec2 (index 1): issue at y = 1*120 + 0*80 = 120
      expect(issueNodes[2].position).toEqual({ x: 800, y: 120 });
    });

    it("does not create issue nodes when spec has no implementation", () => {
      const req = makeReq("req-000001");
      const spec1 = makeSpec("spec-000001", "req-000001");

      const result = buildDrillDownGraphData(req, [spec1]);

      const issueNodes = result.nodes.filter((n) => n.type === "issue");
      expect(issueNodes).toHaveLength(0);
      // Only the implements edge, no tracks edges
      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].id).toMatch(/^impl-/);
    });
  });
});
