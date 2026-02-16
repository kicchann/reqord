import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FeedbackEntry, FeedbackIndex, Requirement, Specification } from "@reqord/shared";

vi.mock("../repositories/feedback.js", () => ({
  loadIndex: vi.fn(),
  saveIndex: vi.fn(),
}));

vi.mock("../repositories/requirement.js", () => ({
  findByIdOrThrow: vi.fn(),
  save: vi.fn(),
}));

vi.mock("../repositories/specification.js", () => ({
  findByIdOrThrow: vi.fn(),
  save: vi.fn(),
}));

vi.mock("./github-client.js", () => ({
  getIssue: vi.fn(),
  closeIssue: vi.fn(),
  updateIssueBody: vi.fn(),
  createIssue: vi.fn(),
}));

vi.mock("./requirement-service.js", () => ({
  createRequirement: vi.fn(),
}));

import * as feedbackRepo from "../repositories/feedback.js";
import * as reqRepo from "../repositories/requirement.js";
import * as specRepo from "../repositories/specification.js";
import * as githubClient from "./github-client.js";
import type { GitHubIssue } from "./github-client.js";
import * as reqService from "./requirement-service.js";
import {
  listFeedbacks,
  showFeedback,
  linkToRequirement,
  linkWithNewRequirement,
  linkToSpecification,
  closeFeedback,
  resolveFeedback,
  createFeedbackIssue,
  unlinkFromRequirement,
  unlinkFromSpecification,
  checkRemainingFlags,
} from "./feedback-service.js";

const mockFeedbackRepo = vi.mocked(feedbackRepo);
const mockReqRepo = vi.mocked(reqRepo);
const mockSpecRepo = vi.mocked(specRepo);
const mockGithubClient = vi.mocked(githubClient);
const mockReqService = vi.mocked(reqService);

function makeFeedbackEntry(overrides: Partial<FeedbackEntry> = {}): FeedbackEntry {
  return {
    githubIssue: 17,
    type: "bug",
    severity: "medium",
    linkedTo: {
      requirements: [],
      createdRequirements: [],
      specifications: [],
      createdSpecifications: [],
    },
    syncedAt: "2026-01-01T00:00:00.000Z",
    status: "open",
    ...overrides,
  };
}

function makeFeedbackIndex(feedbacks: FeedbackEntry[] = []): FeedbackIndex {
  return { feedbacks };
}

function makeRequirement(overrides: Partial<Requirement> = {}): Requirement {
  return {
    id: "req-000001",
    version: "1.0.0",
    title: "Test Requirement",
    status: "draft",
    priority: "medium",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    versionHistory: [],
    files: { description: "requirements/req-000001/description.md", supplementary: [] },
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
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    versionHistory: [],
    files: { design: "specifications/spec-000001/design.md", supplementary: [] },
    flags: [],
    ...overrides,
  };
}

function makeGitHubIssue(overrides: Partial<GitHubIssue> = {}): GitHubIssue {
  return {
    number: 17,
    title: "Test feedback issue",
    state: "open",
    labels: ["feedback"],
    createdAt: "2026-01-01T00:00:00Z",
    body: "Issue body content",
    ...overrides,
  };
}

describe("listFeedbacks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("フィルタなしで全feedbackを返す", async () => {
    const feedbacks = [
      makeFeedbackEntry({ githubIssue: 1, status: "open" }),
      makeFeedbackEntry({ githubIssue: 2, status: "closed" }),
    ];
    mockFeedbackRepo.loadIndex.mockResolvedValue(makeFeedbackIndex(feedbacks));

    const result = await listFeedbacks("/test/cwd");

    expect(result).toEqual(feedbacks);
  });

  it("stateでフィルタリングできる (open)", async () => {
    const feedbacks = [
      makeFeedbackEntry({ githubIssue: 1, status: "open" }),
      makeFeedbackEntry({ githubIssue: 2, status: "closed" }),
    ];
    mockFeedbackRepo.loadIndex.mockResolvedValue(makeFeedbackIndex(feedbacks));

    const result = await listFeedbacks("/test/cwd", { state: "open" });

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("open");
  });

  it("stateでフィルタリングできる (closed)", async () => {
    const feedbacks = [
      makeFeedbackEntry({ githubIssue: 1, status: "open" }),
      makeFeedbackEntry({ githubIssue: 2, status: "closed" }),
    ];
    mockFeedbackRepo.loadIndex.mockResolvedValue(makeFeedbackIndex(feedbacks));

    const result = await listFeedbacks("/test/cwd", { state: "closed" });

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("closed");
  });

  it("state=allでフィルタリングしない", async () => {
    const feedbacks = [
      makeFeedbackEntry({ githubIssue: 1, status: "open" }),
      makeFeedbackEntry({ githubIssue: 2, status: "closed" }),
    ];
    mockFeedbackRepo.loadIndex.mockResolvedValue(makeFeedbackIndex(feedbacks));

    const result = await listFeedbacks("/test/cwd", { state: "all" });

    expect(result).toHaveLength(2);
  });

  it("typeでフィルタリングできる", async () => {
    const feedbacks = [
      makeFeedbackEntry({ githubIssue: 1, type: "bug" }),
      makeFeedbackEntry({ githubIssue: 2, type: "improvement" }),
    ];
    mockFeedbackRepo.loadIndex.mockResolvedValue(makeFeedbackIndex(feedbacks));

    const result = await listFeedbacks("/test/cwd", { type: "bug" });

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("bug");
  });
});

