import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Specification } from "@reqord/shared";

vi.mock("../repositories/specification.js", () => ({
  findById: vi.fn(),
  findAll: vi.fn(),
  save: vi.fn(),
}));

vi.mock("./github-client.js", () => ({
  getIssueDetail: vi.fn(),
}));

vi.mock("../utils/progress-calculator.js", () => ({
  calculateProgress: vi.fn(),
}));

import * as specRepo from "../repositories/specification.js";
import * as githubClient from "./github-client.js";
import { calculateProgress } from "../utils/progress-calculator.js";
import type { GitHubIssueDetail } from "./github-client.js";
import { mapGitHubState, syncSpecification, syncAll } from "./issue-sync-service.js";

const mockSpecRepo = vi.mocked(specRepo);
const mockGithubClient = vi.mocked(githubClient);
const mockCalculateProgress = vi.mocked(calculateProgress);

function makeSpecification(overrides: Partial<Specification> = {}): Specification {
  return {
    id: "spec-000001",
    requirementId: "req-000001",
    version: "1.0.0",
    status: "draft",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    versionHistory: [],
    ...overrides,
  } as Specification;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// --- mapGitHubState (output-based) ---

describe("mapGitHubState", () => {
  it("open → open", () => {
    const result = mapGitHubState("open");
    expect(result).toBe("open");
  });

  it("closed → closed", () => {
    const result = mapGitHubState("closed");
    expect(result).toBe("closed");
  });
});

// --- syncSpecification (communication-based) ---

describe("syncSpecification", () => {
  it("spec not found → throws error", async () => {
    mockSpecRepo.findById.mockResolvedValue(null);

    await expect(syncSpecification("/cwd", "spec-000001")).rejects.toThrow(
      "Specification not found: spec-000001"
    );
  });

  it("spec has no implementation → throws error", async () => {
    const spec = makeSpecification();
    mockSpecRepo.findById.mockResolvedValue(spec);

    await expect(syncSpecification("/cwd", "spec-000001")).rejects.toThrow(
      "No implementation found for spec-000001"
    );
  });

  it("spec has no issues → throws error", async () => {
    const spec = makeSpecification({
      implementation: {
        issues: [],
        totalEstimatedHours: 0,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    });
    mockSpecRepo.findById.mockResolvedValue(spec);

    await expect(syncSpecification("/cwd", "spec-000001")).rejects.toThrow(
      "No issues found for spec-000001"
    );
  });

  it("syncs 3 issues (1 changed from open→closed, 2 unchanged)", async () => {
    const spec = makeSpecification({
      implementation: {
        issues: [
          {
            number: 101,
            title: "Issue 101",
            url: "https://github.com/test/repo/issues/101",
            priority: "high",
            status: "open",
          },
          {
            number: 102,
            title: "Issue 102",
            url: "https://github.com/test/repo/issues/102",
            priority: "medium",
            status: "open",
          },
          {
            number: 103,
            title: "Issue 103",
            url: "https://github.com/test/repo/issues/103",
            priority: "low",
            status: "closed",
          },
        ],
        totalEstimatedHours: 10,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    });
    mockSpecRepo.findById.mockResolvedValue(spec);

    const ghIssue101: GitHubIssueDetail = {
      number: 101,
      title: "Issue 101",
      state: "closed",
      labels: [],
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-02T00:00:00Z",
      closedAt: "2026-01-02T00:00:00Z",
    };
    const ghIssue102: GitHubIssueDetail = {
      number: 102,
      title: "Issue 102",
      state: "open",
      labels: [],
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      closedAt: null,
    };
    const ghIssue103: GitHubIssueDetail = {
      number: 103,
      title: "Issue 103",
      state: "closed",
      labels: [],
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      closedAt: "2026-01-01T00:00:00Z",
    };

    mockGithubClient.getIssueDetail.mockResolvedValueOnce(ghIssue101);
    mockGithubClient.getIssueDetail.mockResolvedValueOnce(ghIssue102);
    mockGithubClient.getIssueDetail.mockResolvedValueOnce(ghIssue103);

    mockCalculateProgress.mockReturnValue({
      total: 3,
      completed: 2,
      percentage: 67,
    });

    const result = await syncSpecification("/cwd", "spec-000001");

    expect(result.specId).toBe("spec-000001");
    expect(result.synced).toHaveLength(3);
    expect(result.synced[0]).toEqual({
      number: 101,
      title: "Issue 101",
      previousStatus: "open",
      currentStatus: "closed",
      changed: true,
    });
    expect(result.synced[1]).toEqual({
      number: 102,
      title: "Issue 102",
      previousStatus: "open",
      currentStatus: "open",
      changed: false,
    });
    expect(result.synced[2]).toEqual({
      number: 103,
      title: "Issue 103",
      previousStatus: "closed",
      currentStatus: "closed",
      changed: false,
    });
    expect(result.errors).toEqual([]);
  });

  it("updates spec JSON with new statuses and progress", async () => {
    const spec = makeSpecification({
      implementation: {
        issues: [
          {
            number: 101,
            title: "Issue 101",
            url: "https://github.com/test/repo/issues/101",
            priority: "high",
            status: "open",
          },
          {
            number: 102,
            title: "Issue 102",
            url: "https://github.com/test/repo/issues/102",
            priority: "medium",
            status: "open",
          },
        ],
        totalEstimatedHours: 10,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    });
    mockSpecRepo.findById.mockResolvedValue(spec);

    const ghIssue101: GitHubIssueDetail = {
      number: 101,
      title: "Issue 101",
      state: "closed",
      labels: [],
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-02T00:00:00Z",
      closedAt: "2026-01-02T00:00:00Z",
    };
    const ghIssue102: GitHubIssueDetail = {
      number: 102,
      title: "Issue 102",
      state: "open",
      labels: [],
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      closedAt: null,
    };

    mockGithubClient.getIssueDetail.mockResolvedValueOnce(ghIssue101);
    mockGithubClient.getIssueDetail.mockResolvedValueOnce(ghIssue102);

    mockCalculateProgress.mockReturnValue({
      total: 2,
      completed: 1,
      percentage: 50,
    });

    await syncSpecification("/cwd", "spec-000001");

    expect(mockSpecRepo.save).toHaveBeenCalledTimes(1);
    const savedSpec = mockSpecRepo.save.mock.calls[0][1];
    expect(savedSpec.implementation?.issues[0].status).toBe("closed");
    expect(savedSpec.implementation?.issues[1].status).toBe("open");
    expect(savedSpec.implementation?.progress).toMatchObject({
      total: 2,
      completed: 1,
      percentage: 50,
    });
    expect(savedSpec.implementation?.progress?.lastSyncedAt).toBeDefined();
  });

  it("progress is calculated correctly and includes lastSyncedAt", async () => {
    const spec = makeSpecification({
      implementation: {
        issues: [
          {
            number: 101,
            title: "Issue 101",
            url: "https://github.com/test/repo/issues/101",
            priority: "high",
            status: "open",
          },
        ],
        totalEstimatedHours: 5,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    });
    mockSpecRepo.findById.mockResolvedValue(spec);

    const ghIssue101: GitHubIssueDetail = {
      number: 101,
      title: "Issue 101",
      state: "closed",
      labels: [],
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-02T00:00:00Z",
      closedAt: "2026-01-02T00:00:00Z",
    };

    mockGithubClient.getIssueDetail.mockResolvedValueOnce(ghIssue101);

    mockCalculateProgress.mockReturnValue({
      total: 1,
      completed: 1,
      percentage: 100,
    });

    const result = await syncSpecification("/cwd", "spec-000001");

    expect(result.progress).toMatchObject({
      total: 1,
      completed: 1,
      percentage: 100,
    });
    expect(mockCalculateProgress).toHaveBeenCalledWith([
      expect.objectContaining({
        number: 101,
        status: "closed",
      }),
    ]);
  });

  it("GitHub API error for one issue → error recorded, other issues still synced", async () => {
    const spec = makeSpecification({
      implementation: {
        issues: [
          {
            number: 101,
            title: "Issue 101",
            url: "https://github.com/test/repo/issues/101",
            priority: "high",
            status: "open",
          },
          {
            number: 102,
            title: "Issue 102",
            url: "https://github.com/test/repo/issues/102",
            priority: "medium",
            status: "open",
          },
          {
            number: 103,
            title: "Issue 103",
            url: "https://github.com/test/repo/issues/103",
            priority: "low",
            status: "open",
          },
        ],
        totalEstimatedHours: 10,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    });
    mockSpecRepo.findById.mockResolvedValue(spec);

    const ghIssue101: GitHubIssueDetail = {
      number: 101,
      title: "Issue 101",
      state: "closed",
      labels: [],
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-02T00:00:00Z",
      closedAt: "2026-01-02T00:00:00Z",
    };
    const ghIssue103: GitHubIssueDetail = {
      number: 103,
      title: "Issue 103",
      state: "open",
      labels: [],
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      closedAt: null,
    };

    mockGithubClient.getIssueDetail.mockResolvedValueOnce(ghIssue101);
    mockGithubClient.getIssueDetail.mockRejectedValueOnce(new Error("API rate limit exceeded"));
    mockGithubClient.getIssueDetail.mockResolvedValueOnce(ghIssue103);

    mockCalculateProgress.mockReturnValue({
      total: 3,
      completed: 1,
      percentage: 33,
    });

    const result = await syncSpecification("/cwd", "spec-000001");

    expect(result.synced).toHaveLength(2);
    expect(result.synced[0].number).toBe(101);
    expect(result.synced[1].number).toBe(103);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toEqual({
      issueNumber: 102,
      message: "API rate limit exceeded",
    });
  });

  it("all issues already up to date → no changes, progress still updated", async () => {
    const spec = makeSpecification({
      implementation: {
        issues: [
          {
            number: 101,
            title: "Issue 101",
            url: "https://github.com/test/repo/issues/101",
            priority: "high",
            status: "closed",
          },
        ],
        totalEstimatedHours: 5,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    });
    mockSpecRepo.findById.mockResolvedValue(spec);

    const ghIssue101: GitHubIssueDetail = {
      number: 101,
      title: "Issue 101",
      state: "closed",
      labels: [],
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-02T00:00:00Z",
      closedAt: "2026-01-02T00:00:00Z",
    };

    mockGithubClient.getIssueDetail.mockResolvedValueOnce(ghIssue101);

    mockCalculateProgress.mockReturnValue({
      total: 1,
      completed: 1,
      percentage: 100,
    });

    const result = await syncSpecification("/cwd", "spec-000001");

    expect(result.synced).toHaveLength(1);
    expect(result.synced[0].changed).toBe(false);
    expect(mockSpecRepo.save).toHaveBeenCalledTimes(1);
  });
});

// --- syncAll (communication-based) ---

describe("syncAll", () => {
  it("syncs all specs with implementation field", async () => {
    const spec1 = makeSpecification({
      id: "spec-000001",
      implementation: {
        issues: [
          {
            number: 101,
            title: "Issue 101",
            url: "https://github.com/test/repo/issues/101",
            priority: "high",
            status: "open",
          },
        ],
        totalEstimatedHours: 5,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    });
    const spec2 = makeSpecification({
      id: "spec-000002",
      implementation: {
        issues: [
          {
            number: 201,
            title: "Issue 201",
            url: "https://github.com/test/repo/issues/201",
            priority: "medium",
            status: "open",
          },
        ],
        totalEstimatedHours: 3,
        createdAt: "2026-01-02T00:00:00.000Z",
      },
    });

    mockSpecRepo.findAll.mockResolvedValue([spec1, spec2]);

    mockGithubClient.getIssueDetail.mockResolvedValueOnce({
      number: 101,
      title: "Issue 101",
      state: "closed",
      labels: [],
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-02T00:00:00Z",
      closedAt: "2026-01-02T00:00:00Z",
    });

    mockGithubClient.getIssueDetail.mockResolvedValueOnce({
      number: 201,
      title: "Issue 201",
      state: "open",
      labels: [],
      createdAt: "2026-01-02T00:00:00Z",
      updatedAt: "2026-01-02T00:00:00Z",
      closedAt: null,
    });

    mockCalculateProgress
      .mockReturnValueOnce({ total: 1, completed: 1, percentage: 100 })
      .mockReturnValueOnce({ total: 1, completed: 0, percentage: 0 });

    const results = await syncAll("/cwd");

    expect(results).toHaveLength(2);
    expect(results[0].specId).toBe("spec-000001");
    expect(results[1].specId).toBe("spec-000002");
  });

  it("skips specs without implementation field", async () => {
    const spec1 = makeSpecification({
      id: "spec-000001",
      implementation: {
        issues: [
          {
            number: 101,
            title: "Issue 101",
            url: "https://github.com/test/repo/issues/101",
            priority: "high",
            status: "open",
          },
        ],
        totalEstimatedHours: 5,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    });
    const spec2 = makeSpecification({
      id: "spec-000002",
      // No implementation field
    });

    mockSpecRepo.findAll.mockResolvedValue([spec1, spec2]);

    mockGithubClient.getIssueDetail.mockResolvedValueOnce({
      number: 101,
      title: "Issue 101",
      state: "closed",
      labels: [],
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-02T00:00:00Z",
      closedAt: "2026-01-02T00:00:00Z",
    });

    mockCalculateProgress.mockReturnValueOnce({ total: 1, completed: 1, percentage: 100 });

    const results = await syncAll("/cwd");

    expect(results).toHaveLength(1);
    expect(results[0].specId).toBe("spec-000001");
  });

  it("returns empty array when no specs found", async () => {
    mockSpecRepo.findAll.mockResolvedValue([]);

    const results = await syncAll("/cwd");

    expect(results).toEqual([]);
  });
});
