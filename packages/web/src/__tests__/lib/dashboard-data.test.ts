import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Requirement, Specification, TaskEntry, FeedbackEntry } from "@reqord/shared";

vi.mock("../../lib/data.js", () => ({
  getAllRequirements: vi.fn(),
}));

vi.mock("../../lib/specification-data.js", () => ({
  getAllSpecifications: vi.fn(),
}));

vi.mock("../../lib/tasks-data.js", () => ({
  loadTasksYaml: vi.fn(),
}));

vi.mock("../../lib/feedback-data.js", () => ({
  getAllFeedbacks: vi.fn().mockResolvedValue([]),
}));

const makeRequirement = (
  id: string,
  status: string,
  overrides: Partial<Requirement> = {},
): Requirement => ({
  id,
  title: `Req ${id}`,
  status: status as Requirement["status"],
  priority: "high",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  version: "1.0.0",
  versionHistory: [],
  files: {
    description: `requirements/${id}/description.md`,
    supplementary: [],
  },
  successCriteria: [],
  format: { type: "free-form" },
  dependencies: { blockedBy: [], blocks: [], relatedTo: [] },
  ...overrides,
});

const makeSpecification = (
  id: string,
  requirementId: string,
  status: string,
  overrides: Partial<Specification> = {},
): Specification => ({
  id,
  requirementId,
  status: status as Specification["status"],
  version: "1.0.0",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  versionHistory: [],
  files: {
    design: `specifications/${id}/design.md`,
    supplementary: [],
  },
  ...overrides,
});

const makeTaskEntry = (
  number: number,
  status: "open" | "closed",
  specIds: string[] = [],
  estimatedHours = 4,
): TaskEntry => ({
  number,
  title: `Issue ${number}`,
  url: `https://github.com/owner/repo/issues/${number}`,
  linkedTo: { specifications: specIds },
  priority: "P1",
  status,
  estimatedHours,
  syncedAt: "2026-01-01T00:00:00Z",
});

