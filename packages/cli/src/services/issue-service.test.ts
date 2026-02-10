import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Specification } from "@reqord/shared";

// Mock repositories and services
vi.mock("../repositories/specification.js", () => ({
  findById: vi.fn(),
  findByIdOrThrow: vi.fn(),
  save: vi.fn(),
}));

vi.mock("./github-client.js", () => ({
  createIssue: vi.fn(),
}));

vi.mock("../repositories/file-system.js", () => ({
  exists: vi.fn(),
  readText: vi.fn(),
  joinPath: vi.fn((...args: string[]) => args.join("/")),
}));

import * as specRepo from "../repositories/specification.js";
import * as githubClient from "./github-client.js";
import * as fs from "../repositories/file-system.js";
import { createIssuesFromSpec, buildIssueBody, buildLabels } from "./issue-service.js";

const mockSpecRepo = vi.mocked(specRepo);
const mockGithubClient = vi.mocked(githubClient);
const mockFs = vi.mocked(fs);

function makeSpecification(overrides: Partial<Specification> = {}): Specification {
  return {
    id: "spec-000001",
    requirementId: "req-000001",
    version: "1.0.0",
    status: "approved",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    versionHistory: [],
    files: { design: "specifications/spec-000001/design.md", supplementary: [] },
    flags: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// --- Cycle 1: createIssuesFromSpec - Specification not found ---

describe("createIssuesFromSpec", () => {
  it("Specification not found → throws error", async () => {
    mockSpecRepo.findByIdOrThrow.mockRejectedValue(new Error("Specification spec-999999 not found"));

    await expect(
      createIssuesFromSpec("/cwd", {
        specId: "spec-999999",
        tasksFile: "tasks.json",
      })
    ).rejects.toThrow("Specification spec-999999 not found");
  });

  it("Specification not approved → throws error", async () => {
    mockSpecRepo.findByIdOrThrow.mockResolvedValue(makeSpecification({ status: "draft" }));

    await expect(
      createIssuesFromSpec("/cwd", {
        specId: "spec-000001",
        tasksFile: "tasks.json",
      })
    ).rejects.toThrow("must be approved");
  });

  it("Tasks file not found → throws error", async () => {
    mockSpecRepo.findByIdOrThrow.mockResolvedValue(makeSpecification());
    mockFs.exists.mockResolvedValue(false);

    await expect(
      createIssuesFromSpec("/cwd", {
        specId: "spec-000001",
        tasksFile: "tasks.json",
      })
    ).rejects.toThrow("not found");
  });

  it("Tasks file with invalid JSON → throws error", async () => {
    mockSpecRepo.findByIdOrThrow.mockResolvedValue(makeSpecification());
    mockFs.exists.mockResolvedValue(true);
    mockFs.readText.mockResolvedValue("invalid json");

    await expect(
      createIssuesFromSpec("/cwd", {
        specId: "spec-000001",
        tasksFile: "tasks.json",
      })
    ).rejects.toThrow();
  });

  it("Tasks count exceeds maxIssues → throws error", async () => {
    mockSpecRepo.findByIdOrThrow.mockResolvedValue(makeSpecification());
    mockFs.exists.mockResolvedValue(true);
    mockFs.readText.mockResolvedValue(JSON.stringify({
      tasks: [
        { title: "Task 1", description: "Desc 1", priority: "P1", estimatedHours: 2, dependencies: [] },
        { title: "Task 2", description: "Desc 2", priority: "P2", estimatedHours: 3, dependencies: [] },
        { title: "Task 3", description: "Desc 3", priority: "P3", estimatedHours: 1, dependencies: [] },
      ]
    }));

    await expect(
      createIssuesFromSpec("/cwd", {
        specId: "spec-000001",
        tasksFile: "tasks.json",
        maxIssues: 2,
      })
    ).rejects.toThrow("exceeds maximum");
  });

  it("Successful issue creation (2 tasks) → creates 2 issues and returns result", async () => {
    mockSpecRepo.findByIdOrThrow.mockResolvedValue(makeSpecification());
    mockFs.exists.mockResolvedValue(true);
    mockFs.readText.mockResolvedValue(JSON.stringify({
      tasks: [
        { title: "Task 1", description: "Desc 1", priority: "P1", estimatedHours: 2, dependencies: [] },
        { title: "Task 2", description: "Desc 2", priority: "P2", estimatedHours: 3, dependencies: [] },
      ]
    }));
    mockGithubClient.createIssue
      .mockResolvedValueOnce({ number: 101, url: "https://github.com/test/repo/issues/101" })
      .mockResolvedValueOnce({ number: 102, url: "https://github.com/test/repo/issues/102" });

    const result = await createIssuesFromSpec("/cwd", {
      specId: "spec-000001",
      tasksFile: "tasks.json",
    });

    expect(result.specId).toBe("spec-000001");
    expect(result.issues).toHaveLength(2);
    expect(result.issues[0]).toMatchObject({
      title: "Task 1",
      number: 101,
      url: "https://github.com/test/repo/issues/101",
      priority: "P1",
      estimatedHours: 2,
      labels: ["reqord-generated", "P1"],
    });
    expect(result.issues[1]).toMatchObject({
      title: "Task 2",
      number: 102,
      url: "https://github.com/test/repo/issues/102",
      priority: "P2",
      estimatedHours: 3,
      labels: ["reqord-generated", "P2"],
    });
    expect(result.totalEstimatedHours).toBe(5);
  });

  it("Dry-run mode → no GitHub API calls, no spec update, returns result without numbers/URLs", async () => {
    mockSpecRepo.findByIdOrThrow.mockResolvedValue(makeSpecification());
    mockFs.exists.mockResolvedValue(true);
    mockFs.readText.mockResolvedValue(JSON.stringify({
      tasks: [
        { title: "Task 1", description: "Desc 1", priority: "P1", estimatedHours: 2, dependencies: [] },
      ]
    }));

    const result = await createIssuesFromSpec("/cwd", {
      specId: "spec-000001",
      tasksFile: "tasks.json",
      dryRun: true,
    });

    expect(result.specId).toBe("spec-000001");
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]).toMatchObject({
      title: "Task 1",
      priority: "P1",
      estimatedHours: 2,
      labels: ["reqord-generated", "P1"],
    });
    expect(result.issues[0].number).toBeUndefined();
    expect(result.issues[0].url).toBeUndefined();
    expect(result.totalEstimatedHours).toBe(2);
    expect(mockGithubClient.createIssue).not.toHaveBeenCalled();
    expect(mockSpecRepo.save).not.toHaveBeenCalled();
  });

  it("Updates specification JSON with implementation after creation", async () => {
    const spec = makeSpecification();
    mockSpecRepo.findByIdOrThrow.mockResolvedValue(spec);
    mockFs.exists.mockResolvedValue(true);
    mockFs.readText.mockResolvedValue(JSON.stringify({
      tasks: [
        { title: "Task 1", description: "Desc 1", priority: "P1", estimatedHours: 2, dependencies: [] },
      ]
    }));
    mockGithubClient.createIssue.mockResolvedValue({
      number: 101,
      url: "https://github.com/test/repo/issues/101"
    });

    await createIssuesFromSpec("/cwd", {
      specId: "spec-000001",
      tasksFile: "tasks.json",
    });

    expect(mockSpecRepo.save).toHaveBeenCalledWith(
      "/cwd",
      expect.objectContaining({
        id: "spec-000001",
        implementation: expect.objectContaining({
          issues: expect.arrayContaining([
            expect.objectContaining({
              number: 101,
              title: "Task 1",
              url: "https://github.com/test/repo/issues/101",
              priority: "P1",
              status: "open",
            }),
          ]),
          totalEstimatedHours: 2,
          createdAt: expect.any(String),
        }),
        updatedAt: expect.any(String),
      })
    );
  });
});

