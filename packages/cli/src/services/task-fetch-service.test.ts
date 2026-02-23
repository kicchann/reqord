import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Specification, TaskEntry } from "@reqord/shared";

vi.mock("../repositories/specification.js", () => ({
  findById: vi.fn(),
  findAll: vi.fn(),
  save: vi.fn(),
}));

vi.mock("./github-client.js", () => ({
  listAllIssues: vi.fn(),
  getRepoUrl: vi.fn(),
}));

vi.mock("../repositories/file-system.js", () => ({
  joinPath: vi.fn((...args: string[]) => args.join("/")),
  readYAML: vi.fn(),
  writeYAML: vi.fn(),
  getReqordDir: vi.fn(),
}));

import { fetchIssues } from "./task-fetch-service.js";
import * as specRepo from "../repositories/specification.js";
import * as githubClient from "./github-client.js";
import * as fs from "../repositories/file-system.js";

const SPEC_TAG_22_P1 = '<!-- reqord:specification {"specificationId":"spec-000022","priority":"P1","estimatedHours":8} -->\n\n## Task 1';
const SPEC_TAG_22_P2 = '<!-- reqord:specification {"specificationId":"spec-000022","priority":"P2","estimatedHours":4} -->\n\n## Task 2';
const SPEC_TAG_22_SIMPLE = '<!-- reqord:specification {"specificationId":"spec-000022"} -->';
const SPEC_TAG_25_SIMPLE = '<!-- reqord:specification {"specificationId":"spec-000025"} -->';
const SPEC_TAG_999 = '<!-- reqord:specification {"specificationId":"spec-999999"} -->';

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
    ...overrides,
  };
}

