import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Requirement, Specification } from "@reqord/shared";

vi.mock("../../repositories/requirement.js", () => ({
  findAll: vi.fn(),
  findById: vi.fn(),
}));
vi.mock("../../repositories/specification.js", () => ({
  findAll: vi.fn(),
  findById: vi.fn(),
}));
vi.mock("../../repositories/github.js", () => ({
  createIssueComment: vi.fn(),
  createPrComment: vi.fn(),
}));

import * as reqRepo from "../../repositories/requirement.js";
import * as specRepo from "../../repositories/specification.js";
import * as github from "../../repositories/github.js";
import { analyzeImpact, notifyImpact } from "../../services/impact-service.js";

function makeRequirement(overrides: Partial<Requirement> = {}): Requirement {
  return {
    id: "req-000001",
    version: "1.0.0",
    title: "Test Requirement",
    status: "draft",
    priority: "medium",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    versionHistory: [],
    files: { description: "description.md", supplementary: [] },
    successCriteria: [],
    format: { type: "free-form" },
    dependencies: { blockedBy: [], blocks: [], relatedTo: [] },
    flags: [],
    ...overrides,
  };
}

function makeSpecification(overrides: Partial<Specification> = {}): Specification {
  return {
    id: "spec-000001",
    requirementId: "req-000001",
    version: "1.0.0",
    status: "draft",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    versionHistory: [],
    files: { design: "design.md", supplementary: [] },
    flags: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("impact analyze → notify integration", () => {
  it("Requirement起点: analyze → notify の一連フロー", async () => {
    const sourceReq = makeRequirement({
      id: "req-000001",
      title: "ユーザー認証機能",
      dependencies: { blockedBy: [], blocks: ["req-000002"], relatedTo: [] },
    });
    const targetReq = makeRequirement({
      id: "req-000002",
      title: "ログイン画面",
      dependencies: { blockedBy: ["req-000001"], blocks: [], relatedTo: [] },
    });
    const spec = makeSpecification({
      id: "spec-000001",
      requirementId: "req-000002",
      status: "approved",
      implementation: {
        issues: [
          { number: 123, title: "ログイン画面の実装", url: "https://github.com/test/123", priority: "P1", status: "open" },
          { number: 124, title: "認証API統合テスト", url: "https://github.com/test/124", priority: "P2", status: "open" },
          { number: 125, title: "旧認証モジュール削除", url: "https://github.com/test/125", priority: "P3", status: "closed" },
        ],
        totalEstimatedHours: 16,
        createdAt: "2024-01-01T00:00:00Z",
      },
    });

    vi.mocked(reqRepo.findAll).mockResolvedValue([sourceReq, targetReq]);
    vi.mocked(reqRepo.findById).mockResolvedValue(sourceReq);
    vi.mocked(specRepo.findAll).mockResolvedValue([spec]);
    vi.mocked(github.createIssueComment).mockResolvedValue(undefined);

    // Step 1: Analyze
    const analysis = await analyzeImpact("/cwd", "req-000001");

    expect(analysis.sourceId).toBe("req-000001");
    expect(analysis.sourceType).toBe("requirement");
    expect(analysis.directImpacts).toHaveLength(1);
    expect(analysis.directImpacts[0].id).toBe("req-000002");

    // Step 2: Notify
    const notifyResult = await notifyImpact("/cwd", "req-000001");

    expect(notifyResult.dryRun).toBe(false);
    expect(notifyResult.notified).toHaveLength(2);
    expect(notifyResult.notified.map((n) => n.number).sort()).toEqual([123, 124]);
    expect(notifyResult.skipped).toHaveLength(1);
    expect(notifyResult.skipped[0].number).toBe(125);
    expect(notifyResult.skipped[0].reason).toBe("closed");

    // Verify GitHub API called for open issues only
    expect(github.createIssueComment).toHaveBeenCalledTimes(2);
  });

  it("--json 出力が JSON.parseable であること (analyzeImpact)", async () => {
    const reqA = makeRequirement({ id: "req-000001", title: "A" });
    vi.mocked(reqRepo.findAll).mockResolvedValue([reqA]);
    vi.mocked(specRepo.findAll).mockResolvedValue([]);

    const result = await analyzeImpact("/cwd", "req-000001");

    // The JSON output should be parseable
    const json = JSON.stringify(result, null, 2);
    const parsed = JSON.parse(json);
    expect(parsed.sourceId).toBe("req-000001");
    expect(parsed.sourceType).toBe("requirement");
    expect(parsed.directImpacts).toEqual([]);
    expect(parsed.indirectImpacts).toEqual([]);
  });

  it("影響先0件での正常終了", async () => {
    const reqA = makeRequirement({
      id: "req-000001",
      title: "孤立した要件",
    });
    vi.mocked(reqRepo.findAll).mockResolvedValue([reqA]);
    vi.mocked(reqRepo.findById).mockResolvedValue(reqA);
    vi.mocked(specRepo.findAll).mockResolvedValue([]);

    // Analyze
    const analysis = await analyzeImpact("/cwd", "req-000001");
    expect(analysis.directImpacts).toEqual([]);
    expect(analysis.indirectImpacts).toEqual([]);
    expect(analysis.relatedIssues).toEqual([]);

    // Notify
    const notifyResult = await notifyImpact("/cwd", "req-000001");
    expect(notifyResult.notified).toEqual([]);
    expect(notifyResult.skipped).toEqual([]);
    expect(github.createIssueComment).not.toHaveBeenCalled();
  });

  it("Specification起点: analyze → notify の一連フロー", async () => {
    const spec1 = makeSpecification({
      id: "spec-000001",
      requirementId: "req-000001",
      status: "approved",
      implementation: {
        issues: [
          { number: 200, title: "Design implementation", url: "https://github.com/test/200", priority: "P1", status: "open" },
        ],
        totalEstimatedHours: 4,
        createdAt: "2024-01-01T00:00:00Z",
      },
    });
    const spec2 = makeSpecification({
      id: "spec-000002",
      requirementId: "req-000001",
      status: "draft",
    });

    vi.mocked(specRepo.findById).mockResolvedValue(spec1);
    vi.mocked(specRepo.findAll).mockResolvedValue([spec1, spec2]);

    // Analyze from specification
    const analysis = await analyzeImpact("/cwd", "spec-000001");
    expect(analysis.sourceType).toBe("specification");
    expect(analysis.directImpacts).toEqual([]);
    expect(analysis.indirectImpacts).toEqual([]);
    expect(analysis.relatedSpecifications).toHaveLength(1);
    expect(analysis.relatedIssues).toHaveLength(1);
    expect(analysis.relatedIssues[0].number).toBe(200);

    // Notify from specification - spec起点ではdirectImpacts/indirectImpactsが空なので
    // 影響先issueは0件になる
    const reqA = makeRequirement({ id: "req-000001", title: "A" });
    vi.mocked(reqRepo.findAll).mockResolvedValue([reqA]);
    vi.mocked(reqRepo.findById).mockResolvedValue(reqA);

    const notifyResult = await notifyImpact("/cwd", "spec-000001");
    expect(notifyResult.notified).toEqual([]);
    expect(notifyResult.skipped).toEqual([]);
    expect(github.createIssueComment).not.toHaveBeenCalled();
  });
});