describe("showFeedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("index.yamlとGitHub IssueのマージデータをReturn", async () => {
    const feedback = makeFeedbackEntry({ githubIssue: 17 });
    mockFeedbackRepo.loadIndex.mockResolvedValue(makeFeedbackIndex([feedback]));
    const issue = makeGitHubIssue({ number: 17 });
    mockGithubClient.getIssue.mockResolvedValue(issue);

    const result = await showFeedback("/test/cwd", 17);

    expect(result).toEqual({ feedback, issue });
  });

  it("index.yamlに存在しないissueでエラーを投げる", async () => {
    mockFeedbackRepo.loadIndex.mockResolvedValue(makeFeedbackIndex([]));

    await expect(showFeedback("/test/cwd", 99)).rejects.toThrow(
      "Feedback for issue #99 not found in index.yaml",
    );
  });

  it("getIssueを呼び出してGitHub情報を取得する", async () => {
    const feedback = makeFeedbackEntry({ githubIssue: 17 });
    mockFeedbackRepo.loadIndex.mockResolvedValue(makeFeedbackIndex([feedback]));
    const issue = makeGitHubIssue({ number: 17 });
    mockGithubClient.getIssue.mockResolvedValue(issue);

    await showFeedback("/test/cwd", 17);

    expect(mockGithubClient.getIssue).toHaveBeenCalledWith(17);
  });
});

describe("linkToRequirement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("index.yamlのlinkedTo.requirementsに追加する", async () => {
    const feedback = makeFeedbackEntry({ githubIssue: 17 });
    mockFeedbackRepo.loadIndex.mockResolvedValue(makeFeedbackIndex([feedback]));
    const requirement = makeRequirement({ id: "req-000001" });
    mockReqRepo.findByIdOrThrow.mockResolvedValue(requirement);

    await linkToRequirement("/test/cwd", {
      issueNumber: 17,
      requirementId: "req-000001",
    });

    expect(mockFeedbackRepo.saveIndex).toHaveBeenCalledWith(
      "/test/cwd",
      expect.objectContaining({
        feedbacks: expect.arrayContaining([
          expect.objectContaining({
            linkedTo: expect.objectContaining({
              requirements: ["req-000001"],
            }),
          }),
        ]),
      }),
    );
  });

  it("Requirementにfeedback-reviewフラグを追加する", async () => {
    const feedback = makeFeedbackEntry({ githubIssue: 17 });
    mockFeedbackRepo.loadIndex.mockResolvedValue(makeFeedbackIndex([feedback]));
    const requirement = makeRequirement({ id: "req-000001" });
    mockReqRepo.findByIdOrThrow.mockResolvedValue(requirement);

    await linkToRequirement("/test/cwd", {
      issueNumber: 17,
      requirementId: "req-000001",
      severity: "high",
    });

    expect(mockReqRepo.save).toHaveBeenCalledWith(
      "/test/cwd",
      expect.objectContaining({
        flags: expect.arrayContaining([
          expect.objectContaining({
            type: "feedback-review",
            relatedIssues: [17],
            severity: "high",
          }),
        ]),
      }),
    );
  });

  it("GitHub Issue bodyにHTMLコメントを挿入する", async () => {
    const feedback = makeFeedbackEntry({ githubIssue: 17 });
    mockFeedbackRepo.loadIndex.mockResolvedValue(makeFeedbackIndex([feedback]));
    const requirement = makeRequirement({ id: "req-000001" });
    mockReqRepo.findByIdOrThrow.mockResolvedValue(requirement);
    const issue = makeGitHubIssue({ number: 17, body: "Issue body" });
    mockGithubClient.getIssue.mockResolvedValue(issue);

    await linkToRequirement("/test/cwd", {
      issueNumber: 17,
      requirementId: "req-000001",
      type: "bug",
    });

    expect(mockGithubClient.updateIssueBody).toHaveBeenCalledWith(
      17,
      expect.stringContaining("<!-- reqord:feedback"),
    );
    expect(mockGithubClient.updateIssueBody).toHaveBeenCalledWith(
      17,
      expect.stringContaining("req-000001"),
    );
  });

  it("重複するrequirementIdを追加しない", async () => {
    const feedback = makeFeedbackEntry({
      githubIssue: 17,
      linkedTo: {
        requirements: ["req-000001"],
        createdRequirements: [],
        specifications: [],
        createdSpecifications: [],
      },
    });
    mockFeedbackRepo.loadIndex.mockResolvedValue(makeFeedbackIndex([feedback]));
    const requirement = makeRequirement({ id: "req-000001" });
    mockReqRepo.findByIdOrThrow.mockResolvedValue(requirement);

    await linkToRequirement("/test/cwd", {
      issueNumber: 17,
      requirementId: "req-000001",
    });

    const savedIndex = mockFeedbackRepo.saveIndex.mock.calls[0][1];
    expect(savedIndex.feedbacks[0].linkedTo.requirements).toEqual(["req-000001"]);
  });

  it("既存フラグがある場合は追加しない", async () => {
    const feedback = makeFeedbackEntry({ githubIssue: 17 });
    mockFeedbackRepo.loadIndex.mockResolvedValue(makeFeedbackIndex([feedback]));
    const requirement = makeRequirement({
      id: "req-000001",
      flags: [
        {
          type: "feedback-review",
          reason: "Existing flag",
          createdAt: "2026-01-01T00:00:00.000Z",
          relatedIssues: [17],
          severity: "medium",
        },
      ],
    });
    mockReqRepo.findByIdOrThrow.mockResolvedValue(requirement);

    await linkToRequirement("/test/cwd", {
      issueNumber: 17,
      requirementId: "req-000001",
    });

    const savedReq = mockReqRepo.save.mock.calls[0]?.[1];
    expect(savedReq).toBeUndefined();
  });

  it("index.yamlにfeedbackがない場合は新規作成する", async () => {
    mockFeedbackRepo.loadIndex.mockResolvedValue(makeFeedbackIndex([]));
    const requirement = makeRequirement({ id: "req-000001" });
    mockReqRepo.findByIdOrThrow.mockResolvedValue(requirement);

    await linkToRequirement("/test/cwd", {
      issueNumber: 17,
      requirementId: "req-000001",
      type: "bug",
      severity: "high",
    });

    const savedIndex = mockFeedbackRepo.saveIndex.mock.calls[0][1];
    expect(savedIndex.feedbacks).toHaveLength(1);
    expect(savedIndex.feedbacks[0]).toMatchObject({
      githubIssue: 17,
      type: "bug",
      severity: "high",
      status: "open",
    });
  });
});

