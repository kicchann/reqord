import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Specification } from "@reqord/shared";

vi.mock("../repositories/specification.js", () => ({
  findById: vi.fn(),
  findAll: vi.fn(),
  save: vi.fn(),
}));

vi.mock("./github-client.js", () => ({
  listAllIssues: vi.fn(),
  getRepoUrl: vi.fn(),
}));

import { fetchIssues } from "./issue-fetch-service.js";
import * as specRepo from "../repositories/specification.js";
import * as githubClient from "./github-client.js";

function makeSpec(id: string, overrides?: Partial<Specification>): Specification {
  return {
    id,
    requirementId: "req-000001",
    version: "1.0.0",
    status: "approved",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    versionHistory: [],
    files: { design: `specifications/${id}/design.md`, supplementary: [] },
    flags: [],
    ...overrides,
  };
}

describe("fetchIssues", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(githubClient.getRepoUrl).mockResolvedValue("https://github.com/owner/repo");
  });

  it("fetches issues and returns spec fetch results", async () => {
    vi.mocked(githubClient.listAllIssues).mockResolvedValue([
      {
        number: 101,
        title: "Task 1",
        state: "open",
        labels: ["reqord-generated"],
        createdAt: "2026-01-01T00:00:00Z",
        body: '<!-- reqord:specification {"specificationId":"spec-000022","priority":"P1","estimatedHours":8} -->\n\n## Task 1',
      },
      {
        number: 102,
        title: "Task 2",
        state: "closed",
        labels: ["reqord-generated"],
        createdAt: "2026-01-01T00:00:00Z",
        body: '<!-- reqord:specification {"specificationId":"spec-000022","priority":"P2","estimatedHours":4} -->\n\n## Task 2',
      },
    ]);

    const spec = makeSpec("spec-000022");
    vi.mocked(specRepo.findById).mockResolvedValue(spec);

    const result = await fetchIssues("/cwd");

    expect(result.totalIssuesFetched).toBe(2);
    expect(result.totalIssuesWithTag).toBe(2);
    expect(result.specsUpdated).toHaveLength(1);
    expect(result.specsUpdated[0].specId).toBe("spec-000022");
    expect(result.specsUpdated[0].issueCount).toBe(2);
    expect(result.specsUpdated[0].totalEstimatedHours).toBe(12);
  });

  it("does not write to spec when dryRun is true", async () => {
    vi.mocked(githubClient.listAllIssues).mockResolvedValue([
      {
        number: 101,
        title: "Task 1",
        state: "open",
        labels: [],
        createdAt: "2026-01-01T00:00:00Z",
        body: '<!-- reqord:specification {"specificationId":"spec-000022"} -->',
      },
    ]);

    vi.mocked(specRepo.findById).mockResolvedValue(makeSpec("spec-000022"));

    const result = await fetchIssues("/cwd", { dryRun: true });

    expect(specRepo.save).not.toHaveBeenCalled();
    expect(result.specsUpdated[0].updated).toBe(false);
  });

  it("filters by specId when provided", async () => {
    vi.mocked(githubClient.listAllIssues).mockResolvedValue([
      {
        number: 101,
        title: "Task for 22",
        state: "open",
        labels: [],
        createdAt: "2026-01-01T00:00:00Z",
        body: '<!-- reqord:specification {"specificationId":"spec-000022"} -->',
      },
      {
        number: 102,
        title: "Task for 25",
        state: "open",
        labels: [],
        createdAt: "2026-01-01T00:00:00Z",
        body: '<!-- reqord:specification {"specificationId":"spec-000025"} -->',
      },
    ]);

    vi.mocked(specRepo.findById).mockResolvedValue(makeSpec("spec-000022"));

    const result = await fetchIssues("/cwd", { specId: "spec-000022" });

    expect(result.specsUpdated).toHaveLength(1);
    expect(result.specsUpdated[0].specId).toBe("spec-000022");
    // spec-000025 should not be processed
    expect(specRepo.findById).toHaveBeenCalledTimes(1);
    expect(specRepo.findById).toHaveBeenCalledWith("/cwd", "spec-000022");
  });

  it("reports orphan issues when spec does not exist locally", async () => {
    vi.mocked(githubClient.listAllIssues).mockResolvedValue([
      {
        number: 200,
        title: "Orphan task",
        state: "open",
        labels: [],
        createdAt: "2026-01-01T00:00:00Z",
        body: '<!-- reqord:specification {"specificationId":"spec-999999"} -->',
      },
    ]);

    vi.mocked(specRepo.findById).mockResolvedValue(null);

    const result = await fetchIssues("/cwd");

    expect(result.issuesWithoutSpec).toHaveLength(1);
    expect(result.issuesWithoutSpec[0]).toEqual({
      number: 200,
      title: "Orphan task",
      specId: "spec-999999",
    });
    expect(result.specsUpdated).toHaveLength(0);
    expect(specRepo.save).not.toHaveBeenCalled();
  });

  it("skips issues without body or without spec tag", async () => {
    vi.mocked(githubClient.listAllIssues).mockResolvedValue([
      {
        number: 1,
        title: "No body",
        state: "open",
        labels: [],
        createdAt: "2026-01-01T00:00:00Z",
      },
      {
        number: 2,
        title: "No tag",
        state: "open",
        labels: [],
        createdAt: "2026-01-01T00:00:00Z",
        body: "## Just a normal issue",
      },
      {
        number: 3,
        title: "With tag",
        state: "open",
        labels: [],
        createdAt: "2026-01-01T00:00:00Z",
        body: '<!-- reqord:specification {"specificationId":"spec-000022"} -->',
      },
    ]);

    vi.mocked(specRepo.findById).mockResolvedValue(makeSpec("spec-000022"));

    const result = await fetchIssues("/cwd");

    expect(result.totalIssuesFetched).toBe(3);
    expect(result.totalIssuesWithTag).toBe(1);
    expect(result.specsUpdated).toHaveLength(1);
    expect(result.specsUpdated[0].issueCount).toBe(1);
  });

  it("handles empty result when no issues exist", async () => {
    vi.mocked(githubClient.listAllIssues).mockResolvedValue([]);

    const result = await fetchIssues("/cwd");

    expect(result.totalIssuesFetched).toBe(0);
    expect(result.totalIssuesWithTag).toBe(0);
    expect(result.specsUpdated).toHaveLength(0);
    expect(result.issuesWithoutSpec).toHaveLength(0);
  });
});
