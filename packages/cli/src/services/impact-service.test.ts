import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Requirement, Specification } from "@reqord/shared";

vi.mock("../repositories/requirement.js", () => ({
  findAll: vi.fn(),
  findById: vi.fn(),
}));
vi.mock("../repositories/specification.js", () => ({
  findAll: vi.fn(),
  findById: vi.fn(),
}));
vi.mock("../repositories/github.js", () => ({
  createIssueComment: vi.fn(),
  createPrComment: vi.fn(),
}));

import * as reqRepo from "../repositories/requirement.js";
import * as specRepo from "../repositories/specification.js";
import * as github from "../repositories/github.js";
import { analyzeImpact, notifyImpact } from "./impact-service.js";

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

describe("analyzeImpact", () => {
  describe("Requirement起点", () => {
    it("影響先0件で空のImpactAnalysisが返る", async () => {
      const reqA = makeRequirement({ id: "req-000001", title: "A" });
      vi.mocked(reqRepo.findAll).mockResolvedValue([reqA]);
      vi.mocked(specRepo.findAll).mockResolvedValue([]);

      const result = await analyzeImpact("/cwd", "req-000001");

      expect(result.sourceId).toBe("req-000001");
      expect(result.sourceType).toBe("requirement");
      expect(result.directImpacts).toEqual([]);
      expect(result.indirectImpacts).toEqual([]);
      expect(result.relatedSpecifications).toEqual([]);
      expect(result.relatedIssues).toEqual([]);
      expect(result.circularDependencies).toEqual([]);
      expect(result.analyzedAt).toBeDefined();
    });

    it("線形依存（A→B→C）の走査", async () => {
      const reqA = makeRequirement({
        id: "req-000001",
        title: "A",
        dependencies: { blockedBy: [], blocks: ["req-000002"], relatedTo: [] },
      });
      const reqB = makeRequirement({
        id: "req-000002",
        title: "B",
        dependencies: { blockedBy: ["req-000001"], blocks: ["req-000003"], relatedTo: [] },
      });
      const reqC = makeRequirement({
        id: "req-000003",
        title: "C",
        dependencies: { blockedBy: ["req-000002"], blocks: [], relatedTo: [] },
      });
      vi.mocked(reqRepo.findAll).mockResolvedValue([reqA, reqB, reqC]);
      vi.mocked(specRepo.findAll).mockResolvedValue([]);

      const result = await analyzeImpact("/cwd", "req-000001");

      expect(result.directImpacts).toEqual([
        { id: "req-000002", relation: "blocks", depth: 1, path: ["req-000001", "req-000002"], title: "B" },
      ]);
      expect(result.indirectImpacts).toEqual([
        {
          id: "req-000003",
          relation: "blocks",
          depth: 2,
          path: ["req-000001", "req-000002", "req-000003"],
          title: "C",
        },
      ]);
    });

    it("分岐依存（A→B, A→C）の走査", async () => {
      const reqA = makeRequirement({
        id: "req-000001",
        title: "A",
        dependencies: { blockedBy: [], blocks: ["req-000002", "req-000003"], relatedTo: [] },
      });
      const reqB = makeRequirement({
        id: "req-000002",
        title: "B",
        dependencies: { blockedBy: ["req-000001"], blocks: [], relatedTo: [] },
      });
      const reqC = makeRequirement({
        id: "req-000003",
        title: "C",
        dependencies: { blockedBy: ["req-000001"], blocks: [], relatedTo: [] },
      });
      vi.mocked(reqRepo.findAll).mockResolvedValue([reqA, reqB, reqC]);
      vi.mocked(specRepo.findAll).mockResolvedValue([]);

      const result = await analyzeImpact("/cwd", "req-000001");

      expect(result.directImpacts).toHaveLength(2);
      expect(result.directImpacts.map((e) => e.id).sort()).toEqual(["req-000002", "req-000003"]);
      expect(result.indirectImpacts).toEqual([]);
    });

    it("ダイヤモンド依存（A→B→D, A→C→D）の走査", async () => {
      const reqA = makeRequirement({
        id: "req-000001",
        title: "A",
        dependencies: { blockedBy: [], blocks: ["req-000002", "req-000003"], relatedTo: [] },
      });
      const reqB = makeRequirement({
        id: "req-000002",
        title: "B",
        dependencies: { blockedBy: ["req-000001"], blocks: ["req-000004"], relatedTo: [] },
      });
      const reqC = makeRequirement({
        id: "req-000003",
        title: "C",
        dependencies: { blockedBy: ["req-000001"], blocks: ["req-000004"], relatedTo: [] },
      });
      const reqD = makeRequirement({
        id: "req-000004",
        title: "D",
        dependencies: { blockedBy: ["req-000002", "req-000003"], blocks: [], relatedTo: [] },
      });
      vi.mocked(reqRepo.findAll).mockResolvedValue([reqA, reqB, reqC, reqD]);
      vi.mocked(specRepo.findAll).mockResolvedValue([]);

      const result = await analyzeImpact("/cwd", "req-000001");

      expect(result.directImpacts).toHaveLength(2);
      // D appears only once in indirectImpacts (visited set prevents duplicates)
      expect(result.indirectImpacts).toHaveLength(1);
      expect(result.indirectImpacts[0].id).toBe("req-000004");
      expect(result.indirectImpacts[0].depth).toBe(2);
    });

    it("relatedTo depth=1 制限", async () => {
      const reqA = makeRequirement({
        id: "req-000001",
        title: "A",
        dependencies: { blockedBy: [], blocks: [], relatedTo: ["req-000002"] },
      });
      const reqB = makeRequirement({
        id: "req-000002",
        title: "B",
        dependencies: { blockedBy: [], blocks: ["req-000003"], relatedTo: ["req-000001"] },
      });
      const reqC = makeRequirement({
        id: "req-000003",
        title: "C",
        dependencies: { blockedBy: ["req-000002"], blocks: [], relatedTo: [] },
      });
      vi.mocked(reqRepo.findAll).mockResolvedValue([reqA, reqB, reqC]);
      vi.mocked(specRepo.findAll).mockResolvedValue([]);

      const result = await analyzeImpact("/cwd", "req-000001");

      // B is direct via relatedTo
      expect(result.directImpacts).toEqual([
        { id: "req-000002", relation: "relatedTo", depth: 1, path: ["req-000001", "req-000002"], title: "B" },
      ]);
      // C should NOT appear because relatedTo traversal cuts off at depth=1
      expect(result.indirectImpacts).toEqual([]);
    });

    it("maxDepth 制限（depth=1で間接影響が含まれない）", async () => {
      const reqA = makeRequirement({
        id: "req-000001",
        title: "A",
        dependencies: { blockedBy: [], blocks: ["req-000002"], relatedTo: [] },
      });
      const reqB = makeRequirement({
        id: "req-000002",
        title: "B",
        dependencies: { blockedBy: ["req-000001"], blocks: ["req-000003"], relatedTo: [] },
      });
      const reqC = makeRequirement({
        id: "req-000003",
        title: "C",
        dependencies: { blockedBy: ["req-000002"], blocks: [], relatedTo: [] },
      });
      vi.mocked(reqRepo.findAll).mockResolvedValue([reqA, reqB, reqC]);
      vi.mocked(specRepo.findAll).mockResolvedValue([]);

      const result = await analyzeImpact("/cwd", "req-000001", { maxDepth: 1 });

      expect(result.directImpacts).toHaveLength(1);
      expect(result.directImpacts[0].id).toBe("req-000002");
      expect(result.indirectImpacts).toEqual([]);
    });

    it("maxDepth境界値: depth=2でdepth=2の影響が含まれる", async () => {
      const reqA = makeRequirement({
        id: "req-000001",
        title: "A",
        dependencies: { blockedBy: [], blocks: ["req-000002"], relatedTo: [] },
      });
      const reqB = makeRequirement({
        id: "req-000002",
        title: "B",
        dependencies: { blockedBy: ["req-000001"], blocks: ["req-000003"], relatedTo: [] },
      });
      const reqC = makeRequirement({
        id: "req-000003",
        title: "C",
        dependencies: { blockedBy: ["req-000002"], blocks: [], relatedTo: [] },
      });
      vi.mocked(reqRepo.findAll).mockResolvedValue([reqA, reqB, reqC]);
      vi.mocked(specRepo.findAll).mockResolvedValue([]);

      const result = await analyzeImpact("/cwd", "req-000001", { maxDepth: 2 });

      expect(result.directImpacts).toHaveLength(1);
      expect(result.indirectImpacts).toHaveLength(1);
      expect(result.indirectImpacts[0].id).toBe("req-000003");
      expect(result.indirectImpacts[0].depth).toBe(2);
    });

    it("循環依存検出（A→B→C→A）", async () => {
      const reqA = makeRequirement({
        id: "req-000001",
        title: "A",
        dependencies: { blockedBy: [], blocks: ["req-000002"], relatedTo: [] },
      });
      const reqB = makeRequirement({
        id: "req-000002",
        title: "B",
        dependencies: { blockedBy: ["req-000001"], blocks: ["req-000003"], relatedTo: [] },
      });
      const reqC = makeRequirement({
        id: "req-000003",
        title: "C",
        dependencies: { blockedBy: ["req-000002"], blocks: ["req-000001"], relatedTo: [] },
      });
      vi.mocked(reqRepo.findAll).mockResolvedValue([reqA, reqB, reqC]);
      vi.mocked(specRepo.findAll).mockResolvedValue([]);

      const result = await analyzeImpact("/cwd", "req-000001");

      expect(result.circularDependencies).toHaveLength(1);
      expect(result.circularDependencies[0]).toEqual(["req-000001", "req-000002", "req-000003", "req-000001"]);
    });

    it("Specification関連付け（requirementIdフィルタ）", async () => {
      const reqA = makeRequirement({ id: "req-000001", title: "A" });
      const spec1 = makeSpecification({
        id: "spec-000001",
        requirementId: "req-000001",
        status: "approved",
      });
      const spec2 = makeSpecification({
        id: "spec-000002",
        requirementId: "req-000002",
        status: "draft",
      });
      vi.mocked(reqRepo.findAll).mockResolvedValue([reqA]);
      vi.mocked(specRepo.findAll).mockResolvedValue([spec1, spec2]);

      const result = await analyzeImpact("/cwd", "req-000001");

      expect(result.relatedSpecifications).toEqual([
        { id: "spec-000001", requirementId: "req-000001", status: "approved" },
      ]);
    });

    it("Issue発見（specification.implementation.issuesから取得）", async () => {
      const reqA = makeRequirement({ id: "req-000001", title: "A" });
      const spec1 = makeSpecification({
        id: "spec-000001",
        requirementId: "req-000001",
        status: "approved",
        implementation: {
          issues: [
            { number: 42, title: "Implement feature", url: "https://github.com/test/42", priority: "P1", status: "open" },
          ],
          totalEstimatedHours: 8,
          createdAt: "2024-01-01T00:00:00Z",
        },
      });
      vi.mocked(reqRepo.findAll).mockResolvedValue([reqA]);
      vi.mocked(specRepo.findAll).mockResolvedValue([spec1]);

      const result = await analyzeImpact("/cwd", "req-000001");

      expect(result.relatedIssues).toEqual([
        {
          number: 42,
          title: "Implement feature",
          url: "https://github.com/test/42",
          status: "open",
          specificationId: "spec-000001",
        },
      ]);
    });
  });

  describe("Specification起点", () => {
    it("Specification起点分析", async () => {
      const spec1 = makeSpecification({
        id: "spec-000001",
        requirementId: "req-000001",
        status: "approved",
        implementation: {
          issues: [
            { number: 10, title: "Issue 10", url: "https://github.com/test/10", priority: "P0", status: "closed" },
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
      const spec3 = makeSpecification({
        id: "spec-000003",
        requirementId: "req-000002",
        status: "draft",
      });
      vi.mocked(specRepo.findById).mockResolvedValue(spec1);
      vi.mocked(specRepo.findAll).mockResolvedValue([spec1, spec2, spec3]);

      const result = await analyzeImpact("/cwd", "spec-000001");

      expect(result.sourceId).toBe("spec-000001");
      expect(result.sourceType).toBe("specification");
      expect(result.directImpacts).toEqual([]);
      expect(result.indirectImpacts).toEqual([]);
      expect(result.circularDependencies).toEqual([]);
      // Related specs for same requirement (excluding self)
      expect(result.relatedSpecifications).toEqual([
        { id: "spec-000002", requirementId: "req-000001", status: "draft" },
      ]);
      expect(result.relatedIssues).toEqual([
        { number: 10, title: "Issue 10", url: "https://github.com/test/10", status: "closed", specificationId: "spec-000001" },
      ]);
    });

    it("存在しないSpecificationでエラーを投げる", async () => {
      vi.mocked(specRepo.findById).mockResolvedValue(null);

      await expect(analyzeImpact("/cwd", "spec-999999")).rejects.toThrow();
    });
  });
});

describe("notifyImpact", () => {
  function setupMocksForNotify(options?: {
    issueStatus?: "open" | "in_progress" | "closed";
    customBlocks?: string[];
  }) {
    const sourceReq = makeRequirement({
      id: "req-000001",
      title: "ユーザー認証機能",
      dependencies: {
        blockedBy: [],
        blocks: options?.customBlocks ?? ["req-000002"],
        relatedTo: [],
      },
    });
    const targetReq = makeRequirement({
      id: "req-000002",
      title: "Target Requirement",
      dependencies: { blockedBy: ["req-000001"], blocks: [], relatedTo: [] },
    });
    const spec = makeSpecification({
      id: "spec-000001",
      requirementId: "req-000002",
      status: "approved",
      implementation: {
        issues: [
          {
            number: 42,
            title: "Implement feature",
            url: "https://github.com/test/42",
            priority: "P1",
            status: options?.issueStatus ?? "open",
          },
        ],
        totalEstimatedHours: 8,
        createdAt: "2024-01-01T00:00:00Z",
      },
    });

    vi.mocked(reqRepo.findAll).mockResolvedValue([sourceReq, targetReq]);
    vi.mocked(reqRepo.findById).mockResolvedValue(sourceReq);
    vi.mocked(specRepo.findAll).mockResolvedValue([spec]);
    vi.mocked(github.createIssueComment).mockResolvedValue(undefined);

    return { sourceReq, targetReq, spec };
  }

  it("通知メッセージテンプレートの変数置換", async () => {
    setupMocksForNotify();

    await notifyImpact("/cwd", "req-000001");

    expect(github.createIssueComment).toHaveBeenCalledOnce();
    const body = vi.mocked(github.createIssueComment).mock.calls[0][1];
    expect(body).toContain("req-000001");
    expect(body).toContain("ユーザー認証機能");
    expect(body).toContain("blocks");
    expect(body).toContain("req-000001");
    expect(body).toContain("req-000002");
  });

  it("dryRun=true で GitHub API が呼ばれないこと", async () => {
    setupMocksForNotify();

    const result = await notifyImpact("/cwd", "req-000001", { dryRun: true });

    expect(github.createIssueComment).not.toHaveBeenCalled();
    expect(result.dryRun).toBe(true);
    expect(result.notified).toHaveLength(1);
    expect(result.notified[0]).toEqual({
      type: "issue",
      number: 42,
      title: "Implement feature",
    });
  });

  it("open Issue のみ通知対象になること（closed はスキップ）", async () => {
    setupMocksForNotify({ issueStatus: "closed" });

    const result = await notifyImpact("/cwd", "req-000001");

    expect(github.createIssueComment).not.toHaveBeenCalled();
    expect(result.notified).toHaveLength(0);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0]).toEqual({
      type: "issue",
      number: 42,
      reason: "closed",
    });
  });

  it("カスタムメッセージが通知に含まれること", async () => {
    setupMocksForNotify();

    await notifyImpact("/cwd", "req-000001", {
      message: "緊急の変更です",
    });

    const body = vi.mocked(github.createIssueComment).mock.calls[0][1];
    expect(body).toContain("緊急の変更です");
  });

  it("sourceReqがnullの場合、タイトルにidが使われる", async () => {
    const sourceReq = makeRequirement({
      id: "req-000001",
      dependencies: { blockedBy: [], blocks: ["req-000002"], relatedTo: [] },
    });
    const targetReq = makeRequirement({
      id: "req-000002",
      dependencies: { blockedBy: ["req-000001"], blocks: [], relatedTo: [] },
    });
    const spec = makeSpecification({
      id: "spec-000001",
      requirementId: "req-000002",
      implementation: {
        issues: [{ number: 42, title: "Issue", url: "https://github.com/test/42", priority: "P1" as const, status: "open" as const }],
        totalEstimatedHours: 8,
        createdAt: "2024-01-01T00:00:00Z",
      },
    });
    vi.mocked(reqRepo.findAll).mockResolvedValue([sourceReq, targetReq]);
    vi.mocked(reqRepo.findById).mockResolvedValue(null);
    vi.mocked(specRepo.findAll).mockResolvedValue([spec]);
    vi.mocked(github.createIssueComment).mockResolvedValue(undefined);

    await notifyImpact("/cwd", "req-000001");

    const body = vi.mocked(github.createIssueComment).mock.calls[0][1];
    expect(body).toContain("req-000001");
    // タイトルがnullの場合、IDがフォールバックとして使われる
    expect(body).toContain("(req-000001)");
  });

  it("影響先0件で空の NotifyResult が返ること", async () => {
    const sourceReq = makeRequirement({
      id: "req-000001",
      title: "Isolated Requirement",
    });
    vi.mocked(reqRepo.findAll).mockResolvedValue([sourceReq]);
    vi.mocked(reqRepo.findById).mockResolvedValue(sourceReq);
    vi.mocked(specRepo.findAll).mockResolvedValue([]);

    const result = await notifyImpact("/cwd", "req-000001");

    expect(result.notified).toEqual([]);
    expect(result.skipped).toEqual([]);
    expect(result.dryRun).toBe(false);
    expect(github.createIssueComment).not.toHaveBeenCalled();
  });
});