describe("linkWithNewRequirement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GitHub Issueタイトルから新Requirementを作成する", async () => {
    mockFeedbackRepo.loadIndex.mockResolvedValue(makeFeedbackIndex([]));
    const issue = makeGitHubIssue({ number: 17, title: "Fix login bug" });
    mockGithubClient.getIssue.mockResolvedValue(issue);
    const newReq = makeRequirement({ id: "req-000002" });
    mockReqService.createRequirement.mockResolvedValue({
      requirement: newReq,
      descriptionPath: "requirements/req-000002/description.md",
    });
    mockReqRepo.save.mockResolvedValue();

    await linkWithNewRequirement("/test/cwd", { issueNumber: 17 });

    expect(mockReqService.createRequirement).toHaveBeenCalledWith("/test/cwd", {
      title: "[Feedback #17] Fix login bug",
      priority: "medium",
    });
  });

  it("新RequirementのタイトルはFeedbackプレフィックス付き", async () => {
    mockFeedbackRepo.loadIndex.mockResolvedValue(makeFeedbackIndex([]));
    const issue = makeGitHubIssue({ number: 17, title: "Improve UX" });
    mockGithubClient.getIssue.mockResolvedValue(issue);
    const newReq = makeRequirement({ id: "req-000002" });
    mockReqService.createRequirement.mockResolvedValue({
      requirement: newReq,
      descriptionPath: "requirements/req-000002/description.md",
    });
    mockReqRepo.save.mockResolvedValue();

    await linkWithNewRequirement("/test/cwd", { issueNumber: 17 });

    expect(mockReqService.createRequirement).toHaveBeenCalledWith("/test/cwd", {
      title: "[Feedback #17] Improve UX",
      priority: "medium",
    });
  });

  it("index.yamlのlinkedTo.createdRequirementsに追加する", async () => {
    mockFeedbackRepo.loadIndex.mockResolvedValue(makeFeedbackIndex([]));
    const issue = makeGitHubIssue({ number: 17, title: "Test" });
    mockGithubClient.getIssue.mockResolvedValue(issue);
    const newReq = makeRequirement({ id: "req-000002" });
    mockReqService.createRequirement.mockResolvedValue({
      requirement: newReq,
      descriptionPath: "requirements/req-000002/description.md",
    });
    mockReqRepo.save.mockResolvedValue();

    await linkWithNewRequirement("/test/cwd", { issueNumber: 17 });

    const savedIndex = mockFeedbackRepo.saveIndex.mock.calls[0][1];
    expect(savedIndex.feedbacks[0].linkedTo.createdRequirements).toEqual(["req-000002"]);
  });

  it("GitHub Issue bodyにHTMLコメントを挿入する", async () => {
    mockFeedbackRepo.loadIndex.mockResolvedValue(makeFeedbackIndex([]));
    const issue = makeGitHubIssue({ number: 17, title: "Test", body: "Issue body" });
    mockGithubClient.getIssue.mockResolvedValue(issue);
    const newReq = makeRequirement({ id: "req-000002" });
    mockReqService.createRequirement.mockResolvedValue({
      requirement: newReq,
      descriptionPath: "requirements/req-000002/description.md",
    });
    mockReqRepo.save.mockResolvedValue();

    await linkWithNewRequirement("/test/cwd", { issueNumber: 17, type: "bug" });

    expect(mockGithubClient.updateIssueBody).toHaveBeenCalledWith(
      17,
      expect.stringContaining("<!-- reqord:feedback"),
    );
  });
});

