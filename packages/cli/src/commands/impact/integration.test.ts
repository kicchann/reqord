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
vi.mock("../../repositories/file-system.js", () => ({
  joinPath: (...segments: string[]) => segments.join("/"),
  exists: vi.fn(),
  readYAML: vi.fn(),
}));

import * as reqRepo from "../../repositories/requirement.js";
import * as specRepo from "../../repositories/specification.js";
import * as github from "../../repositories/github.js";
import * as fileSystem from "../../repositories/file-system.js";
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
    ...overrides,
  };
}

function setupTasksYaml(tasks: Array<{ number: number; title: string; url: string; linkedTo: { specifications: string[] }; status: string }>) {
  vi.mocked(fileSystem.exists).mockResolvedValue(true);
  vi.mocked(fileSystem.readYAML).mockResolvedValue({
    title: "GitHub Issue\u30BF\u30B9\u30AF\u7BA1\u7406",
    tasks: tasks.map((t) => ({
      ...t,
      priority: "P1",
      estimatedHours: 1,
      syncedAt: "2024-01-01T00:00:00Z",
    })),
  });
}

function setupNoTasksYaml() {
  vi.mocked(fileSystem.exists).mockResolvedValue(false);
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("impact analyze \u2192 notify integration", () => {
  it("Requirement\u8D77\u70B9: analyze \u2192 notify \u306E\u4E00\u9023\u30D5\u30ED\u30FC", async () => {
    const sourceReq = makeRequirement({
      id: "req-000001",
      title: "\u30E6\u30FC\u30B6\u30FC\u8A8D\u8A3C\u6A5F\u80FD",
      dependencies: { blockedBy: [], blocks: ["req-000002"], relatedTo: [] },
    });
    const targetReq = makeRequirement({
      id: "req-000002",
      title: "\u30ED\u30B0\u30A4\u30F3\u753B\u9762",
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
    setupTasksYaml([
      { number: 123, title: "\u30ED\u30B0\u30A4\u30F3\u753B\u9762\u306E\u5B9F\u88C5", url: "https://github.com/test/123", linkedTo: { specifications: ["spec-000001"] }, status: "open" },
      { number: 124, title: "\u8A8D\u8A3CAPI\u7D71\u5408\u30C6\u30B9\u30C8", url: "https://github.com/test/124", linkedTo: { specifications: ["spec-000001"] }, status: "open" },
      { number: 125, title: "\u65E7\u8A8D\u8A3C\u30E2\u30B8\u30E5\u30FC\u30EB\u524A\u9664", url: "https://github.com/test/125", linkedTo: { specifications: ["spec-000001"] }, status: "closed" },
    ]);

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

  it("--json \u51FA\u529B\u304C JSON.parseable \u3067\u3042\u308B\u3053\u3068 (analyzeImpact)", async () => {
    const reqA = makeRequirement({ id: "req-000001", title: "A" });
    vi.mocked(reqRepo.findAll).mockResolvedValue([reqA]);
    vi.mocked(specRepo.findAll).mockResolvedValue([]);
    setupNoTasksYaml();

    const result = await analyzeImpact("/cwd", "req-000001");

    // The JSON output should be parseable
    const json = JSON.stringify(result, null, 2);
    const parsed = JSON.parse(json);
    expect(parsed.sourceId).toBe("req-000001");
    expect(parsed.sourceType).toBe("requirement");
    expect(parsed.directImpacts).toEqual([]);
    expect(parsed.indirectImpacts).toEqual([]);
  });

  it("\u5F71\u97FF\u51480\u4EF6\u3067\u306E\u6B63\u5E38\u7D42\u4E86", async () => {
    const reqA = makeRequirement({
      id: "req-000001",
      title: "\u5B64\u7ACB\u3057\u305F\u8981\u4EF6",
    });
    vi.mocked(reqRepo.findAll).mockResolvedValue([reqA]);
    vi.mocked(reqRepo.findById).mockResolvedValue(reqA);
    vi.mocked(specRepo.findAll).mockResolvedValue([]);
    setupNoTasksYaml();

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

  it("Specification\u8D77\u70B9: analyze \u2192 notify \u306E\u4E00\u9023\u30D5\u30ED\u30FC", async () => {
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
    setupTasksYaml([
      { number: 200, title: "Design implementation", url: "https://github.com/test/200", linkedTo: { specifications: ["spec-000001"] }, status: "open" },
    ]);

    // Analyze from specification
    const analysis = await analyzeImpact("/cwd", "spec-000001");
    expect(analysis.sourceType).toBe("specification");
    expect(analysis.directImpacts).toEqual([]);
    expect(analysis.indirectImpacts).toEqual([]);
    expect(analysis.relatedSpecifications).toHaveLength(1);
    expect(analysis.relatedIssues).toHaveLength(1);
    expect(analysis.relatedIssues[0].number).toBe(200);

    // Notify from specification - spec\u8D77\u70B9\u3067\u306F relatedIssues \u304B\u3089\u901A\u77E5\u5BFE\u8C61\u3092\u53CE\u96C6
    const reqA = makeRequirement({ id: "req-000001", title: "A" });
    vi.mocked(reqRepo.findAll).mockResolvedValue([reqA]);
    vi.mocked(reqRepo.findById).mockResolvedValue(reqA);

    const notifyResult = await notifyImpact("/cwd", "spec-000001");
    expect(notifyResult.notified).toHaveLength(1);
    expect(notifyResult.notified[0].number).toBe(200);
    expect(github.createIssueComment).toHaveBeenCalledOnce();
  });
});