describe("dashboard-data", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe("getDashboardData", () => {
    it("aggregates requirements, specifications, and issues from tasks.yaml correctly", async () => {
      const { getAllRequirements } = await import("../../lib/data.js");
      const { getAllSpecifications } = await import("../../lib/specification-data.js");
      const { loadTasksYaml } = await import("../../lib/tasks-data.js");
      const { getAllFeedbacks } = await import("../../lib/feedback-data.js");
      const { getDashboardData } = await import("../../lib/dashboard-data.js");

      vi.mocked(getAllFeedbacks).mockResolvedValue([]);
      vi.mocked(getAllRequirements).mockResolvedValue([
        makeRequirement("req-000001", "approved"),
        makeRequirement("req-000002", "implemented"),
        makeRequirement("req-000003", "draft"),
      ]);
      vi.mocked(getAllSpecifications).mockResolvedValue([
        makeSpecification("spec-000001", "req-000001", "approved"),
        makeSpecification("spec-000002", "req-000002", "draft"),
      ]);
      vi.mocked(loadTasksYaml).mockResolvedValue({
        title: "Tasks",
        tasks: [
          makeTaskEntry(1, "closed", ["spec-000001"]),
          makeTaskEntry(2, "open", ["spec-000001"]),
        ],
      });

      const result = await getDashboardData();

      expect(result.requirements.total).toBe(3);
      expect(result.requirements.breakdown).toEqual({ approved: 1, implemented: 1, draft: 1 });
      expect(result.requirements.approvalRate).toBeCloseTo(0.6667, 3);
      expect(result.specifications.total).toBe(2);
      expect(result.specifications.breakdown).toEqual({ approved: 1, draft: 1 });
      expect(result.specifications.approvalRate).toBe(0.5);
      expect(result.issues.total).toBe(2);
      expect(result.issues.completed).toBe(1);
      expect(result.issues.completionRate).toBe(0.5);
    });

    it("handles zero requirements correctly", async () => {
      const { getAllRequirements } = await import("../../lib/data.js");
      const { getAllSpecifications } = await import("../../lib/specification-data.js");
      const { loadTasksYaml } = await import("../../lib/tasks-data.js");
      const { getAllFeedbacks } = await import("../../lib/feedback-data.js");
      const { getDashboardData } = await import("../../lib/dashboard-data.js");

      vi.mocked(getAllFeedbacks).mockResolvedValue([]);
      vi.mocked(getAllRequirements).mockResolvedValue([]);
      vi.mocked(getAllSpecifications).mockResolvedValue([]);
      vi.mocked(loadTasksYaml).mockResolvedValue({ title: "Tasks", tasks: [] });

      const result = await getDashboardData();

      expect(result.requirements.total).toBe(0);
      expect(result.requirements.approvalRate).toBe(0);
      expect(result.specifications.total).toBe(0);
      expect(result.specifications.approvalRate).toBe(0);
      expect(result.issues.total).toBe(0);
      expect(result.issues.completionRate).toBe(0);
    });

    it("handles tasks.yaml with no tasks (empty tasks array)", async () => {
      const { getAllRequirements } = await import("../../lib/data.js");
      const { getAllSpecifications } = await import("../../lib/specification-data.js");
      const { loadTasksYaml } = await import("../../lib/tasks-data.js");
      const { getAllFeedbacks } = await import("../../lib/feedback-data.js");
      const { getDashboardData } = await import("../../lib/dashboard-data.js");

      vi.mocked(getAllFeedbacks).mockResolvedValue([]);
      vi.mocked(getAllRequirements).mockResolvedValue([makeRequirement("req-000001", "approved")]);
      vi.mocked(getAllSpecifications).mockResolvedValue([makeSpecification("spec-000001", "req-000001", "approved")]);
      vi.mocked(loadTasksYaml).mockResolvedValue({ title: "Tasks", tasks: [] });

      const result = await getDashboardData();

      expect(result.issues.total).toBe(0);
      expect(result.issues.completed).toBe(0);
      expect(result.issues.completionRate).toBe(0);
    });

    it("calculates health score correctly", async () => {
      const { getAllRequirements } = await import("../../lib/data.js");
      const { getAllSpecifications } = await import("../../lib/specification-data.js");
      const { loadTasksYaml } = await import("../../lib/tasks-data.js");
      const { getAllFeedbacks } = await import("../../lib/feedback-data.js");
      const { getDashboardData } = await import("../../lib/dashboard-data.js");

      vi.mocked(getAllFeedbacks).mockResolvedValue([]);
      vi.mocked(getAllRequirements).mockResolvedValue([makeRequirement("req-000001", "approved")]);
      vi.mocked(getAllSpecifications).mockResolvedValue([
        makeSpecification("spec-000001", "req-000001", "approved"),
        makeSpecification("spec-000002", "req-000001", "draft"),
      ]);
      vi.mocked(loadTasksYaml).mockResolvedValue({
        title: "Tasks",
        tasks: [
          makeTaskEntry(1, "open", ["spec-000001"]),
          makeTaskEntry(2, "open", ["spec-000001"]),
        ],
      });

      const result = await getDashboardData();

      // Health = 1.0 * 40 + 0.5 * 30 + 0.0 * 30 = 55
      expect(result.healthScore).toBe(55);
    });
  });

  describe("detectWarnings", () => {
    it("detects missing specification warnings", async () => {
      const { getAllFeedbacks } = await import("../../lib/feedback-data.js");
      vi.mocked(getAllFeedbacks).mockResolvedValue([]);
      const { detectWarnings } = await import("../../lib/dashboard-data.js");
      const warnings = await detectWarnings([makeRequirement("req-000001", "approved")], []);
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toEqual({
        type: "missing_specification",
        message: "Requirement req-000001 has no specification",
        severity: "warning",
        relatedId: "req-000001",
      });
    });

    it("does not warn for draft requirements without specifications", async () => {
      const { getAllFeedbacks } = await import("../../lib/feedback-data.js");
      vi.mocked(getAllFeedbacks).mockResolvedValue([]);
      const { detectWarnings } = await import("../../lib/dashboard-data.js");
      const warnings = await detectWarnings([makeRequirement("req-000001", "draft")], []);
      expect(warnings).toHaveLength(0);
    });

    it("detects unapproved dependency warnings", async () => {
      const { getAllFeedbacks } = await import("../../lib/feedback-data.js");
      vi.mocked(getAllFeedbacks).mockResolvedValue([]);
      const { detectWarnings } = await import("../../lib/dashboard-data.js");
      const warnings = await detectWarnings(
        [
          makeRequirement("req-000001", "draft"),
          makeRequirement("req-000002", "approved", {
            dependencies: { blockedBy: ["req-000001"], blocks: [], relatedTo: [] },
          }),
        ],
        [makeSpecification("spec-000002", "req-000002", "approved")]
      );
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toEqual({
        type: "unapproved_dependency",
        message: "Requirement req-000002 is blocked by unapproved requirement req-000001",
        severity: "warning",
        relatedId: "req-000002",
      });
    });

    it("detects design verification error warnings from critical unresolved feedback", async () => {
      const { getAllFeedbacks } = await import("../../lib/feedback-data.js");
      const criticalFeedback: FeedbackEntry = {
        githubIssue: 123,
        type: "bug",
        severity: "critical",
        linkedTo: {
          requirements: [],
          createdRequirements: [],
          specifications: ["spec-000001"],
          createdSpecifications: [],
        },
        syncedAt: "2026-01-02T00:00:00Z",
        status: "open",
      };
      vi.mocked(getAllFeedbacks).mockResolvedValue([criticalFeedback]);
      const { detectWarnings } = await import("../../lib/dashboard-data.js");
      const warnings = await detectWarnings(
        [],
        [makeSpecification("spec-000001", "req-000001", "draft")]
      );
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toEqual({
        type: "design_verification_error",
        message: "Specification spec-000001 has critical/high unresolved feedback requiring attention",
        severity: "error",
        relatedId: "spec-000001",
      });
    });

    it("returns empty array when no warnings detected", async () => {
      const { getAllFeedbacks } = await import("../../lib/feedback-data.js");
      vi.mocked(getAllFeedbacks).mockResolvedValue([]);
      const { detectWarnings } = await import("../../lib/dashboard-data.js");
      const warnings = await detectWarnings(
        [makeRequirement("req-000001", "approved")],
        [makeSpecification("spec-000001", "req-000001", "approved")]
      );
      expect(warnings).toEqual([]);
    });
  });

  describe("groupByStatus", () => {
    it("counts items by status correctly", async () => {
      const { groupByStatus } = await import("../../lib/dashboard-data.js");
      const result = groupByStatus([
        { status: "draft" }, { status: "approved" }, { status: "draft" },
        { status: "implemented" }, { status: "approved" }, { status: "approved" },
      ]);
      expect(result).toEqual({ draft: 2, approved: 3, implemented: 1 });
    });

    it("returns empty object for empty array", async () => {
      const { groupByStatus } = await import("../../lib/dashboard-data.js");
      expect(groupByStatus([])).toEqual({});
    });
  });

  describe("extractCriticalPath", () => {
    it("extracts tasks from tasks.yaml entries", async () => {
      const { extractCriticalPath } = await import("../../lib/dashboard-data.js");
      const tasks: TaskEntry[] = [
        makeTaskEntry(1, "open", ["spec-000001"], 10),
        makeTaskEntry(2, "closed", ["spec-000001"], 10),
        makeTaskEntry(3, "open", ["spec-000002"], 5),
      ];
      const result = extractCriticalPath(tasks);
      expect(result).toHaveLength(3);
      expect(result![0]).toEqual({
        issueNumber: 1, title: "Issue 1",
        url: "https://github.com/owner/repo/issues/1",
        priority: "P1", status: "open", estimatedHours: 10, specId: "spec-000001",
      });
      expect(result![1]).toEqual({
        issueNumber: 2, title: "Issue 2",
        url: "https://github.com/owner/repo/issues/2",
        priority: "P1", status: "closed", estimatedHours: 10, specId: "spec-000001",
      });
      expect(result![2]).toEqual({
        issueNumber: 3, title: "Issue 3",
        url: "https://github.com/owner/repo/issues/3",
        priority: "P1", status: "open", estimatedHours: 5, specId: "spec-000002",
      });
    });

    it("uses empty string for specId when task has no linked specifications", async () => {
      const { extractCriticalPath } = await import("../../lib/dashboard-data.js");
      const result = extractCriticalPath([makeTaskEntry(1, "open", [], 4)]);
      expect(result).toHaveLength(1);
      expect(result![0].specId).toBe("");
    });

    it("returns null when no tasks exist", async () => {
      const { extractCriticalPath } = await import("../../lib/dashboard-data.js");
      expect(extractCriticalPath([])).toBeNull();
    });
  });
});
