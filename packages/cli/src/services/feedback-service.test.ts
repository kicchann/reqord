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
