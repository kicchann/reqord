import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FeedbackEntry, FeedbackIndex } from "@reqord/shared";

vi.mock("../repositories/feedback.js", () => ({
  loadIndex: vi.fn(),
  saveIndex: vi.fn(),
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
  mergeFeedback,
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

beforeEach(() => {
  vi.clearAllMocks();
});

// --- parseGitHubIssue (output-based) ---

describe("parseGitHubIssue", () => {
  it("HTMLコメントからtypeを抽出する", () => {
    const issue = makeGitHubIssue({
      body: '<!-- reqord:feedback {"type":"bug","linkedTo":{"requirements":[],"createdRequirements":[],"specifications":[],"createdSpecifications":[]}} -->',
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
      body: '<!-- reqord:feedback {"linkedTo":{"requirements":["req-000006","req-000023"],"createdRequirements":[],"specifications":[],"createdSpecifications":[]}} -->',
    });

    const result = parseGitHubIssue(issue);

    expect(result.linkedTo.requirements).toEqual(["req-000006", "req-000023"]);
  });

  it("HTMLコメントからlinkedTo.specificationsを抽出する", () => {
    const issue = makeGitHubIssue({
      body: '<!-- reqord:feedback {"linkedTo":{"requirements":[],"createdRequirements":[],"specifications":["spec-000001","spec-000002"],"createdSpecifications":[]}} -->',
    });

    const result = parseGitHubIssue(issue);

    expect(result.linkedTo.specifications).toEqual(["spec-000001", "spec-000002"]);
  });

  it("issue stateをstatusに変換する (open)", () => {
    const issue = makeGitHubIssue({ state: "open" });

    const result = parseGitHubIssue(issue);

    expect(result.status).toBe("open");
  });

  it("issue stateをstatusに変換する (closed)", () => {
    const issue = makeGitHubIssue({ state: "closed" });

    const result = parseGitHubIssue(issue);

    expect(result.status).toBe("closed");
  });

  it("HTMLコメントがない場合はlinkedToを空で初期化する（createdSpecifications含む）", () => {
    const issue = makeGitHubIssue({ body: "No comment" });

    const result = parseGitHubIssue(issue);

    expect(result.linkedTo.requirements).toEqual([]);
    expect(result.linkedTo.createdRequirements).toEqual([]);
    expect(result.linkedTo.specifications).toEqual([]);
    expect(result.linkedTo.createdSpecifications).toEqual([]);
  });

  it("複数のメタデータを同時に抽出する", () => {
    const issue = makeGitHubIssue({
      number: 42,
      body: '<!-- reqord:feedback {"type":"improvement","severity":"high","linkedTo":{"requirements":["req-000006"],"createdRequirements":[],"specifications":["spec-000027"],"createdSpecifications":[]}} -->',
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

// --- mergeFeedback (output-based, v2.0.0) ---

describe("mergeFeedback", () => {
  it("type/severityはexistingを優先する", () => {
    const existing = makeFeedbackEntry({
      type: "improvement",
      severity: "high",
    });
    const fromGitHub = makeFeedbackEntry({
      type: "bug",
      severity: "low",
    });

    const result = mergeFeedback(existing, fromGitHub);

    expect(result.type).toBe("improvement");
    expect(result.severity).toBe("high");
  });

  it("existingにtype/severityがない場合はfromGitHubを使用する", () => {
    const existing = makeFeedbackEntry({
      type: undefined,
      severity: undefined,
    });
    const fromGitHub = makeFeedbackEntry({
      type: "bug",
      severity: "medium",
    });

    const result = mergeFeedback(existing, fromGitHub);

    expect(result.type).toBe("bug");
    expect(result.severity).toBe("medium");
  });

  it("linkedTo（resolved含む）は常にexistingを保持する", () => {
    const existing = makeFeedbackEntry({
      linkedTo: {
        requirements: ["req-000001"],
        createdRequirements: ["req-000002"],
        specifications: ["spec-000001"],
        createdSpecifications: [],
        resolved: {
          requirements: ["req-000001"],
          specifications: [],
        },
      },
    });
    const fromGitHub = makeFeedbackEntry({
      linkedTo: {
        requirements: [],
        createdRequirements: [],
        specifications: [],
        createdSpecifications: [],
      },
    });

    const result = mergeFeedback(existing, fromGitHub);

    expect(result.linkedTo).toEqual(existing.linkedTo);
  });

  it("syncedAtは常にfromGitHubから更新する", () => {
    const existing = makeFeedbackEntry({
      syncedAt: "2026-01-01T00:00:00.000Z",
    });
    const fromGitHub = makeFeedbackEntry({
      syncedAt: "2026-02-01T00:00:00.000Z",
    });

    const result = mergeFeedback(existing, fromGitHub);

    expect(result.syncedAt).toBe("2026-02-01T00:00:00.000Z");
  });

  it("statusは常にfromGitHubから更新する", () => {
    const existing = makeFeedbackEntry({ status: "open" });
    const fromGitHub = makeFeedbackEntry({ status: "closed" });

    const result = mergeFeedback(existing, fromGitHub);

    expect(result.status).toBe("closed");
  });

  it("githubIssueはexistingのものを使用する", () => {
    const existing = makeFeedbackEntry({ githubIssue: 17 });
    const fromGitHub = makeFeedbackEntry({ githubIssue: 17 });

    const result = mergeFeedback(existing, fromGitHub);

    expect(result.githubIssue).toBe(17);
  });
});

// --- syncFromGitHub (v2.0.0: bulk I/O + merge) ---

describe("syncFromGitHub", () => {
  it("loadIndexを1回だけ呼び出す（一括読み込み）", async () => {
    mockGithubClient.listFeedbackIssues.mockResolvedValue([
      makeGitHubIssue({ number: 17 }),
      makeGitHubIssue({ number: 18 }),
    ]);
    mockFeedbackRepo.loadIndex.mockResolvedValue(makeFeedbackIndex());

    await syncFromGitHub("/cwd");

    expect(mockFeedbackRepo.loadIndex).toHaveBeenCalledTimes(1);
  });

  it("saveIndexを1回だけ呼び出す（一括書き込み）", async () => {
    mockGithubClient.listFeedbackIssues.mockResolvedValue([
      makeGitHubIssue({ number: 17 }),
      makeGitHubIssue({ number: 18 }),
    ]);
    mockFeedbackRepo.loadIndex.mockResolvedValue(makeFeedbackIndex());

    await syncFromGitHub("/cwd");

    expect(mockFeedbackRepo.saveIndex).toHaveBeenCalledTimes(1);
  });

  it("新規issueをindex.feedbacksに追加する", async () => {
    mockGithubClient.listFeedbackIssues.mockResolvedValue([
      makeGitHubIssue({ number: 17 }),
    ]);
    mockFeedbackRepo.loadIndex.mockResolvedValue(makeFeedbackIndex());

    await syncFromGitHub("/cwd");

    const savedIndex = mockFeedbackRepo.saveIndex.mock.calls[0][1];
    expect(savedIndex.feedbacks).toHaveLength(1);
    expect(savedIndex.feedbacks[0].githubIssue).toBe(17);
  });

  it("既存issueをマージ更新する（手動メタデータ保持）", async () => {
    const existingFeedback = makeFeedbackEntry({
      githubIssue: 17,
      type: "improvement",
      severity: "high",
      linkedTo: {
        requirements: ["req-000001"],
        createdRequirements: [],
        specifications: [],
        createdSpecifications: [],
      },
      status: "open",
    });
    mockGithubClient.listFeedbackIssues.mockResolvedValue([
      makeGitHubIssue({ number: 17, state: "closed" }),
    ]);
    mockFeedbackRepo.loadIndex.mockResolvedValue(
      makeFeedbackIndex([existingFeedback]),
    );

    await syncFromGitHub("/cwd");

    const savedIndex = mockFeedbackRepo.saveIndex.mock.calls[0][1];
    expect(savedIndex.feedbacks[0].type).toBe("improvement"); // existing preserved
    expect(savedIndex.feedbacks[0].severity).toBe("high"); // existing preserved
    expect(savedIndex.feedbacks[0].linkedTo.requirements).toEqual(["req-000001"]); // existing preserved
    expect(savedIndex.feedbacks[0].status).toBe("closed"); // from GitHub
  });

  it("同期したissue数を返す", async () => {
    mockGithubClient.listFeedbackIssues.mockResolvedValue([
      makeGitHubIssue({ number: 17 }),
      makeGitHubIssue({ number: 18 }),
      makeGitHubIssue({ number: 19 }),
    ]);
    mockFeedbackRepo.loadIndex.mockResolvedValue(makeFeedbackIndex());

    const result = await syncFromGitHub("/cwd");

    expect(result).toBe(3);
  });

  it("issueがない場合は0を返す（saveIndexは呼ぶ）", async () => {
    mockGithubClient.listFeedbackIssues.mockResolvedValue([]);
    mockFeedbackRepo.loadIndex.mockResolvedValue(makeFeedbackIndex());

    const result = await syncFromGitHub("/cwd");

    expect(result).toBe(0);
    expect(mockFeedbackRepo.saveIndex).toHaveBeenCalledTimes(1);
  });
});

// --- syncToGitHub (communication-based) ---

describe("syncToGitHub", () => {
  it("loadIndexを呼び出す", async () => {
    mockFeedbackRepo.loadIndex.mockResolvedValue(makeFeedbackIndex());

    await syncToGitHub("/cwd");

    expect(mockFeedbackRepo.loadIndex).toHaveBeenCalledWith("/cwd");
  });

  it("メタデータのあるfeedbackに対してupdateIssueBodyを呼び出す", async () => {
    mockFeedbackRepo.loadIndex.mockResolvedValue(
      makeFeedbackIndex([makeFeedbackEntry({ githubIssue: 17, type: "bug" })]),
    );
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
    const existingBody = '<!-- reqord:feedback {"type":"bug","linkedTo":{"requirements":[],"createdRequirements":[],"specifications":[],"createdSpecifications":[]}} -->';
    mockFeedbackRepo.loadIndex.mockResolvedValue(
      makeFeedbackIndex([
        makeFeedbackEntry({
          githubIssue: 17,
          type: "bug",
          linkedTo: {
            requirements: [],
            createdRequirements: [],
            specifications: [],
            createdSpecifications: [],
          },
        }),
      ]),
    );
    mockGithubClient.getIssue.mockResolvedValue(
      makeGitHubIssue({ number: 17, body: existingBody }),
    );

    const result = await syncToGitHub("/cwd");

    expect(mockGithubClient.updateIssueBody).not.toHaveBeenCalled();
    expect(result).toBe(0);
  });

  it("更新したfeedback数を返す", async () => {
    mockFeedbackRepo.loadIndex.mockResolvedValue(
      makeFeedbackIndex([
        makeFeedbackEntry({ githubIssue: 17 }),
        makeFeedbackEntry({ githubIssue: 18 }),
      ]),
    );
    mockGithubClient.getIssue
      .mockResolvedValueOnce(makeGitHubIssue({ number: 17, body: "Body 1" }))
      .mockResolvedValueOnce(makeGitHubIssue({ number: 18, body: "Body 2" }));

    const result = await syncToGitHub("/cwd");

    expect(result).toBe(2);
  });

  it("feedbackがない場合は0を返す", async () => {
    mockFeedbackRepo.loadIndex.mockResolvedValue(makeFeedbackIndex());

    const result = await syncToGitHub("/cwd");

    expect(result).toBe(0);
  });
});
