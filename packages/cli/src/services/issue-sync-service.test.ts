import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TaskEntry } from "@reqord/shared";

vi.mock("../repositories/file-system.js", () => ({
  readYAML: vi.fn(),
  writeYAML: vi.fn(),
  getReqordDir: vi.fn(),
}));

vi.mock("./github-client.js", () => ({
  getIssueDetail: vi.fn(),
}));

import { syncSpecification, syncAll } from "./issue-sync-service.js";
import * as fs from "../repositories/file-system.js";
import * as githubClient from "./github-client.js";

function makeTask(overrides: Partial<TaskEntry> = {}): TaskEntry {
  return {
    number: 1,
    title: "Task 1",
    url: "https://github.com/owner/repo/issues/1",
    linkedTo: { specifications: ["spec-000022"] },
    priority: "P1",
    status: "open",
    syncedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeTasksYaml(tasks: TaskEntry[]) {
  return { title: "Tasks", tasks };
}

describe("syncSpecification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.writeYAML).mockResolvedValue(undefined);
  });

  it("syncs tasks and updates status in tasks.yaml", async () => {
    vi.mocked(fs.readYAML).mockResolvedValue(
      makeTasksYaml([
        makeTask({ number: 101, status: "open" }),
        makeTask({ number: 102, status: "open" }),
      ]),
    );
    vi.mocked(githubClient.getIssueDetail)
      .mockResolvedValueOnce({
        number: 101,
        title: "Task 1",
        state: "closed",
        labels: [],
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        closedAt: null,
      })
      .mockResolvedValueOnce({
        number: 102,
        title: "Task 2",
        state: "open",
        labels: [],
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        closedAt: null,
      });

    const result = await syncSpecification("/cwd", "spec-000022");

    expect(result.specId).toBe("spec-000022");
    expect(result.synced).toHaveLength(2);
    expect(result.synced[0]).toMatchObject({
      number: 101,
      previousStatus: "open",
      currentStatus: "closed",
      changed: true,
    });
    expect(result.synced[1]).toMatchObject({
      number: 102,
      previousStatus: "open",
      currentStatus: "open",
      changed: false,
    });
    expect(result.progress).toMatchObject({
      total: 2,
      completed: 1,
      percentage: 50,
    });
    expect(result.errors).toHaveLength(0);
    expect(fs.writeYAML).toHaveBeenCalledTimes(1);
  });

  it("throws when tasks.yaml is not found", async () => {
    vi.mocked(fs.readYAML).mockRejectedValue(new Error("ENOENT"));

    await expect(syncSpecification("/cwd", "spec-000022")).rejects.toThrow(
      "No tasks found for spec-000022",
    );
  });

  it("throws when no tasks linked to specId", async () => {
    vi.mocked(fs.readYAML).mockResolvedValue(
      makeTasksYaml([makeTask({ linkedTo: { specifications: ["spec-999999"] } })]),
    );

    await expect(syncSpecification("/cwd", "spec-000022")).rejects.toThrow(
      "No tasks found for spec-000022",
    );
  });

  it("records errors when GitHub API fails", async () => {
    vi.mocked(fs.readYAML).mockResolvedValue(
      makeTasksYaml([makeTask({ number: 101 })]),
    );
    vi.mocked(githubClient.getIssueDetail).mockRejectedValue(
      new Error("API error"),
    );

    const result = await syncSpecification("/cwd", "spec-000022");

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      issueNumber: 101,
      message: "API error",
    });
  });

  it("updates syncedAt on each synced task", async () => {
    vi.mocked(fs.readYAML).mockResolvedValue(
      makeTasksYaml([makeTask({ number: 101, status: "open" })]),
    );
    vi.mocked(githubClient.getIssueDetail).mockResolvedValue({
      number: 101,
      title: "Task 1",
      state: "open",
      labels: [],
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      closedAt: null,
    });

    await syncSpecification("/cwd", "spec-000022");

    const savedData = vi.mocked(fs.writeYAML).mock.calls[0][1] as {
      tasks: TaskEntry[];
    };
    expect(savedData.tasks[0].syncedAt).toBeTruthy();
    expect(savedData.tasks[0].syncedAt).not.toBe("2026-01-01T00:00:00Z");
  });

  it("only syncs tasks linked to the given specId", async () => {
    vi.mocked(fs.readYAML).mockResolvedValue(
      makeTasksYaml([
        makeTask({ number: 101, linkedTo: { specifications: ["spec-000022"] } }),
        makeTask({ number: 102, linkedTo: { specifications: ["spec-000025"] } }),
      ]),
    );
    vi.mocked(githubClient.getIssueDetail).mockResolvedValue({
      number: 101,
      title: "Task 1",
      state: "open",
      labels: [],
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      closedAt: null,
    });

    const result = await syncSpecification("/cwd", "spec-000022");

    expect(result.synced).toHaveLength(1);
    expect(result.synced[0].number).toBe(101);
    expect(githubClient.getIssueDetail).toHaveBeenCalledTimes(1);
    expect(githubClient.getIssueDetail).toHaveBeenCalledWith(101);
  });

  it("calculates 100% progress when all tasks closed", async () => {
    vi.mocked(fs.readYAML).mockResolvedValue(
      makeTasksYaml([
        makeTask({ number: 101, status: "open" }),
        makeTask({ number: 102, status: "open" }),
      ]),
    );
    vi.mocked(githubClient.getIssueDetail).mockResolvedValue({
      number: 101,
      title: "Task",
      state: "closed",
      labels: [],
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      closedAt: null,
    });

    const result = await syncSpecification("/cwd", "spec-000022");

    expect(result.progress).toMatchObject({
      total: 2,
      completed: 2,
      percentage: 100,
    });
  });
});

describe("syncAll", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.writeYAML).mockResolvedValue(undefined);
  });

  it("returns empty array when no tasks.yaml", async () => {
    vi.mocked(fs.readYAML).mockRejectedValue(new Error("ENOENT"));

    const results = await syncAll("/cwd");
    expect(results).toHaveLength(0);
  });

  it("syncs all unique specs in tasks.yaml", async () => {
    vi.mocked(fs.readYAML).mockResolvedValue(
      makeTasksYaml([
        makeTask({ number: 101, linkedTo: { specifications: ["spec-000022"] } }),
        makeTask({ number: 102, linkedTo: { specifications: ["spec-000025"] } }),
      ]),
    );
    vi.mocked(githubClient.getIssueDetail).mockResolvedValue({
      number: 101,
      title: "Task",
      state: "open",
      labels: [],
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      closedAt: null,
    });

    const results = await syncAll("/cwd");

    expect(results).toHaveLength(2);
    const specIds = results.map((r) => r.specId).sort();
    expect(specIds).toEqual(["spec-000022", "spec-000025"]);
  });
});