describe("linkToSpecification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("index.yamlのlinkedTo.specificationsに追加する", async () => {
    const feedback = makeFeedbackEntry({ githubIssue: 17 });
    mockFeedbackRepo.loadIndex.mockResolvedValue(makeFeedbackIndex([feedback]));
    const specification = makeSpecification({ id: "spec-000001" });
    mockSpecRepo.findByIdOrThrow.mockResolvedValue(specification);

    await linkToSpecification("/test/cwd", {
      issueNumber: 17,
      specificationId: "spec-000001",
    });

    expect(mockFeedbackRepo.saveIndex).toHaveBeenCalledWith(
      "/test/cwd",
      expect.objectContaining({
        feedbacks: expect.arrayContaining([
          expect.objectContaining({
            linkedTo: expect.objectContaining({
              specifications: ["spec-000001"],
            }),
          }),
        ]),
      }),
    );
  });

  it("Specificationにfeedback-reviewフラグを追加する", async () => {
    const feedback = makeFeedbackEntry({ githubIssue: 17 });
    mockFeedbackRepo.loadIndex.mockResolvedValue(makeFeedbackIndex([feedback]));
    const specification = makeSpecification({ id: "spec-000001" });
    mockSpecRepo.findByIdOrThrow.mockResolvedValue(specification);

    await linkToSpecification("/test/cwd", {
      issueNumber: 17,
      specificationId: "spec-000001",
      severity: "critical",
    });

    expect(mockSpecRepo.save).toHaveBeenCalledWith(
      "/test/cwd",
      expect.objectContaining({
        flags: expect.arrayContaining([
          expect.objectContaining({
            type: "feedback-review",
            relatedIssues: [17],
            severity: "critical",
          }),
        ]),
      }),
    );
  });

  it("GitHub Issue bodyにHTMLコメントを挿入する", async () => {
    const feedback = makeFeedbackEntry({ githubIssue: 17 });
    mockFeedbackRepo.loadIndex.mockResolvedValue(makeFeedbackIndex([feedback]));
    const specification = makeSpecification({ id: "spec-000001" });
    mockSpecRepo.findByIdOrThrow.mockResolvedValue(specification);
    const issue = makeGitHubIssue({ number: 17, body: "Issue body" });
    mockGithubClient.getIssue.mockResolvedValue(issue);

    await linkToSpecification("/test/cwd", {
      issueNumber: 17,
      specificationId: "spec-000001",
      type: "spec-mismatch",
    });

    expect(mockGithubClient.updateIssueBody).toHaveBeenCalledWith(
      17,
      expect.stringContaining("<!-- reqord:feedback"),
    );
    expect(mockGithubClient.updateIssueBody).toHaveBeenCalledWith(
      17,
      expect.stringContaining("spec-000001"),
    );
  });

  it("存在しないSpecificationでエラーを投げる", async () => {
    const feedback = makeFeedbackEntry({ githubIssue: 17 });
    mockFeedbackRepo.loadIndex.mockResolvedValue(makeFeedbackIndex([feedback]));
    mockSpecRepo.findByIdOrThrow.mockRejectedValue(
      new Error("Specification spec-999999 not found.")
    );

    await expect(
      linkToSpecification("/test/cwd", {
        issueNumber: 17,
        specificationId: "spec-999999",
      }),
    ).rejects.toThrow("Specification spec-999999 not found");
  });
});

describe("closeFeedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("index.yamlのstatusをclosedに更新する", async () => {
    const feedback = makeFeedbackEntry({ githubIssue: 17, status: "open" });
    mockFeedbackRepo.loadIndex.mockResolvedValue(makeFeedbackIndex([feedback]));

    await closeFeedback("/test/cwd", 17);

    const savedIndex = mockFeedbackRepo.saveIndex.mock.calls[0][1];
    expect(savedIndex.feedbacks[0].status).toBe("closed");
  });

  it("GitHub Issueをクローズする", async () => {
    const feedback = makeFeedbackEntry({ githubIssue: 17 });
    mockFeedbackRepo.loadIndex.mockResolvedValue(makeFeedbackIndex([feedback]));

    await closeFeedback("/test/cwd", 17);

    expect(mockGithubClient.closeIssue).toHaveBeenCalledWith(17, expect.any(String));
  });

  it("影響範囲サマリーをコメントとして付与する", async () => {
    const feedback = makeFeedbackEntry({
      githubIssue: 17,
      linkedTo: {
        requirements: ["req-000001"],
        createdRequirements: ["req-000002"],
        specifications: ["spec-000001"],
        createdSpecifications: [],
      },
    });
    mockFeedbackRepo.loadIndex.mockResolvedValue(makeFeedbackIndex([feedback]));

    await closeFeedback("/test/cwd", 17);

    expect(mockGithubClient.closeIssue).toHaveBeenCalledWith(
      17,
      expect.stringContaining("req-000001"),
    );
    expect(mockGithubClient.closeIssue).toHaveBeenCalledWith(
      17,
      expect.stringContaining("req-000002"),
    );
    expect(mockGithubClient.closeIssue).toHaveBeenCalledWith(
      17,
      expect.stringContaining("spec-000001"),
    );
  });

  it("存在しないfeedbackでエラーを投げる", async () => {
    mockFeedbackRepo.loadIndex.mockResolvedValue(makeFeedbackIndex([]));

    await expect(closeFeedback("/test/cwd", 99)).rejects.toThrow(
      "Feedback for issue #99 not found",
    );
  });
});

