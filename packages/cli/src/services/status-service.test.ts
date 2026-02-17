import { describe, it, expect } from "vitest";
import type { Requirement, Specification } from "@reqord/shared";
import {
  buildStatusSummary,
  buildIssueSummary,
  detectWarnings,
  renderProgressBar,
} from "./status-service.js";

function makeRequirement(overrides: Partial<Requirement> = {}): Requirement {
  return {
    id: "req-000001",
    version: "1.0",
    title: "テスト要件",
    status: "draft",
    priority: "medium",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    versionHistory: [],
    files: {
      description: "requirements/req-000001/description.md",
      supplementary: [],
    },
    successCriteria: [],
    format: { type: "free-form" },
    dependencies: { blockedBy: [], blocks: [], relatedTo: [] },
    flags: [],
    ...overrides,
  };
}

function makeSpecification(
  overrides: Partial<Specification> = {},
): Specification {
  return {
    id: "spec-000001",
    requirementId: "req-000001",
    version: "1.0",
    status: "draft",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    versionHistory: [],
    files: {
      design: "specifications/spec-000001/design.md",
      supplementary: [],
    },
    flags: [],
    ...overrides,
  };
}

describe("buildStatusSummary", () => {
  it("空配列の場合 total=0, implementedPercentage=0", () => {
    const result = buildStatusSummary([]);
    expect(result).toEqual({
      total: 0,
      byStatus: {},
      implementedPercentage: 0,
    });
  });

  it("全要件がdraftの場合 implementedPercentage=0", () => {
    const items = [{ status: "draft" }, { status: "draft" }, { status: "draft" }];
    const result = buildStatusSummary(items);
    expect(result.total).toBe(3);
    expect(result.byStatus).toEqual({ draft: 3 });
    expect(result.implementedPercentage).toBe(0);
  });

  it("全要件がimplementedの場合 implementedPercentage=100", () => {
    const items = [{ status: "implemented" }, { status: "implemented" }];
    const result = buildStatusSummary(items);
    expect(result.total).toBe(2);
    expect(result.implementedPercentage).toBe(100);
  });

  it("混在ステータスの集計が正確", () => {
    const items = [
      { status: "draft" },
      { status: "approved" },
      { status: "implemented" },
      { status: "implemented" },
      { status: "deprecated" },
    ];
    const result = buildStatusSummary(items);
    expect(result.total).toBe(5);
    expect(result.byStatus).toEqual({
      draft: 1,
      approved: 1,
      implemented: 2,
      deprecated: 1,
    });
    expect(result.implementedPercentage).toBe(40);
  });
});

describe("buildIssueSummary", () => {
  it("implementationが無いSpecificationはスキップ", () => {
    const specs = [makeSpecification()];
    const result = buildIssueSummary(specs);
    expect(result).toEqual({
      total: 0,
      closed: 0,
      open: 0,
      closedPercentage: 0,
    });
  });

  it("Issues集計が正確", () => {
    const specs = [
      makeSpecification({
        implementation: {
          issues: [
            {
              number: 1,
              title: "Issue 1",
              url: "https://example.com/1",
              priority: "P1",
              status: "closed",
            },
            {
              number: 2,
              title: "Issue 2",
              url: "https://example.com/2",
              priority: "P2",
              status: "open",
            },
            {
              number: 3,
              title: "Issue 3",
              url: "https://example.com/3",
              priority: "P2",
              status: "closed",
            },
          ],
          totalEstimatedHours: 10,
          createdAt: "2026-01-01T00:00:00Z",
        },
      }),
    ];
    const result = buildIssueSummary(specs);
    expect(result.total).toBe(3);
    expect(result.closed).toBe(2);
    expect(result.open).toBe(1);
    expect(result.closedPercentage).toBe(67);
  });

  it("in_progressステータスはopenとしてカウント", () => {
    const specs = [
      makeSpecification({
        implementation: {
          issues: [
            {
              number: 1,
              title: "Issue 1",
              url: "https://example.com/1",
              priority: "P1",
              status: "open",
            },
            {
              number: 2,
              title: "Issue 2",
              url: "https://example.com/2",
              priority: "P1",
              status: "in_progress",
            },
            {
              number: 3,
              title: "Issue 3",
              url: "https://example.com/3",
              priority: "P2",
              status: "closed",
            },
          ],
          totalEstimatedHours: 10,
          createdAt: "2026-01-01T00:00:00Z",
        },
      }),
    ];
    const result = buildIssueSummary(specs);
    expect(result.total).toBe(3);
    expect(result.closed).toBe(1);
    expect(result.open).toBe(2); // open + in_progress
    expect(result.closedPercentage).toBe(33);
  });
});