// --- Helper function tests ---

describe("buildLabels", () => {
  it("returns reqord-generated and priority labels", () => {
    const task = {
      title: "Test Task",
      description: "Test description",
      priority: "P1" as const,
      estimatedHours: 5,
      dependencies: [],
    };

    const labels = buildLabels(task);

    expect(labels).toEqual(["reqord-generated", "P1"]);
  });
});

describe("buildIssueBody", () => {
  it("generates HTML comment tag + Markdown", () => {
    const task = {
      title: "Test Task",
      description: "Test description",
      priority: "P2" as const,
      estimatedHours: 3,
      dependencies: [],
    };

    const body = buildIssueBody("spec-000001", task);

    expect(body).toContain('<!-- reqord:specification {"specificationId":"spec-000001"} -->');
    expect(body).toContain("## Test Task");
    expect(body).toContain("Test description");
    expect(body).toContain("**Estimated Hours:** 3");
  });

  it("includes dependencies when present", () => {
    const task = {
      title: "Task with deps",
      description: "Description",
      priority: "P3" as const,
      estimatedHours: 2,
      dependencies: ["Task A", "Task B"],
    };

    const body = buildIssueBody("spec-000002", task);

    expect(body).toContain("**Dependencies:** Task A, Task B");
  });

  it("does not include dependencies section when empty", () => {
    const task = {
      title: "Task without deps",
      description: "Description",
      priority: "P1" as const,
      estimatedHours: 1,
      dependencies: [],
    };

    const body = buildIssueBody("spec-000003", task);

    expect(body).not.toContain("Dependencies:");
  });
});