describe("resolveFeedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("req-プレフィックスのアーティファクトのflagを削除してresolvedに追加する", async () => {
    const feedback = makeFeedbackEntry({
      githubIssue: 17,
      linkedTo: {
        requirements: ["req-000001"],
        createdRequirements: [],
        specifications: [],
        createdSpecifications: [],
      },
    });
    mockFeedbackRepo.loadIndex.mockResolvedValue(makeFeedbackIndex([feedback]));
    const requirement = makeRequirement({
      id: "req-000001",
      flags: [
        {
          type: "feedback-review",
          reason: "Feedback from issue #17",
          createdAt: "2026-01-01T00:00:00.000Z",
          relatedIssues: [17],
          severity: "medium",
        },
      ],
    });
    mockReqRepo.findByIdOrThrow.mockResolvedValue(requirement);

    await resolveFeedback("/test/cwd", {
      issueNumber: 17,
      artifactId: "req-000001",
    });

    // Flag removed from requirement
    expect(mockReqRepo.save).toHaveBeenCalledWith(
      "/test/cwd",
      expect.objectContaining({ flags: [] }),
    );

    // Added to linkedTo.resolved
    const savedIndex = mockFeedbackRepo.saveIndex.mock.calls[0][1];
    expect(savedIndex.feedbacks[0].linkedTo.resolved).toEqual({
      requirements: ["req-000001"],
      specifications: [],
    });
  });

  it("spec-プレフィックスのアーティファクトのflagを削除してresolvedに追加する", async () => {
    const feedback = makeFeedbackEntry({
      githubIssue: 17,
      linkedTo: {
        requirements: [],
        createdRequirements: [],
        specifications: ["spec-000001"],
        createdSpecifications: [],
      },
    });
    mockFeedbackRepo.loadIndex.mockResolvedValue(makeFeedbackIndex([feedback]));
    const specification = makeSpecification({
      id: "spec-000001",
      flags: [
        {
          type: "feedback-review",
          reason: "Feedback from issue #17",
          createdAt: "2026-01-01T00:00:00.000Z",
          relatedIssues: [17],
          severity: "high",
        },
      ],
    });
    mockSpecRepo.findByIdOrThrow.mockResolvedValue(specification);

    await resolveFeedback("/test/cwd", {
      issueNumber: 17,
      artifactId: "spec-000001",
    });

    // Flag removed from specification
    expect(mockSpecRepo.save).toHaveBeenCalledWith(
      "/test/cwd",
      expect.objectContaining({ flags: [] }),
    );

    // Added to linkedTo.resolved
    const savedIndex = mockFeedbackRepo.saveIndex.mock.calls[0][1];
    expect(savedIndex.feedbacks[0].linkedTo.resolved).toEqual({
      requirements: [],
      specifications: ["spec-000001"],
    });
  });

  it("createdRequirementsに含まれるアーティファクトもresolve可能", async () => {
    const feedback = makeFeedbackEntry({
      githubIssue: 17,
      linkedTo: {
        requirements: [],
        createdRequirements: ["req-000002"],
        specifications: [],
        createdSpecifications: [],
      },
    });
    mockFeedbackRepo.loadIndex.mockResolvedValue(makeFeedbackIndex([feedback]));
    const requirement = makeRequirement({
      id: "req-000002",
      flags: [
        {
          type: "feedback-review",
          reason: "Feedback from issue #17",
          createdAt: "2026-01-01T00:00:00.000Z",
          relatedIssues: [17],
          severity: "medium",
        },
      ],
    });
    mockReqRepo.findByIdOrThrow.mockResolvedValue(requirement);

    await resolveFeedback("/test/cwd", {
      issueNumber: 17,
      artifactId: "req-000002",
    });

    expect(mockReqRepo.save).toHaveBeenCalled();
    const savedIndex = mockFeedbackRepo.saveIndex.mock.calls[0][1];
    expect(savedIndex.feedbacks[0].linkedTo.resolved?.requirements).toContain("req-000002");
  });

  it("createdSpecificationsに含まれるアーティファクトもresolve可能", async () => {
    const feedback = makeFeedbackEntry({
      githubIssue: 17,
      linkedTo: {
        requirements: [],
        createdRequirements: [],
        specifications: [],
        createdSpecifications: ["spec-000002"],
      },
    });
    mockFeedbackRepo.loadIndex.mockResolvedValue(makeFeedbackIndex([feedback]));
    const specification = makeSpecification({
      id: "spec-000002",
      flags: [
        {
          type: "feedback-review",
          reason: "Feedback from issue #17",
          createdAt: "2026-01-01T00:00:00.000Z",
          relatedIssues: [17],
          severity: "high",
        },
      ],
    });
    mockSpecRepo.findByIdOrThrow.mockResolvedValue(specification);

    await resolveFeedback("/test/cwd", {
      issueNumber: 17,
      artifactId: "spec-000002",
    });

    expect(mockSpecRepo.save).toHaveBeenCalled();
    const savedIndex = mockFeedbackRepo.saveIndex.mock.calls[0][1];
    expect(savedIndex.feedbacks[0].linkedTo.resolved?.specifications).toContain("spec-000002");
  });

  it("linkedToに含まれないartifact-idでエラーを投げる", async () => {
    const feedback = makeFeedbackEntry({
      githubIssue: 17,
      linkedTo: {
        requirements: ["req-000001"],
        createdRequirements: [],
        specifications: [],
        createdSpecifications: [],
      },
    });
    mockFeedbackRepo.loadIndex.mockResolvedValue(makeFeedbackIndex([feedback]));

    await expect(
      resolveFeedback("/test/cwd", {
        issueNumber: 17,
        artifactId: "req-000099",
      }),
    ).rejects.toThrow("req-000099 is not linked to feedback #17");
  });

  it("無効なartifact-idプレフィックスでエラーを投げる", async () => {
    const feedback = makeFeedbackEntry({ githubIssue: 17 });
    mockFeedbackRepo.loadIndex.mockResolvedValue(makeFeedbackIndex([feedback]));

    await expect(
      resolveFeedback("/test/cwd", {
        issueNumber: 17,
        artifactId: "invalid-000001",
      }),
    ).rejects.toThrow("Invalid artifact ID: invalid-000001");
  });

  it("存在しないfeedbackでエラーを投げる", async () => {
    mockFeedbackRepo.loadIndex.mockResolvedValue(makeFeedbackIndex([]));

    await expect(
      resolveFeedback("/test/cwd", {
        issueNumber: 99,
        artifactId: "req-000001",
      }),
    ).rejects.toThrow("Feedback for issue #99 not found");
  });

  it("既にresolvedに含まれている場合は重複追加しない", async () => {
    const feedback = makeFeedbackEntry({
      githubIssue: 17,
      linkedTo: {
        requirements: ["req-000001"],
        createdRequirements: [],
        specifications: [],
        createdSpecifications: [],
        resolved: {
          requirements: ["req-000001"],
          specifications: [],
        },
      },
    });
    mockFeedbackRepo.loadIndex.mockResolvedValue(makeFeedbackIndex([feedback]));
    const requirement = makeRequirement({ id: "req-000001" });
    mockReqRepo.findByIdOrThrow.mockResolvedValue(requirement);

    await resolveFeedback("/test/cwd", {
      issueNumber: 17,
      artifactId: "req-000001",
    });

    const savedIndex = mockFeedbackRepo.saveIndex.mock.calls[0][1];
    expect(savedIndex.feedbacks[0].linkedTo.resolved?.requirements).toEqual(["req-000001"]);
  });

  it("操作順序: flag削除が先、resolved追加が後（安全性）", async () => {
    const callOrder: string[] = [];

    const feedback = makeFeedbackEntry({
      githubIssue: 17,
      linkedTo: {
        requirements: ["req-000001"],
        createdRequirements: [],
        specifications: [],
        createdSpecifications: [],
      },
    });
    mockFeedbackRepo.loadIndex.mockResolvedValue(makeFeedbackIndex([feedback]));
    const requirement = makeRequirement({
      id: "req-000001",
      flags: [
        {
          type: "feedback-review",
          reason: "Feedback from issue #17",
          createdAt: "2026-01-01T00:00:00.000Z",
          relatedIssues: [17],
          severity: "medium",
        },
      ],
    });
    mockReqRepo.findByIdOrThrow.mockResolvedValue(requirement);

    mockReqRepo.save.mockImplementation(async () => {
      callOrder.push("reqRepo.save");
    });
    mockFeedbackRepo.saveIndex.mockImplementation(async () => {
      callOrder.push("feedbackRepo.saveIndex");
    });

    await resolveFeedback("/test/cwd", {
      issueNumber: 17,
      artifactId: "req-000001",
    });

    expect(callOrder).toEqual(["reqRepo.save", "feedbackRepo.saveIndex"]);
  });
});