describe("detectWarnings", () => {
  it("Specificationが無い非draft要件に警告", () => {
    const reqs = [makeRequirement({ id: "req-000001", status: "approved" })];
    const specs: Specification[] = [];
    const warnings = detectWarnings(reqs, specs);
    expect(warnings).toContainEqual(
      expect.objectContaining({
        id: "req-000001",
        type: "no-specification",
      }),
    );
  });

  it("draft要件にはno-specification警告を出さない", () => {
    const reqs = [makeRequirement({ id: "req-000001", status: "draft" })];
    const specs: Specification[] = [];
    const warnings = detectWarnings(reqs, specs);
    expect(
      warnings.find(
        (w) => w.id === "req-000001" && w.type === "no-specification",
      ),
    ).toBeUndefined();
  });

  it("deprecated要件は警告対象外", () => {
    const reqs = [makeRequirement({ id: "req-000001", status: "deprecated" })];
    const specs: Specification[] = [];
    const warnings = detectWarnings(reqs, specs);
    expect(
      warnings.find((w) => w.id === "req-000001"),
    ).toBeUndefined();
  });

  it("未承認の依存先がある要件に警告", () => {
    const reqs = [
      makeRequirement({
        id: "req-000001",
        status: "approved",
        dependencies: { blockedBy: ["req-000002"], blocks: [], relatedTo: [] },
      }),
      makeRequirement({ id: "req-000002", status: "draft" }),
    ];
    const specs = [
      makeSpecification({ requirementId: "req-000001" }),
      makeSpecification({ id: "spec-000002", requirementId: "req-000002" }),
    ];
    const warnings = detectWarnings(reqs, specs);
    expect(warnings).toContainEqual(
      expect.objectContaining({
        id: "req-000001",
        type: "blocked-dependency",
      }),
    );
  });

  it("承認済み依存先には警告なし", () => {
    const reqs = [
      makeRequirement({
        id: "req-000001",
        status: "approved",
        dependencies: { blockedBy: ["req-000002"], blocks: [], relatedTo: [] },
      }),
      makeRequirement({ id: "req-000002", status: "approved" }),
    ];
    const specs = [
      makeSpecification({ requirementId: "req-000001" }),
      makeSpecification({ id: "spec-000002", requirementId: "req-000002" }),
    ];
    const warnings = detectWarnings(reqs, specs);
    expect(
      warnings.find(
        (w) => w.id === "req-000001" && w.type === "blocked-dependency",
      ),
    ).toBeUndefined();
  });

  it("Req/Spec間のステータス整合性チェック: Specがimplementedだが要件がdraft", () => {
    const reqs = [makeRequirement({ id: "req-000001", status: "draft" })];
    const specs = [
      makeSpecification({
        id: "spec-000001",
        requirementId: "req-000001",
        status: "implemented",
      }),
    ];
    const warnings = detectWarnings(reqs, specs);
    expect(warnings).toContainEqual(
      expect.objectContaining({
        id: "spec-000001",
        type: "status-inconsistency",
      }),
    );
  });
});

describe("renderProgressBar", () => {
  it("0%で全て空", () => {
    const bar = renderProgressBar(0);
    expect(bar).toBe("░".repeat(20));
  });

  it("100%で全て埋まる", () => {
    const bar = renderProgressBar(100);
    expect(bar).toBe("█".repeat(20));
  });

  it("50%で半分埋まる", () => {
    const bar = renderProgressBar(50);
    expect(bar).toBe("█".repeat(10) + "░".repeat(10));
  });

  it("カスタム幅", () => {
    const bar = renderProgressBar(50, 10);
    expect(bar).toBe("█".repeat(5) + "░".repeat(5));
    expect(bar.length).toBe(10);
  });
});
