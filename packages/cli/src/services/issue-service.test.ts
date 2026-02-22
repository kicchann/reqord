import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Specification } from "@reqord/shared";

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
  readYAML: vi.fn(),
  writeYAML: vi.fn(),
  joinPath: vi.fn((...args: string[]) => args.join("/")),
  getReqordDir: vi.fn((...args: string[]) => args.join("/")),
  mkdirp: vi.fn(),
}));

import * as specRepo from "../repositories/specification.js";
import * as githubClient from "./github-client.js";
import * as fs from "../repositories/file-system.js";
import {
  createIssuesFromSpec,
  buildIssueBody,
  buildLabels,
} from "./issue-service.js";

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
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFs.exists.mockResolvedValue(false);
  mockFs.mkdirp.mockResolvedValue(undefined);
  mockFs.writeYAML.mockResolvedValue(undefined);
});

describe("createIssuesFromSpec", () => {
  it("Specification not found -> throws error", async () => {
    mockSpecRepo.findByIdOrThrow.mockRejectedValue(
      new Error("Specification spec-999999 not found")
    );

    await expect(
      createIssuesFromSpec("/cwd", { specId: "spec-999999", tasksFile: "tasks.yaml" })
    ).rejects.toThrow("Specification spec-999999 not found");
  });

  it("Specification not approved -> throws error", async () => {
    mockSpecRepo.findByIdOrThrow.mockResolvedValue(makeSpecification({ status: "draft" }));

    await expect(
      createIssuesFromSpec("/cwd", { specId: "spec-000001", tasksFile: "tasks.yaml" })
    ).rejects.toThrow("must be approved");
  });

  it("Tasks file not found -> throws error", async () => {
    mockSpecRepo.findByIdOrThrow.mockResolvedValue(makeSpecification());
    mockFs.exists.mockResolvedValue(false);

    await expect(
      createIssuesFromSpec("/cwd", { specId: "spec-000001", tasksFile: "tasks.yaml" })
    ).rejects.toThrow("not found");
  });

  it("Tasks file with invalid YAML -> throws error", async () => {
    mockSpecRepo.findByIdOrThrow.mockResolvedValue(makeSpecification());
    mockFs.exists.mockResolvedValue(true);
    mockFs.readYAML.mockRejectedValue(new Error("YAML syntax error"));

    await expect(
      createIssuesFromSpec("/cwd", { specId: "spec-000001", tasksFile: "tasks.yaml" })
    ).rejects.toThrow();
  });

  it("Tasks count exceeds maxIssues -> throws error", async () => {
    mockSpecRepo.findByIdOrThrow.mockResolvedValue(makeSpecification());
    mockFs.exists.mockResolvedValue(true);
    mockFs.readYAML.mockResolvedValue({
      tasks: [
        { title: "T1", description: "D1", priority: "P1", estimatedHours: 2, dependencies: [] },
        { title: "T2", description: "D2", priority: "P2", estimatedHours: 3, dependencies: [] },
        { title: "T3", description: "D3", priority: "P3", estimatedHours: 1, dependencies: [] },
      ],
    });

    await expect(
      createIssuesFromSpec("/cwd", { specId: "spec-000001", tasksFile: "tasks.yaml", maxIssues: 2 })
    ).rejects.toThrow("exceeds maximum");
  });

  it("Successful issue creation (2 tasks) -> creates 2 issues and returns result", async () => {
    mockSpecRepo.findByIdOrThrow.mockResolvedValue(makeSpecification());
    mockFs.exists.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    mockFs.readYAML.mockResolvedValue({
      tasks: [
        { title: "Task 1", description: "Desc 1", priority: "P1", estimatedHours: 2, dependencies: [] },
        { title: "Task 2", description: "Desc 2", priority: "P2", estimatedHours: 3, dependencies: [] },
      ],
    });
    mockGithubClient.createIssue
      .mockResolvedValueOnce({ number: 101, url: "https://github.com/test/repo/issues/101" })
      .mockResolvedValueOnce({ number: 102, url: "https://github.com/test/repo/issues/102" });

    const result = await createIssuesFromSpec("/cwd", {
      specId: "spec-000001",
      tasksFile: "tasks.yaml",
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
    expect(result.totalEstimatedHours).toBe(5);
  });

  it("Dry-run mode -> no GitHub API calls, no tasks.yaml write", async () => {
    mockSpecRepo.findByIdOrThrow.mockResolvedValue(makeSpecification());
    mockFs.exists.mockResolvedValue(true);
    mockFs.readYAML.mockResolvedValue({
      tasks: [
        { title: "Task 1", description: "Desc 1", priority: "P1", estimatedHours: 2, dependencies: [] },
      ],
    });

    const result = await createIssuesFromSpec("/cwd", {
      specId: "spec-000001",
      tasksFile: "tasks.yaml",
      dryRun: true,
    });

    expect(result.issues[0].number).toBeUndefined();
    expect(result.issues[0].url).toBeUndefined();
    expect(result.totalEstimatedHours).toBe(2);
    expect(mockGithubClient.createIssue).not.toHaveBeenCalled();
    expect(mockFs.writeYAML).not.toHaveBeenCalled();
  });

  it("Writes task entries to tasks.yaml after creation", async () => {
    mockSpecRepo.findByIdOrThrow.mockResolvedValue(makeSpecification());
    mockFs.exists.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    mockFs.readYAML.mockResolvedValue({
      tasks: [
        { title: "Task 1", description: "Desc 1", priority: "P1", estimatedHours: 2, dependencies: [] },
      ],
    });
    mockGithubClient.createIssue.mockResolvedValue({
      number: 101,
      url: "https://github.com/test/repo/issues/101",
    });

    await createIssuesFromSpec("/cwd", { specId: "spec-000001", tasksFile: "tasks.yaml" });

    expect(mockFs.writeYAML).toHaveBeenCalledWith(
      expect.stringContaining("tasks.yaml"),
      expect.objectContaining({
        tasks: expect.arrayContaining([
          expect.objectContaining({
            number: 101,
            title: "Task 1",
            url: "https://github.com/test/repo/issues/101",
            linkedTo: { specifications: ["spec-000001"] },
            priority: "P1",
            status: "open",
            estimatedHours: 2,
            syncedAt: expect.any(String),
          }),
        ]),
      })
    );
    expect(mockSpecRepo.save).not.toHaveBeenCalled();
  });

  it("Appends to existing tasks.yaml entries", async () => {
    mockSpecRepo.findByIdOrThrow.mockResolvedValue(makeSpecification());
    mockFs.exists.mockResolvedValueOnce(true).mockResolvedValueOnce(true);
    mockFs.readYAML
      .mockResolvedValueOnce({
        tasks: [
          { title: "Task 1", description: "Desc 1", priority: "P1", estimatedHours: 2, dependencies: [] },
        ],
      })
      .mockResolvedValueOnce({
        title: "Tasks",
        tasks: [
          {
            number: 99,
            title: "Existing Task",
            url: "https://github.com/test/repo/issues/99",
            linkedTo: { specifications: ["spec-000000"] },
            status: "open",
            syncedAt: "2025-01-01T00:00:00.000Z",
          },
        ],
      });
    mockGithubClient.createIssue.mockResolvedValue({
      number: 101,
      url: "https://github.com/test/repo/issues/101",
    });

    await createIssuesFromSpec("/cwd", { specId: "spec-000001", tasksFile: "tasks.yaml" });

    expect(mockFs.writeYAML).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        tasks: expect.arrayContaining([
          expect.objectContaining({ number: 99 }),
          expect.objectContaining({ number: 101 }),
        ]),
      })
    );
  });
});

describe("buildLabels", () => {
  it("returns reqord-generated and priority labels", () => {
    const task = {
      title: "Test Task",
      description: "Test description",
      priority: "P1" as const,
      estimatedHours: 5,
      dependencies: [],
    };

    expect(buildLabels(task)).toEqual(["reqord-generated", "P1"]);
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

    expect(body).toContain(
      '<!-- reqord:specification {"specificationId":"spec-000001","priority":"P2","estimatedHours":3} -->'
    );
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

    expect(buildIssueBody("spec-000002", task)).toContain(
      "**Dependencies:** Task A, Task B"
    );
  });

  it("does not include dependencies section when empty", () => {
    const task = {
      title: "Task without deps",
      description: "Description",
      priority: "P1" as const,
      estimatedHours: 1,
      dependencies: [],
    };

    expect(buildIssueBody("spec-000003", task)).not.toContain("Dependencies:");
  });
});