describe("createFeedbackIssue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GitHub Issueを作成してissue番号を返す", async () => {
    mockFeedbackRepo.loadIndex.mockResolvedValue(makeFeedbackIndex([]));
    mockGithubClient.createIssue.mockResolvedValue({ number: 42, url: "https://github.com/owner/repo/issues/42" });

    const result = await createFeedbackIssue("/test/cwd", {
      title: "Login broken",
      description: "Cannot login after update",
    });

    expect(result).toBe(42);
  });

  it("タイトルに[Feedback]プレフィックスを自動付与する", async () => {
    mockFeedbackRepo.loadIndex.mockResolvedValue(makeFeedbackIndex([]));
    mockGithubClient.createIssue.mockResolvedValue({ number: 42, url: "https://github.com/owner/repo/issues/42" });

    await createFeedbackIssue("/test/cwd", {
      title: "Login broken",
      description: "Cannot login after update",
    });

    expect(mockGithubClient.createIssue).toHaveBeenCalledWith(
      expect.objectContaining({ title: "[Feedback] Login broken" }),
    );
  });

  it("既に[Feedback]プレフィックスがある場合は二重に付与しない", async () => {
    mockFeedbackRepo.loadIndex.mockResolvedValue(makeFeedbackIndex([]));
    mockGithubClient.createIssue.mockResolvedValue({ number: 42, url: "https://github.com/owner/repo/issues/42" });

    await createFeedbackIssue("/test/cwd", {
      title: "[Feedback] Login broken",
      description: "Cannot login after update",
    });

    expect(mockGithubClient.createIssue).toHaveBeenCalledWith(
      expect.objectContaining({ title: "[Feedback] Login broken" }),
    );
  });

  it("feedbackとreqord-generatedラベルを付与する", async () => {
    mockFeedbackRepo.loadIndex.mockResolvedValue(makeFeedbackIndex([]));
    mockGithubClient.createIssue.mockResolvedValue({ number: 42, url: "https://github.com/owner/repo/issues/42" });

    await createFeedbackIssue("/test/cwd", {
      title: "Bug",
      description: "desc",
    });

    expect(mockGithubClient.createIssue).toHaveBeenCalledWith(
      expect.objectContaining({ labels: ["feedback", "reqord-generated"] }),
    );
  });

  it("type指定時にtypeラベルも追加する", async () => {
    mockFeedbackRepo.loadIndex.mockResolvedValue(makeFeedbackIndex([]));
    mockGithubClient.createIssue.mockResolvedValue({ number: 42, url: "https://github.com/owner/repo/issues/42" });

    await createFeedbackIssue("/test/cwd", {
      title: "Bug",
      description: "desc",
      type: "bug",
    });

    expect(mockGithubClient.createIssue).toHaveBeenCalledWith(
      expect.objectContaining({ labels: ["feedback", "reqord-generated", "bug"] }),
    );
  });

  it("index.yamlに新規エントリを追加する", async () => {
    mockFeedbackRepo.loadIndex.mockResolvedValue(makeFeedbackIndex([]));
    mockGithubClient.createIssue.mockResolvedValue({ number: 42, url: "https://github.com/owner/repo/issues/42" });

    await createFeedbackIssue("/test/cwd", {
      title: "Bug",
      description: "desc",
      type: "bug",
      severity: "high",
    });

    const savedIndex = mockFeedbackRepo.saveIndex.mock.calls[0][1];
    expect(savedIndex.feedbacks).toHaveLength(1);
    expect(savedIndex.feedbacks[0]).toMatchObject({
      githubIssue: 42,
      type: "bug",
      severity: "high",
      status: "open",
    });
  });

  it("ISSUE_TEMPLATE準拠のbodyを生成する", async () => {
    mockFeedbackRepo.loadIndex.mockResolvedValue(makeFeedbackIndex([]));
    mockGithubClient.createIssue.mockResolvedValue({ number: 42, url: "https://github.com/owner/repo/issues/42" });

    await createFeedbackIssue("/test/cwd", {
      title: "Bug",
      description: "Something happened",
      type: "bug",
      severity: "high",
      relatedReq: "req-000001",
      relatedSpec: "spec-000001",
    });

    const body = mockGithubClient.createIssue.mock.calls[0][0].body;
    expect(body).toContain("### 何が起きた？ / 何に気づいた？");
    expect(body).toContain("Something happened");
    expect(body).toContain("### フィードバックの種類");
    expect(body).toContain("implementation-bug (実装のバグ)");
    expect(body).toContain("### 関連する要件 (Requirement)");
    expect(body).toContain("req-000001");
    expect(body).toContain("### 関連する仕様 (Specification)");
    expect(body).toContain("spec-000001");
    expect(body).toContain("### 深刻度");
    expect(body).toContain("high (多数のユーザーに影響)");
  });
});

