import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FeedbackEntry, FeedbackIndex } from "@reqord/shared";

vi.mock("../repositories/feedback.js", () => ({
  loadIndex: vi.fn(),
  saveIndex: vi.fn(),
  upsertFeedback: vi.fn(),
}));

vi.mock("./github-client.js", () => ({
  listFeedbackIssues: vi.fn(),
  getIssue: vi.fn(),
  updateIssueBody: vi.fn(),
}));

import * as feedbackRepo from "../repositories/feedback.js";
import * as githubClient from "./github-client.js";
import type { GitHubIssue } from "./github-client.js";
import {
  syncFromGitHub,
  syncToGitHub,
  parseGitHubIssue,
} from "./feedback-sync-service.js";

const mockFeedbackRepo = vi.mocked(feedbackRepo);
const mockGithubClient = vi.mocked(githubClient);

function makeGitHubIssue(overrides: Partial<GitHubIssue> = {}): GitHubIssue {
  return {
    number: 17,
    title: "Test feedback",
    state: "open",
    labels: ["feedback"],
    createdAt: "2026-01-01T00:00:00Z",
    body: "",
    ...overrides,
  };
}

function makeFeedbackEntry(overrides: Partial<FeedbackEntry> = {}): FeedbackEntry {
  return {
    githubIssue: 17,
    type: "bug",
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

beforeEach(() => {
  vi.clearAllMocks();
});

// --- parseGitHubIssue (output-based) ---

describe("parseGitHubIssue", () => {
  it("HTMLコメントからtypeを抽出する", () => {
    const issue = makeGitHubIssue({
      body: '<!-- reqord:feedback {"type":"bug","linkedTo":{"requirements":[],"createdRequirements":[],"specifications":[]}} -->',
    });

    const result = parseGitHubIssue(issue);

    expect(result.type).toBe("bug");
  });

  it("HTMLコメントがない場合はtypeがundefinedになる", () => {
    const issue = makeGitHubIssue({
      body: "Normal issue body without reqord comment",
    });

    const result = parseGitHubIssue(issue);

    expect(result.type).toBeUndefined();
  });

  it("HTMLコメントからlinkedTo.requirementsを抽出する", () => {
    const issue = makeGitHubIssue({
      body: '<!-- reqord:feedback {"linkedTo":{"requirements":["req-000006","req-000023"],"createdRequirements":[],"specifications":[]}} -->',
    });

    const result = parseGitHubIssue(issue);

    expect(result.linkedTo.requirements).toEqual(["req-000006", "req-000023"]);
  });

  it("HTMLコメントからlinkedTo.specificationsを抽出する", () => {
    const issue = makeGitHubIssue({
      body: '<!-- reqord:feedback {"linkedTo":{"requirements":[],"createdRequirements":[],"specifications":["spec-000001","spec-000002"]}} -->',
    });

    const result = parseGitHubIssue(issue);

    expect(result.linkedTo.specifications).toEqual(["spec-000001", "spec-000002"]);
  });

  it("issue stateをstatusに変換する (open)", () => {
    const issue = makeGitHubIssue({
      state: "open",
    });

    const result = parseGitHubIssue(issue);

    expect(result.status).toBe("open");
  });

  it("issue stateをstatusに変換する (closed)", () => {
    const issue = makeGitHubIssue({
      state: "closed",
    });

    const result = parseGitHubIssue(issue);

    expect(result.status).toBe("closed");
  });

  it("HTMLコメントがない場合はlinkedToを空で初期化する", () => {
    const issue = makeGitHubIssue({ body: "No comment" });

    const result = parseGitHubIssue(issue);

    expect(result.linkedTo.requirements).toEqual([]);
    expect(result.linkedTo.createdRequirements).toEqual([]);
    expect(result.linkedTo.specifications).toEqual([]);
  });

  it("複数のメタデータを同時に抽出する", () => {
    const issue = makeGitHubIssue({
      number: 42,
      body: '<!-- reqord:feedback {"type":"improvement","severity":"high","linkedTo":{"requirements":["req-000006"],"createdRequirements":[],"specifications":["spec-000027"]}} -->',
      state: "open",
    });

    const result = parseGitHubIssue(issue);

    expect(result.githubIssue).toBe(42);
    expect(result.type).toBe("improvement");
    expect(result.severity).toBe("high");
    expect(result.linkedTo.requirements).toEqual(["req-000006"]);
    expect(result.linkedTo.specifications).toEqual(["spec-000027"]);
    expect(result.status).toBe("open");
  });

  it("bodyがundefinedの場合は空のlinkedToを返す", () => {
    const issue = makeGitHubIssue({ body: undefined });

    const result = parseGitHubIssue(issue);

    expect(result.type).toBeUndefined();
    expect(result.linkedTo.requirements).toEqual([]);
  });
});

// --- syncFromGitHub (communication-based) ---

describe("syncFromGitHub", () => {
  it("listFeedbackIssuesを呼び出す", async () => {
    mockGithubClient.listFeedbackIssues.mockResolvedValue([]);

    await syncFromGitHub("/cwd");

    expect(mockGithubClient.listFeedbackIssues).toHaveBeenCalledTimes(1);
  });

  it("各issueに対してupsertFeedbackを呼び出す", async () => {
    const issues = [
      makeGitHubIssue({ number: 17 }),
      makeGitHubIssue({ number: 18 }),
    ];
    mockGithubClient.listFeedbackIssues.mockResolvedValue(issues);

    await syncFromGitHub("/cwd");

    expect(mockFeedbackRepo.upsertFeedback).toHaveBeenCalledTimes(2);
    expect(mockFeedbackRepo.upsertFeedback).toHaveBeenNthCalledWith(
      1,
      "/cwd",
      expect.objectContaining({ githubIssue: 17 }),
    );
    expect(mockFeedbackRepo.upsertFeedback).toHaveBeenNthCalledWith(
      2,
      "/cwd",
      expect.objectContaining({ githubIssue: 18 }),
    );
  });

  it("同期したissue数を返す", async () => {
    const issues = [
      makeGitHubIssue({ number: 17 }),
      makeGitHubIssue({ number: 18 }),
      makeGitHubIssue({ number: 19 }),
    ];
    mockGithubClient.listFeedbackIssues.mockResolvedValue(issues);

    const result = await syncFromGitHub("/cwd");

    expect(result).toBe(3);
  });

  it("issueがない場合は0を返す", async () => {
    mockGithubClient.listFeedbackIssues.mockResolvedValue([]);

    const result = await syncFromGitHub("/cwd");

    expect(result).toBe(0);
  });
});

// --- syncToGitHub (communication-based) ---

describe("syncToGitHub", () => {
  it("loadIndexを呼び出す", async () => {
    const index: FeedbackIndex = {
      feedbacks: [],
    };
    mockFeedbackRepo.loadIndex.mockResolvedValue(index);

    await syncToGitHub("/cwd");

    expect(mockFeedbackRepo.loadIndex).toHaveBeenCalledWith("/cwd");
  });

  it("メタデータのあるfeedbackに対してupdateIssueBodyを呼び出す", async () => {
    const index: FeedbackIndex = {
      feedbacks: [
        makeFeedbackEntry({
          githubIssue: 17,
          type: "bug",
        }),
      ],
    };
    mockFeedbackRepo.loadIndex.mockResolvedValue(index);
    mockGithubClient.getIssue.mockResolvedValue(
      makeGitHubIssue({ number: 17, body: "Issue body" }),
    );

    await syncToGitHub("/cwd");

    expect(mockGithubClient.updateIssueBody).toHaveBeenCalledWith(
      17,
      expect.stringContaining("<!-- reqord:feedback"),
    );
  });

  it("bodyが既にHTMLコメントを含み変更がない場合はupdateIssueBodyを呼び出さない", async () => {
    const existingBody = '<!-- reqord:feedback {"type":"bug","linkedTo":{"requirements":[],"createdRequirements":[],"specifications":[]}} -->';
    const index: FeedbackIndex = {
      feedbacks: [
        makeFeedbackEntry({
          githubIssue: 17,
          type: "bug",
          linkedTo: {
            requirements: [],
            createdRequirements: [],
            specifications: [],
          },
        }),
      ],
    };
    mockFeedbackRepo.loadIndex.mockResolvedValue(index);
    mockGithubClient.getIssue.mockResolvedValue(
      makeGitHubIssue({ number: 17, body: existingBody }),
    );

    const result = await syncToGitHub("/cwd");

    expect(mockGithubClient.updateIssueBody).not.toHaveBeenCalled();
    expect(result).toBe(0);
  });

  it("更新したfeedback数を返す", async () => {
    const index: FeedbackIndex = {
      feedbacks: [
        makeFeedbackEntry({ githubIssue: 17 }),
        makeFeedbackEntry({ githubIssue: 18 }),
      ],
    };
    mockFeedbackRepo.loadIndex.mockResolvedValue(index);
    mockGithubClient.getIssue.mockResolvedValueOnce(
      makeGitHubIssue({ number: 17, body: "Body 1" }),
    );
    mockGithubClient.getIssue.mockResolvedValueOnce(
      makeGitHubIssue({ number: 18, body: "Body 2" }),
    );

    const result = await syncToGitHub("/cwd");

    expect(result).toBe(2);
  });

  it("feedbackがない場合は0を返す", async () => {
    const index: FeedbackIndex = {
      feedbacks: [],
    };
    mockFeedbackRepo.loadIndex.mockResolvedValue(index);

    const result = await syncToGitHub("/cwd");

    expect(result).toBe(0);
  });
});
