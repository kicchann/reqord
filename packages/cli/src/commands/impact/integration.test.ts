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
    // spec.implementation is no longer used, so no issues are notified
    const notifyResult = await notifyImpact("/cwd", "req-000001");

    expect(notifyResult.dryRun).toBe(false);
    expect(notifyResult.notified).toHaveLength(0);
    expect(notifyResult.skipped).toHaveLength(0);

    // Verify GitHub API NOT called since there are no related issues
    expect(github.createIssueComment).not.toHaveBeenCalled();
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
    });
    const spec2 = makeSpecification({
      id: "spec-000002",
      requirementId: "req-000001",
      status: "draft",
    });

    vi.mocked(specRepo.findById).mockResolvedValue(spec1);
    vi.mocked(specRepo.findAll).mockResolvedValue([spec1, spec2]);

    // Analyze from specification
    // spec.implementation is no longer used, so relatedIssues is always empty
    const analysis = await analyzeImpact("/cwd", "spec-000001");
    expect(analysis.sourceType).toBe("specification");
    expect(analysis.directImpacts).toEqual([]);
    expect(analysis.indirectImpacts).toEqual([]);
    expect(analysis.relatedSpecifications).toHaveLength(1);
    expect(analysis.relatedIssues).toHaveLength(0);

    // Notify from specification - no issues to notify since spec.implementation not used
    const reqA = makeRequirement({ id: "req-000001", title: "A" });
    vi.mocked(reqRepo.findAll).mockResolvedValue([reqA]);
    vi.mocked(reqRepo.findById).mockResolvedValue(reqA);

    const notifyResult = await notifyImpact("/cwd", "spec-000001");
    expect(notifyResult.notified).toHaveLength(0);
    expect(notifyResult.skipped).toHaveLength(0);
    expect(github.createIssueComment).not.toHaveBeenCalled();
  });
});