describe("fetchIssues", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(githubClient.getRepoUrl).mockResolvedValue("https://github.com/owner/repo");
    vi.mocked(fs.readYAML).mockResolvedValue({ title: "Tasks", tasks: [] });
    vi.mocked(fs.writeYAML).mockResolvedValue(undefined);
  });

  it("fetches issues and writes to tasks.yaml", async () => {
    vi.mocked(githubClient.listAllIssues).mockResolvedValue([
      {
        number: 101,
        title: "Task 1",
        state: "open",
        labels: ["reqord-generated"],
        createdAt: "2026-01-01T00:00:00Z",
        body: SPEC_TAG_22_P1,
      },
      {
        number: 102,
        title: "Task 2",
        state: "closed",
        labels: ["reqord-generated"],
        createdAt: "2026-01-01T00:00:00Z",
        body: SPEC_TAG_22_P2,
      },
    ]);

    vi.mocked(specRepo.findById).mockResolvedValue(makeSpec("spec-000022"));

    const result = await fetchIssues("/cwd");

    expect(result.totalIssuesFetched).toBe(2);
    expect(result.totalIssuesWithTag).toBe(2);
    expect(result.specsUpdated).toHaveLength(1);
    expect(result.specsUpdated[0].specId).toBe("spec-000022");
    expect(result.specsUpdated[0].issueCount).toBe(2);
    expect(result.specsUpdated[0].totalEstimatedHours).toBe(12);
    expect(result.specsUpdated[0].updated).toBe(true);

    expect(fs.writeYAML).toHaveBeenCalledTimes(1);
    const savedData = vi.mocked(fs.writeYAML).mock.calls[0][1] as { tasks: TaskEntry[] };
    expect(savedData.tasks).toHaveLength(2);
    expect(savedData.tasks[0]).toMatchObject({
      number: 101,
      title: "Task 1",
      url: "https://github.com/owner/repo/issues/101",
      priority: "P1",
      status: "open",
    });
    expect(savedData.tasks[1]).toMatchObject({
      number: 102,
      priority: "P2",
      status: "closed",
    });
  });

  it("does not write when dryRun is true", async () => {
    vi.mocked(githubClient.listAllIssues).mockResolvedValue([
      {
        number: 101,
        title: "Task 1",
        state: "open",
        labels: [],
        createdAt: "2026-01-01T00:00:00Z",
        body: SPEC_TAG_22_SIMPLE,
      },
    ]);
    vi.mocked(specRepo.findById).mockResolvedValue(makeSpec("spec-000022"));

    const result = await fetchIssues("/cwd", { dryRun: true });

    expect(fs.writeYAML).not.toHaveBeenCalled();
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
        body: SPEC_TAG_22_SIMPLE,
      },
      {
        number: 102,
        title: "Task for 25",
        state: "open",
        labels: [],
        createdAt: "2026-01-01T00:00:00Z",
        body: SPEC_TAG_25_SIMPLE,
      },
    ]);
    vi.mocked(specRepo.findById).mockResolvedValue(makeSpec("spec-000022"));

    const result = await fetchIssues("/cwd", { specId: "spec-000022" });

    expect(result.specsUpdated).toHaveLength(1);
    expect(result.specsUpdated[0].specId).toBe("spec-000022");
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
        body: SPEC_TAG_999,
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
    expect(fs.writeYAML).not.toHaveBeenCalled();
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
        body: SPEC_TAG_22_SIMPLE,
      },
    ]);
    vi.mocked(specRepo.findById).mockResolvedValue(makeSpec("spec-000022"));

    const result = await fetchIssues("/cwd");

    expect(result.totalIssuesFetched).toBe(3);
    expect(result.totalIssuesWithTag).toBe(1);
    expect(result.specsUpdated).toHaveLength(1);
    expect(result.specsUpdated[0].issueCount).toBe(1);
  });

  it("defaults priority to P2 when tag has no priority", async () => {
    vi.mocked(githubClient.listAllIssues).mockResolvedValue([
      {
        number: 101,
        title: "Task 1",
        state: "open",
        labels: [],
        createdAt: "2026-01-01T00:00:00Z",
        body: SPEC_TAG_22_SIMPLE,
      },
    ]);
    vi.mocked(specRepo.findById).mockResolvedValue(makeSpec("spec-000022"));

    await fetchIssues("/cwd");

    const savedData = vi.mocked(fs.writeYAML).mock.calls[0][1] as { tasks: TaskEntry[] };
    expect(savedData.tasks[0].priority).toBe("P2");
  });

  it("handles empty result when no issues exist", async () => {
    vi.mocked(githubClient.listAllIssues).mockResolvedValue([]);

    const result = await fetchIssues("/cwd");

    expect(result.totalIssuesFetched).toBe(0);
    expect(result.totalIssuesWithTag).toBe(0);
    expect(result.specsUpdated).toHaveLength(0);
    expect(result.issuesWithoutSpec).toHaveLength(0);
    expect(fs.writeYAML).not.toHaveBeenCalled();
  });

  it("upserts existing tasks by issue number", async () => {
    vi.mocked(fs.readYAML).mockResolvedValue({
      title: "Tasks",
      tasks: [{
        number: 101,
        title: "Old Title",
        url: "https://github.com/owner/repo/issues/101",
        linkedTo: { specifications: ["spec-000022"] },
        priority: "P1",
        status: "open",
        syncedAt: "2026-01-01T00:00:00Z",
      }],
    });
    vi.mocked(githubClient.listAllIssues).mockResolvedValue([
      {
        number: 101,
        title: "New Title",
        state: "closed",
        labels: [],
        createdAt: "2026-01-01T00:00:00Z",
        body: SPEC_TAG_22_SIMPLE,
      },
    ]);
    vi.mocked(specRepo.findById).mockResolvedValue(makeSpec("spec-000022"));

    await fetchIssues("/cwd");

    const savedData = vi.mocked(fs.writeYAML).mock.calls[0][1] as { tasks: TaskEntry[] };
    expect(savedData.tasks).toHaveLength(1);
    expect(savedData.tasks[0].title).toBe("New Title");
    expect(savedData.tasks[0].status).toBe("closed");
  });
});