describe("unlinkFromRequirement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("linkedTo.requirementsから指定IDを削除する", async () => {
    const feedback = makeFeedbackEntry({
      githubIssue: 17,
      linkedTo: {
        requirements: ["req-000001", "req-000002"],
        createdRequirements: [],
        specifications: [],
        createdSpecifications: [],
      },
    });
    mockFeedbackRepo.loadIndex.mockResolvedValue(makeFeedbackIndex([feedback]));
    const requirement = makeRequirement({
      id: "req-000001",
      flags: [
        {
          type: "feedback-review",
          reason: "Feedback from issue #17",
          createdAt: "2026-01-01T00:00:00.000Z",
          relatedIssues: [17],
          severity: "medium",
        },
      ],
    });
    mockReqRepo.findByIdOrThrow.mockResolvedValue(requirement);
    mockGithubClient.getIssue.mockResolvedValue(makeGitHubIssue({ number: 17 }));

    await unlinkFromRequirement("/test/cwd", {
      issueNumber: 17,
      requirementId: "req-000001",
    });

    const savedIndex = mockFeedbackRepo.saveIndex.mock.calls[0][1];
    expect(savedIndex.feedbacks[0].linkedTo.requirements).toEqual(["req-000002"]);
  });

  it("Requirementからfeedback-reviewフラグを削除する", async () => {
    const feedback = makeFeedbackEntry({
      githubIssue: 17,
      linkedTo: {
        requirements: ["req-000001"],
        createdRequirements: [],
        specifications: [],
        createdSpecifications: [],
      },
    });
    mockFeedbackRepo.loadIndex.mockResolvedValue(makeFeedbackIndex([feedback]));
    const requirement = makeRequirement({
      id: "req-000001",
      flags: [
        {
          type: "feedback-review",
          reason: "Feedback from issue #17",
          createdAt: "2026-01-01T00:00:00.000Z",
          relatedIssues: [17],
          severity: "medium",
        },
        {
          type: "feedback-review",
          reason: "Other feedback flag",
          createdAt: "2026-01-01T00:00:00.000Z",
          relatedIssues: [99],
          severity: "low",
        },
      ],
    });
    mockReqRepo.findByIdOrThrow.mockResolvedValue(requirement);
    mockGithubClient.getIssue.mockResolvedValue(makeGitHubIssue({ number: 17 }));

    await unlinkFromRequirement("/test/cwd", {
      issueNumber: 17,
      requirementId: "req-000001",
    });

    expect(mockReqRepo.save).toHaveBeenCalledWith(
      "/test/cwd",
      expect.objectContaining({
        flags: [expect.objectContaining({ type: "feedback-review", relatedIssues: [99] })],
      }),
    );
  });

  it("GitHub Issue bodyのHTMLコメントを更新する", async () => {
    const feedback = makeFeedbackEntry({
      githubIssue: 17,
      linkedTo: {
        requirements: ["req-000001"],
        createdRequirements: [],
        specifications: [],
        createdSpecifications: [],
      },
    });
    mockFeedbackRepo.loadIndex.mockResolvedValue(makeFeedbackIndex([feedback]));
    const requirement = makeRequirement({ id: "req-000001" });
    mockReqRepo.findByIdOrThrow.mockResolvedValue(requirement);
    mockGithubClient.getIssue.mockResolvedValue(makeGitHubIssue({ number: 17, body: "Issue body" }));

    await unlinkFromRequirement("/test/cwd", {
      issueNumber: 17,
      requirementId: "req-000001",
    });

    expect(mockGithubClient.updateIssueBody).toHaveBeenCalledWith(
      17,
      expect.any(String),
    );
  });

  it("紐付けされていないrequirementでエラーを投げる", async () => {
    const feedback = makeFeedbackEntry({
      githubIssue: 17,
      linkedTo: {
        requirements: ["req-000001"],
        createdRequirements: [],
        specifications: [],
        createdSpecifications: [],
      },
    });
    mockFeedbackRepo.loadIndex.mockResolvedValue(makeFeedbackIndex([feedback]));

    await expect(
      unlinkFromRequirement("/test/cwd", {
        issueNumber: 17,
        requirementId: "req-000099",
      }),
    ).rejects.toThrow("req-000099 is not linked to feedback #17");
  });

  it("存在しないfeedbackでエラーを投げる", async () => {
    mockFeedbackRepo.loadIndex.mockResolvedValue(makeFeedbackIndex([]));

    await expect(
      unlinkFromRequirement("/test/cwd", {
        issueNumber: 99,
        requirementId: "req-000001",
      }),
    ).rejects.toThrow("Feedback for issue #99 not found");
  });
});

