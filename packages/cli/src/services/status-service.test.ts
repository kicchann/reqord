import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Requirement, Specification } from "@reqord/shared";
import {
  buildStatusSummary,
  buildIssueSummary,
  detectWarnings,
  renderProgressBar,
  getSpecificationStatus,
} from "./status-service.js";

vi.mock("../repositories/requirement.js", () => ({
  findAll: vi.fn(),
  findById: vi.fn(),
  findByIdOrThrow: vi.fn(),
}));
vi.mock("../repositories/specification.js", () => ({
  findAll: vi.fn(),
  findById: vi.fn(),
  findByIdOrThrow: vi.fn(),
}));

import * as reqRepo from "../repositories/requirement.js";
import * as specRepo from "../repositories/specification.js";

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

beforeEach(() => {
  vi.clearAllMocks();
});

describe("buildStatusSummary", () => {
  it("空配列の場合 total=0, implementedPercentage=0", () => {
    const result = buildStatusSummary([]);
    expect(result).toEqual({
      total: 0,
      byStatus: {},
      implementedPercentage: 0,
      approvedPercentage: 0,
    });
  });

  it("全要件がdraftの場合 implementedPercentage=0, approvedPercentage=0", () => {
    const items = [{ status: "draft" }, { status: "draft" }, { status: "draft" }];
    const result = buildStatusSummary(items);
    expect(result.total).toBe(3);
    expect(result.byStatus).toEqual({ draft: 3 });
    expect(result.implementedPercentage).toBe(0);
    expect(result.approvedPercentage).toBe(0);
  });

  it("全要件がimplementedの場合 implementedPercentage=100, approvedPercentage=100", () => {
    const items = [{ status: "implemented" }, { status: "implemented" }];
    const result = buildStatusSummary(items);
    expect(result.total).toBe(2);
    expect(result.implementedPercentage).toBe(100);
    expect(result.approvedPercentage).toBe(100);
  });

  it("全要件がapprovedの場合 approvedPercentage=100", () => {
    const items = [{ status: "approved" }, { status: "approved" }];
    const result = buildStatusSummary(items);
    expect(result.approvedPercentage).toBe(100);
    expect(result.implementedPercentage).toBe(0);
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
    expect(result.approvedPercentage).toBe(60);
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

  it("spec.implementationは使用しないため常に0を返す", () => {
    const specs = [makeSpecification()];
    const result = buildIssueSummary(specs);
    expect(result).toEqual({
      total: 0,
      closed: 0,
      open: 0,
      closedPercentage: 0,
    });
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
        severity: "warning",
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
        severity: "warning",
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
        severity: "warning",
      }),
    );
  });

  it("設計検証エラーがあるSpecificationに警告", () => {
    const reqs = [makeRequirement({ id: "req-000001", status: "approved" })];
    const specs = [
      makeSpecification({
        id: "spec-000001",
        requirementId: "req-000001",
        designValidation: {
          passed: 3,
          warnings: 1,
          errors: 2,
          rules: [],
          validatedAt: "2026-01-01T00:00:00Z",
        },
      }),
    ];
    const warnings = detectWarnings(reqs, specs);
    expect(warnings).toContainEqual(
      expect.objectContaining({
        id: "spec-000001",
        type: "validation-failed",
        severity: "warning",
      }),
    );
  });

  it("checkConsistency統合: 全SpecがimplementedだがReqがapproved", () => {
    const reqs = [makeRequirement({ id: "req-000001", status: "approved" })];
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
        id: "req-000001",
        type: "all-specs-implemented",
        severity: "warning",
      }),
    );
  });

  it("checkConsistency統合: Reqがdeprecatedだが関連Specがactive → 警告", () => {
    const reqs = [makeRequirement({ id: "req-000001", status: "deprecated" })];
    const specs = [
      makeSpecification({
        id: "spec-000001",
        requirementId: "req-000001",
        status: "draft",
      }),
    ];
    const warnings = detectWarnings(reqs, specs);
    // checkConsistency runs before deprecated skip to detect this case
    expect(warnings).toContainEqual(
      expect.objectContaining({
        id: "req-000001",
        type: "deprecated-with-active-specs",
      }),
    );
  });

  it("feedback-reviewフラグがあるRequirementにinfo表示", () => {
    const reqs = [
      makeRequirement({
        id: "req-000001",
        status: "approved",
        flags: [
          {
            type: "feedback-review" as const,
            reason: "セキュリティ関連の指摘",
            createdAt: "2026-01-01T00:00:00Z",
            relatedIssues: [42, 43],
            severity: "high" as const,
          },
        ],
      }),
    ];
    const specs = [makeSpecification({ requirementId: "req-000001" })];
    const warnings = detectWarnings(reqs, specs);
    const feedbackWarning = warnings.find(
      (w) => w.id === "req-000001" && w.type === "feedback-review",
    );
    expect(feedbackWarning).toBeDefined();
    expect(feedbackWarning?.severity).toBe("info");
    expect(feedbackWarning?.message).toContain("#42");
    expect(feedbackWarning?.message).toContain("#43");
  });

  it("feedback-reviewフラグがないRequirementには情報表示なし", () => {
    const reqs = [makeRequirement({ id: "req-000001", status: "approved" })];
    const specs = [makeSpecification({ requirementId: "req-000001" })];
    const warnings = detectWarnings(reqs, specs);
    expect(
      warnings.find(
        (w) => w.id === "req-000001" && w.type === "feedback-review",
      ),
    ).toBeUndefined();
  });

  it("feedback-reviewフラグがあるSpecificationにinfo表示", () => {
    const reqs = [makeRequirement({ id: "req-000001", status: "approved" })];
    const specs = [
      makeSpecification({
        id: "spec-000001",
        requirementId: "req-000001",
        flags: [
          {
            type: "feedback-review" as const,
            reason: "パフォーマンス改善提案",
            createdAt: "2026-01-01T00:00:00Z",
            relatedIssues: [50],
            severity: "medium" as const,
          },
        ],
      }),
    ];
    const warnings = detectWarnings(reqs, specs);
    const feedbackWarning = warnings.find(
      (w) => w.id === "spec-000001" && w.type === "feedback-review",
    );
    expect(feedbackWarning).toBeDefined();
    expect(feedbackWarning?.severity).toBe("info");
  });

  it("Spec 0件でcheckConsistency整合性警告なし", () => {
    const reqs = [makeRequirement({ id: "req-000001", status: "approved" })];
    const specs: Specification[] = [];
    const warnings = detectWarnings(reqs, specs);
    expect(
      warnings.find(
        (w) => w.type === "all-specs-implemented" || w.type === "deprecated-with-active-specs",
      ),
    ).toBeUndefined();
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

describe("getSpecificationStatus", () => {
  const mockFindByIdOrThrow = vi.mocked(specRepo.findByIdOrThrow);
  const mockReqFindById = vi.mocked(reqRepo.findById);

  it("designValidationがある場合はサマリーを返す", async () => {
    mockFindByIdOrThrow.mockResolvedValue(
      makeSpecification({
        id: "spec-000001",
        requirementId: "req-000001",
        status: "approved",
        designValidation: {
          passed: 5,
          warnings: 2,
          errors: 1,
          rules: [],
          validatedAt: "2026-01-01T00:00:00Z",
        },
      }),
    );
    mockReqFindById.mockResolvedValue(
      makeRequirement({ id: "req-000001", status: "approved" }),
    );

    const result = await getSpecificationStatus("/tmp", "spec-000001");

    expect(result.designValidation).toEqual({
      passed: 5,
      warnings: 2,
      errors: 1,
    });
  });

  it("designValidationがない場合はundefined", async () => {
    mockFindByIdOrThrow.mockResolvedValue(
      makeSpecification({ id: "spec-000001", requirementId: "req-000001" }),
    );
    mockReqFindById.mockResolvedValue(
      makeRequirement({ id: "req-000001", status: "approved" }),
    );

    const result = await getSpecificationStatus("/tmp", "spec-000001");

    expect(result.designValidation).toBeUndefined();
  });

  it("implementation.issuesが0件 → coverageStatus: not-covered", async () => {
    mockFindByIdOrThrow.mockResolvedValue(
      makeSpecification({ id: "spec-000001", requirementId: "req-000001" }),
    );
    mockReqFindById.mockResolvedValue(
      makeRequirement({ id: "req-000001", status: "approved" }),
    );

    const result = await getSpecificationStatus("/tmp", "spec-000001");

    expect(result.coverageStatus).toBe("not-covered");
    expect(result.issueProgress).toEqual({ total: 0, completed: 0 });
  });

  it("spec.implementationは使用しないため常にnot-covered", async () => {
    mockFindByIdOrThrow.mockResolvedValue(
      makeSpecification({
        id: "spec-000001",
        requirementId: "req-000001",
      }),
    );
    mockReqFindById.mockResolvedValue(
      makeRequirement({ id: "req-000001", status: "approved" }),
    );

    const result = await getSpecificationStatus("/tmp", "spec-000001");

    expect(result.coverageStatus).toBe("not-covered");
    expect(result.issueProgress).toEqual({ total: 0, completed: 0 });
  });

  it("親Requirementが存在しない場合はnull", async () => {
    mockFindByIdOrThrow.mockResolvedValue(
      makeSpecification({ id: "spec-000001", requirementId: "req-999999" }),
    );
    mockReqFindById.mockResolvedValue(null);

    const result = await getSpecificationStatus("/tmp", "spec-000001");

    expect(result.requirement).toBeNull();
  });
});
