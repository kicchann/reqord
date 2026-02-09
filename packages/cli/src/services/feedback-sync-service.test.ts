import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FeedbackEntry, FeedbackIndex } from "@reqord/shared";

vi.mock("../repositories/feedback.js", () => ({
  loadIndex: vi.fn(),
  saveIndex: vi.fn(),
  upsertFeedback: vi.fn(),
}));

vi.mock("./github-client.js", () => ({
  listFeedbackIssues: vi.fn(),
  addLabelsToIssue: vi.fn(),
}));

import * as feedbackRepo from "../repositories/feedback.js";
import * as githubClient from "./github-client.js";
import type { GitHubIssue } from "./github-client.js";
import {
  syncFromGitHub,
  syncToGitHub,
  parseGitHubIssue,
  buildLabelsFromFeedback,
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
  it("ラベルからtypeを抽出する", () => {
    const issue = makeGitHubIssue({
      labels: ["feedback", "bug"],
    });

    const result = parseGitHubIssue(issue);

    expect(result.type).toBe("bug");
  });

  it("type候補がない場合はundefinedを返す", () => {
    const issue = makeGitHubIssue({
      labels: ["feedback", "priority:high"],
    });

    const result = parseGitHubIssue(issue);

    expect(result.type).toBeUndefined();
  });

  it("req:NNNNNNラベルをlinkedTo.requirementsに抽出する", () => {
    const issue = makeGitHubIssue({
      labels: ["feedback", "req:000006", "req:000023"],
    });

    const result = parseGitHubIssue(issue);

    expect(result.linkedTo.requirements).toEqual(["req-000006", "req-000023"]);
  });

  it("spec:NNNNNNラベルをlinkedTo.specificationsに抽出する", () => {
    const issue = makeGitHubIssue({
      labels: ["feedback", "spec:000001", "spec:000002"],
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

  it("createdRequirementsを空配列で初期化する", () => {
    const issue = makeGitHubIssue();

    const result = parseGitHubIssue(issue);

    expect(result.linkedTo.createdRequirements).toEqual([]);
  });

  it("複数のメタデータを同時に抽出する", () => {
    const issue = makeGitHubIssue({
      number: 42,
      labels: ["feedback", "improvement", "req:000006", "spec:000027"],
      state: "open",
    });

    const result = parseGitHubIssue(issue);

    expect(result.githubIssue).toBe(42);
    expect(result.type).toBe("improvement");
    expect(result.linkedTo.requirements).toEqual(["req-000006"]);
    expect(result.linkedTo.specifications).toEqual(["spec-000027"]);
    expect(result.status).toBe("open");
  });
});

// --- buildLabelsFromFeedback (output-based) ---

describe("buildLabelsFromFeedback", () => {
  it("typeをラベルとして含める", () => {
    const feedback = makeFeedbackEntry({
      type: "bug",
    });

    const result = buildLabelsFromFeedback(feedback);

    expect(result).toContain("bug");
  });

  it("typeがundefinedの場合は含めない", () => {
    const feedback = makeFeedbackEntry({
      type: undefined,
    });

    const result = buildLabelsFromFeedback(feedback);

    expect(result).not.toContain(undefined);
  });

  it("linkedTo.requirementsをreq:NNNNNN形式で含める", () => {
    const feedback = makeFeedbackEntry({
      linkedTo: {
        requirements: ["req-000006", "req-000023"],
        createdRequirements: [],
        specifications: [],
      },
    });

    const result = buildLabelsFromFeedback(feedback);

    expect(result).toContain("req:000006");
    expect(result).toContain("req:000023");
  });

  it("linkedTo.specificationsをspec:NNNNNN形式で含める", () => {
    const feedback = makeFeedbackEntry({
      linkedTo: {
        requirements: [],
        createdRequirements: [],
        specifications: ["spec-000001", "spec-000002"],
      },
    });

    const result = buildLabelsFromFeedback(feedback);

    expect(result).toContain("spec:000001");
    expect(result).toContain("spec:000002");
  });

  it("メタデータがない場合は空配列を返す", () => {
    const feedback = makeFeedbackEntry({
      type: undefined,
      linkedTo: {
        requirements: [],
        createdRequirements: [],
        specifications: [],
      },
    });

    const result = buildLabelsFromFeedback(feedback);

    expect(result).toEqual([]);
  });

  it("全てのメタデータをラベルに変換する", () => {
    const feedback = makeFeedbackEntry({
      type: "improvement",
      linkedTo: {
        requirements: ["req-000006"],
        createdRequirements: [],
        specifications: ["spec-000027"],
      },
    });

    const result = buildLabelsFromFeedback(feedback);

    expect(result).toEqual(["improvement", "req:000006", "spec:000027"]);
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

  it("ラベルが空でない各feedbackに対してaddLabelsToIssueを呼び出す", async () => {
    const index: FeedbackIndex = {
      feedbacks: [
        makeFeedbackEntry({
          githubIssue: 17,
          type: "bug",
        }),
        makeFeedbackEntry({
          githubIssue: 18,
          type: "improvement",
          linkedTo: {
            requirements: ["req-000006"],
            createdRequirements: [],
            specifications: [],
          },
        }),
      ],
    };
    mockFeedbackRepo.loadIndex.mockResolvedValue(index);

    await syncToGitHub("/cwd");

    expect(mockGithubClient.addLabelsToIssue).toHaveBeenCalledTimes(2);
    expect(mockGithubClient.addLabelsToIssue).toHaveBeenNthCalledWith(
      1,
      17,
      ["bug"],
    );
    expect(mockGithubClient.addLabelsToIssue).toHaveBeenNthCalledWith(
      2,
      18,
      ["improvement", "req:000006"],
    );
  });

  it("ラベルが空の場合はaddLabelsToIssueを呼び出さない", async () => {
    const index: FeedbackIndex = {
      feedbacks: [
        makeFeedbackEntry({
          githubIssue: 17,
          type: undefined,
          linkedTo: {
            requirements: [],
            createdRequirements: [],
            specifications: [],
          },
        }),
      ],
    };
    mockFeedbackRepo.loadIndex.mockResolvedValue(index);

    const result = await syncToGitHub("/cwd");

    expect(mockGithubClient.addLabelsToIssue).not.toHaveBeenCalled();
    expect(result).toBe(0);
  });

  it("同期したfeedback数を返す", async () => {
    const index: FeedbackIndex = {
      feedbacks: [
        makeFeedbackEntry({ githubIssue: 17 }),
        makeFeedbackEntry({ githubIssue: 18 }),
      ],
    };
    mockFeedbackRepo.loadIndex.mockResolvedValue(index);

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
