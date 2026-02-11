import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Requirement, Specification } from "@reqord/shared";

// Mock the data modules before importing
vi.mock("../../lib/data.js", () => ({
  getAllRequirements: vi.fn(),
}));

vi.mock("../../lib/specification-data.js", () => ({
  getAllSpecifications: vi.fn(),
}));

describe("dashboard-data", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe("getDashboardData", () => {
    it("aggregates requirements, specifications, and issues correctly", async () => {
      const { getAllRequirements } = await import("../../lib/data.js");
      const { getAllSpecifications } = await import(
        "../../lib/specification-data.js"
      );
      const { getDashboardData } = await import("../../lib/dashboard-data.js");

      const mockRequirements: Requirement[] = [
        {
          id: "req-000001",
          title: "Req 1",
          status: "approved",
          priority: "high",
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
          version: "1.0.0",
          versionHistory: [],
          files: {
            description: "requirements/req-000001/description.md",
            supplementary: [],
          },
          successCriteria: [],
          format: { type: "free-form" },
          dependencies: {
            blockedBy: [],
            blocks: [],
            relatedTo: [],
          },
          flags: [],
        },
        {
          id: "req-000002",
          title: "Req 2",
          status: "implemented",
          priority: "medium",
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
          version: "1.0.0",
          versionHistory: [],
          files: {
            description: "requirements/req-000002/description.md",
            supplementary: [],
          },
          successCriteria: [],
          format: { type: "free-form" },
          dependencies: {
            blockedBy: [],
            blocks: [],
            relatedTo: [],
          },
          flags: [],
        },
        {
          id: "req-000003",
          title: "Req 3",
          status: "draft",
          priority: "low",
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
          version: "1.0.0",
          versionHistory: [],
          files: {
            description: "requirements/req-000003/description.md",
            supplementary: [],
          },
          successCriteria: [],
          format: { type: "free-form" },
          dependencies: {
            blockedBy: [],
            blocks: [],
            relatedTo: [],
          },
          flags: [],
        },
      ];

      const mockSpecifications: Specification[] = [
        {
          id: "spec-000001",
          requirementId: "req-000001",
          status: "approved",
          version: "1.0.0",
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
          versionHistory: [],
          files: {
            design: "specifications/spec-000001/design.md",
            supplementary: [],
          },
          flags: [],
          implementation: {
            issues: [
              {
                number: 1,
                title: "Issue 1",
                url: "https://github.com/owner/repo/issues/1",
                priority: "P0",
                status: "closed",
              },
              {
                number: 2,
                title: "Issue 2",
                url: "https://github.com/owner/repo/issues/2",
                priority: "P1",
                status: "open",
              },
            ],
            totalEstimatedHours: 10,
            createdAt: "2026-01-01T00:00:00Z",
          },
        },
        {
          id: "spec-000002",
          requirementId: "req-000002",
          status: "draft",
          version: "1.0.0",
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
          versionHistory: [],
          files: {
            design: "specifications/spec-000002/design.md",
            supplementary: [],
          },
          flags: [],
        },
      ];

      vi.mocked(getAllRequirements).mockResolvedValue(mockRequirements);
      vi.mocked(getAllSpecifications).mockResolvedValue(mockSpecifications);

      const result = await getDashboardData();

      expect(result.requirements.total).toBe(3);
      expect(result.requirements.breakdown).toEqual({
        approved: 1,
        implemented: 1,
        draft: 1,
      });
      expect(result.requirements.approvalRate).toBeCloseTo(0.6667, 3);

      expect(result.specifications.total).toBe(2);
      expect(result.specifications.breakdown).toEqual({
        approved: 1,
        draft: 1,
      });
      expect(result.specifications.approvalRate).toBe(0.5);

      expect(result.issues.total).toBe(2);
      expect(result.issues.completed).toBe(1);
      expect(result.issues.completionRate).toBe(0.5);
    });

    it("handles zero requirements correctly", async () => {
      const { getAllRequirements } = await import("../../lib/data.js");
      const { getAllSpecifications } = await import(
        "../../lib/specification-data.js"
      );
      const { getDashboardData } = await import("../../lib/dashboard-data.js");

      vi.mocked(getAllRequirements).mockResolvedValue([]);
      vi.mocked(getAllSpecifications).mockResolvedValue([]);

      const result = await getDashboardData();

      expect(result.requirements.total).toBe(0);
      expect(result.requirements.approvalRate).toBe(0);
      expect(result.specifications.total).toBe(0);
      expect(result.specifications.approvalRate).toBe(0);
      expect(result.issues.total).toBe(0);
      expect(result.issues.completionRate).toBe(0);
    });

    it("handles specifications without implementation field", async () => {
      const { getAllRequirements } = await import("../../lib/data.js");
      const { getAllSpecifications } = await import(
        "../../lib/specification-data.js"
      );
      const { getDashboardData } = await import("../../lib/dashboard-data.js");

      const mockRequirements: Requirement[] = [
        {
          id: "req-000001",
          title: "Req 1",
          status: "approved",
          priority: "high",
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
          version: "1.0.0",
          versionHistory: [],
          files: {
            description: "requirements/req-000001/description.md",
            supplementary: [],
          },
          successCriteria: [],
          format: { type: "free-form" },
          dependencies: {
            blockedBy: [],
            blocks: [],
            relatedTo: [],
          },
          flags: [],
        },
      ];

      const mockSpecifications: Specification[] = [
        {
          id: "spec-000001",
          requirementId: "req-000001",
          status: "approved",
          version: "1.0.0",
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
          versionHistory: [],
          files: {
            design: "specifications/spec-000001/design.md",
            supplementary: [],
          },
          flags: [],
        },
      ];

      vi.mocked(getAllRequirements).mockResolvedValue(mockRequirements);
      vi.mocked(getAllSpecifications).mockResolvedValue(mockSpecifications);

      const result = await getDashboardData();

      expect(result.issues.total).toBe(0);
      expect(result.issues.completed).toBe(0);
      expect(result.issues.completionRate).toBe(0);
    });

    it("calculates health score correctly", async () => {
      const { getAllRequirements } = await import("../../lib/data.js");
      const { getAllSpecifications } = await import(
        "../../lib/specification-data.js"
      );
      const { getDashboardData } = await import("../../lib/dashboard-data.js");

      // req: 100% (1/1 approved), spec: 50% (1/2 approved), issues: 0% (0/2 completed)
      const mockRequirements: Requirement[] = [
        {
          id: "req-000001",
          title: "Req 1",
          status: "approved",
          priority: "high",
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
          version: "1.0.0",
          versionHistory: [],
          files: {
            description: "requirements/req-000001/description.md",
            supplementary: [],
          },
          successCriteria: [],
          format: { type: "free-form" },
          dependencies: {
            blockedBy: [],
            blocks: [],
            relatedTo: [],
          },
          flags: [],
        },
      ];

      const mockSpecifications: Specification[] = [
        {
          id: "spec-000001",
          requirementId: "req-000001",
          status: "approved",
          version: "1.0.0",
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
          versionHistory: [],
          files: {
            design: "specifications/spec-000001/design.md",
            supplementary: [],
          },
          flags: [],
          implementation: {
            issues: [
              {
                number: 1,
                title: "Issue 1",
                url: "https://github.com/owner/repo/issues/1",
                priority: "P0",
                status: "open",
              },
              {
                number: 2,
                title: "Issue 2",
                url: "https://github.com/owner/repo/issues/2",
                priority: "P1",
                status: "open",
              },
            ],
            totalEstimatedHours: 10,
            createdAt: "2026-01-01T00:00:00Z",
          },
        },
        {
          id: "spec-000002",
          requirementId: "req-000001",
          status: "draft",
          version: "1.0.0",
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
          versionHistory: [],
          files: {
            design: "specifications/spec-000002/design.md",
            supplementary: [],
          },
          flags: [],
        },
      ];

      vi.mocked(getAllRequirements).mockResolvedValue(mockRequirements);
      vi.mocked(getAllSpecifications).mockResolvedValue(mockSpecifications);

      const result = await getDashboardData();

      // Health = 1.0 * 40 + 0.5 * 30 + 0.0 * 30 = 40 + 15 + 0 = 55
      expect(result.healthScore).toBe(55);
    });
  });

  describe("detectWarnings", () => {
    it("detects missing specification warnings", async () => {
      const { detectWarnings } = await import("../../lib/dashboard-data.js");

      const requirements: Requirement[] = [
        {
          id: "req-000001",
          title: "Req without spec",
          status: "approved",
          priority: "high",
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
          version: "1.0.0",
          versionHistory: [],
          files: {
            description: "requirements/req-000001/description.md",
            supplementary: [],
          },
          successCriteria: [],
          format: { type: "free-form" },
          dependencies: {
            blockedBy: [],
            blocks: [],
            relatedTo: [],
          },
          flags: [],
        },
      ];

      const specifications: Specification[] = [];

      const warnings = detectWarnings(requirements, specifications);

      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toEqual({
        type: "missing_specification",
        message: "Requirement req-000001 has no specification",
        severity: "warning",
        relatedId: "req-000001",
      });
    });

    it("does not warn for draft requirements without specifications", async () => {
      const { detectWarnings } = await import("../../lib/dashboard-data.js");

      const requirements: Requirement[] = [
        {
          id: "req-000001",
          title: "Draft req",
          status: "draft",
          priority: "high",
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
          version: "1.0.0",
          versionHistory: [],
          files: {
            description: "requirements/req-000001/description.md",
            supplementary: [],
          },
          successCriteria: [],
          format: { type: "free-form" },
          dependencies: {
            blockedBy: [],
            blocks: [],
            relatedTo: [],
          },
          flags: [],
        },
      ];

      const specifications: Specification[] = [];

      const warnings = detectWarnings(requirements, specifications);

      expect(warnings).toHaveLength(0);
    });

    it("detects unapproved dependency warnings", async () => {
      const { detectWarnings } = await import("../../lib/dashboard-data.js");

      const requirements: Requirement[] = [
        {
          id: "req-000001",
          title: "Req 1",
          status: "draft",
          priority: "high",
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
          version: "1.0.0",
          versionHistory: [],
          files: {
            description: "requirements/req-000001/description.md",
            supplementary: [],
          },
          successCriteria: [],
          format: { type: "free-form" },
          dependencies: {
            blockedBy: [],
            blocks: [],
            relatedTo: [],
          },
          flags: [],
        },
        {
          id: "req-000002",
          title: "Req 2",
          status: "approved",
          priority: "medium",
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
          version: "1.0.0",
          versionHistory: [],
          files: {
            description: "requirements/req-000002/description.md",
            supplementary: [],
          },
          successCriteria: [],
          format: { type: "free-form" },
          dependencies: {
            blockedBy: ["req-000001"],
            blocks: [],
            relatedTo: [],
          },
          flags: [],
        },
      ];

      const specifications: Specification[] = [
        {
          id: "spec-000002",
          requirementId: "req-000002",
          status: "approved",
          version: "1.0.0",
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
          versionHistory: [],
          files: {
            design: "specifications/spec-000002/design.md",
            supplementary: [],
          },
          flags: [],
        },
      ];

      const warnings = detectWarnings(requirements, specifications);

      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toEqual({
        type: "unapproved_dependency",
        message:
          "Requirement req-000002 is blocked by unapproved requirement req-000001",
        severity: "warning",
        relatedId: "req-000002",
      });
    });

    it("detects design verification error warnings", async () => {
      const { detectWarnings } = await import("../../lib/dashboard-data.js");

      const requirements: Requirement[] = [];

      const specifications: Specification[] = [
        {
          id: "spec-000001",
          requirementId: "req-000001",
          status: "draft",
          version: "1.0.0",
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
          versionHistory: [],
          files: {
            design: "specifications/spec-000001/design.md",
            supplementary: [],
          },
          flags: [
            {
              type: "feedback-review",
              reason: "Critical design issue",
              createdAt: "2026-01-02T00:00:00Z",
              relatedIssues: [123],
              severity: "critical",
            },
          ],
        },
      ];

      const warnings = detectWarnings(requirements, specifications);

      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toEqual({
        type: "design_verification_error",
        message:
          "Specification spec-000001 has critical feedback flags requiring attention",
        severity: "error",
        relatedId: "spec-000001",
      });
    });

    it("returns empty array when no warnings detected", async () => {
      const { detectWarnings } = await import("../../lib/dashboard-data.js");

      const requirements: Requirement[] = [
        {
          id: "req-000001",
          title: "Req 1",
          status: "approved",
          priority: "high",
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
          version: "1.0.0",
          versionHistory: [],
          files: {
            description: "requirements/req-000001/description.md",
            supplementary: [],
          },
          successCriteria: [],
          format: { type: "free-form" },
          dependencies: {
            blockedBy: [],
            blocks: [],
            relatedTo: [],
          },
          flags: [],
        },
      ];

      const specifications: Specification[] = [
        {
          id: "spec-000001",
          requirementId: "req-000001",
          status: "approved",
          version: "1.0.0",
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
          versionHistory: [],
          files: {
            design: "specifications/spec-000001/design.md",
            supplementary: [],
          },
          flags: [],
        },
      ];

      const warnings = detectWarnings(requirements, specifications);

      expect(warnings).toEqual([]);
    });
  });

  describe("groupByStatus", () => {
    it("counts items by status correctly", async () => {
      const { groupByStatus } = await import("../../lib/dashboard-data.js");

      const items = [
        { status: "draft" },
        { status: "approved" },
        { status: "draft" },
        { status: "implemented" },
        { status: "approved" },
        { status: "approved" },
      ];

      const result = groupByStatus(items);

      expect(result).toEqual({
        draft: 2,
        approved: 3,
        implemented: 1,
      });
    });

    it("returns empty object for empty array", async () => {
      const { groupByStatus } = await import("../../lib/dashboard-data.js");

      const result = groupByStatus([]);

      expect(result).toEqual({});
    });
  });

  describe("extractCriticalPath", () => {
    it("extracts tasks from implementation issues", async () => {
      const { extractCriticalPath } = await import(
        "../../lib/dashboard-data.js"
      );

      const specifications: Specification[] = [
        {
          id: "spec-000001",
          requirementId: "req-000001",
          status: "approved",
          version: "1.0.0",
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
          versionHistory: [],
          files: {
            design: "specifications/spec-000001/design.md",
            supplementary: [],
          },
          flags: [],
          implementation: {
            issues: [
              {
                number: 1,
                title: "Issue 1",
                url: "https://github.com/owner/repo/issues/1",
                priority: "P0",
                status: "open",
              },
              {
                number: 2,
                title: "Issue 2",
                url: "https://github.com/owner/repo/issues/2",
                priority: "P1",
                status: "closed",
              },
            ],
            totalEstimatedHours: 10,
            createdAt: "2026-01-01T00:00:00Z",
          },
        },
        {
          id: "spec-000002",
          requirementId: "req-000002",
          status: "draft",
          version: "1.0.0",
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
          versionHistory: [],
          files: {
            design: "specifications/spec-000002/design.md",
            supplementary: [],
          },
          flags: [],
          implementation: {
            issues: [
              {
                number: 3,
                title: "Issue 3",
                url: "https://github.com/owner/repo/issues/3",
                priority: "P2",
                status: "in_progress",
              },
            ],
            totalEstimatedHours: 5,
            createdAt: "2026-01-01T00:00:00Z",
          },
        },
      ];

      const result = extractCriticalPath(specifications);

      expect(result).toHaveLength(3);
      expect(result![0]).toEqual({
        issueNumber: 1,
        title: "Issue 1",
        url: "https://github.com/owner/repo/issues/1",
        priority: "P0",
        status: "open",
        estimatedHours: 10,
        specId: "spec-000001",
      });
      expect(result![1]).toEqual({
        issueNumber: 2,
        title: "Issue 2",
        url: "https://github.com/owner/repo/issues/2",
        priority: "P1",
        status: "closed",
        estimatedHours: 10,
        specId: "spec-000001",
      });
      expect(result![2]).toEqual({
        issueNumber: 3,
        title: "Issue 3",
        url: "https://github.com/owner/repo/issues/3",
        priority: "P2",
        status: "in_progress",
        estimatedHours: 5,
        specId: "spec-000002",
      });
    });

    it("returns null when no implementations exist", async () => {
      const { extractCriticalPath } = await import(
        "../../lib/dashboard-data.js"
      );

      const specifications: Specification[] = [
        {
          id: "spec-000001",
          requirementId: "req-000001",
          status: "draft",
          version: "1.0.0",
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
          versionHistory: [],
          files: {
            design: "specifications/spec-000001/design.md",
            supplementary: [],
          },
          flags: [],
        },
      ];

      const result = extractCriticalPath(specifications);

      expect(result).toBeNull();
    });

    it("returns null for empty specifications array", async () => {
      const { extractCriticalPath } = await import(
        "../../lib/dashboard-data.js"
      );

      const result = extractCriticalPath([]);

      expect(result).toBeNull();
    });
  });
});