describe("unlinkFromSpecification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("linkedTo.specificationsから指定IDを削除する", async () => {
    const feedback = makeFeedbackEntry({
      githubIssue: 17,
      linkedTo: {
        requirements: [],
        createdRequirements: [],
        specifications: ["spec-000001", "spec-000002"],
        createdSpecifications: [],
      },
    });
    mockFeedbackRepo.loadIndex.mockResolvedValue(makeFeedbackIndex([feedback]));
    mockGithubClient.getIssue.mockResolvedValue(makeGitHubIssue({ number: 17 }));

    await unlinkFromSpecification("/test/cwd", {
      issueNumber: 17,
      specificationId: "spec-000001",
    });

    const savedIndex = mockFeedbackRepo.saveIndex.mock.calls[0][1];
    expect(savedIndex.feedbacks[0].linkedTo.specifications).toEqual(["spec-000002"]);
  });

  it("GitHub Issue bodyのHTMLコメントを更新する", async () => {
    const feedback = makeFeedbackEntry({
      githubIssue: 17,
      linkedTo: {
        requirements: [],
        createdRequirements: [],
        specifications: ["spec-000001"],
        createdSpecifications: [],
      },
    });
    mockFeedbackRepo.loadIndex.mockResolvedValue(makeFeedbackIndex([feedback]));
    mockGithubClient.getIssue.mockResolvedValue(makeGitHubIssue({ number: 17, body: "Issue body" }));

    await unlinkFromSpecification("/test/cwd", {
      issueNumber: 17,
      specificationId: "spec-000001",
    });

    expect(mockGithubClient.updateIssueBody).toHaveBeenCalledWith(
      17,
      expect.any(String),
    );
  });

  it("紐付けされていないspecificationでエラーを投げる", async () => {
    const feedback = makeFeedbackEntry({
      githubIssue: 17,
      linkedTo: {
        requirements: [],
        createdRequirements: [],
        specifications: ["spec-000001"],
        createdSpecifications: [],
      },
    });
    mockFeedbackRepo.loadIndex.mockResolvedValue(makeFeedbackIndex([feedback]));

    await expect(
      unlinkFromSpecification("/test/cwd", {
        issueNumber: 17,
        specificationId: "spec-000099",
      }),
    ).rejects.toThrow("spec-000099 is not linked to feedback #17");
  });

  it("存在しないfeedbackでエラーを投げる", async () => {
    mockFeedbackRepo.loadIndex.mockResolvedValue(makeFeedbackIndex([]));

    await expect(
      unlinkFromSpecification("/test/cwd", {
        issueNumber: 99,
        specificationId: "spec-000001",
      }),
    ).rejects.toThrow("Feedback for issue #99 not found");
  });
});

describe("checkRemainingFlags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("残存するfeedback-reviewフラグを検出する", async () => {
    const feedback = makeFeedbackEntry({
      githubIssue: 17,
      linkedTo: {
        requirements: ["req-000001"],
        createdRequirements: [],
        specifications: [],
        createdSpecifications: [],
      },
    });
    const requirement = makeRequirement({
      id: "req-000001",
      flags: [
        {
          type: "feedback-review",
          reason: "Feedback from issue #17",
          createdAt: "2026-01-01T00:00:00.000Z",
          relatedIssues: [17],
          severity: "high",
        },
      ],
    });
    mockReqRepo.findByIdOrThrow.mockResolvedValue(requirement);

    const result = await checkRemainingFlags("/test/cwd", feedback);

    expect(result).toEqual([
      {
        artifactId: "req-000001",
        issueNumber: 17,
        severity: "high",
      },
    ]);
  });

  it("フラグがない場合は空配列を返す", async () => {
    const feedback = makeFeedbackEntry({
      githubIssue: 17,
      linkedTo: {
        requirements: ["req-000001"],
        createdRequirements: [],
        specifications: [],
        createdSpecifications: [],
      },
    });
    const requirement = makeRequirement({ id: "req-000001", flags: [] });
    mockReqRepo.findByIdOrThrow.mockResolvedValue(requirement);

    const result = await checkRemainingFlags("/test/cwd", feedback);

    expect(result).toEqual([]);
  });

  it("紐付けされたrequirementがない場合は空配列を返す", async () => {
    const feedback = makeFeedbackEntry({
      githubIssue: 17,
      linkedTo: {
        requirements: [],
        createdRequirements: [],
        specifications: [],
        createdSpecifications: [],
      },
    });

    const result = await checkRemainingFlags("/test/cwd", feedback);

    expect(result).toEqual([]);
  });

  it("複数のrequirementに残存flagがある場合はすべて返す", async () => {
    const feedback = makeFeedbackEntry({
      githubIssue: 17,
      linkedTo: {
        requirements: ["req-000001", "req-000002"],
        createdRequirements: [],
        specifications: [],
        createdSpecifications: [],
      },
    });
    mockReqRepo.findByIdOrThrow
      .mockResolvedValueOnce(
        makeRequirement({
          id: "req-000001",
          flags: [
            {
              type: "feedback-review",
              reason: "Feedback from issue #17",
              createdAt: "2026-01-01T00:00:00.000Z",
              relatedIssues: [17],
              severity: "medium",
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        makeRequirement({
          id: "req-000002",
          flags: [
            {
              type: "feedback-review",
              reason: "Feedback from issue #17",
              createdAt: "2026-01-01T00:00:00.000Z",
              relatedIssues: [17],
              severity: "critical",
            },
          ],
        }),
      );

    const result = await checkRemainingFlags("/test/cwd", feedback);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ artifactId: "req-000001", severity: "medium" });
    expect(result[1]).toMatchObject({ artifactId: "req-000002", severity: "critical" });
  });

  it("存在しないrequirementはスキップする", async () => {
    const feedback = makeFeedbackEntry({
      githubIssue: 17,
      linkedTo: {
        requirements: ["req-000001"],
        createdRequirements: [],
        specifications: [],
        createdSpecifications: [],
      },
    });
    mockReqRepo.findByIdOrThrow.mockRejectedValue(new Error("Not found"));

    const result = await checkRemainingFlags("/test/cwd", feedback);

    expect(result).toEqual([]);
  });
});
