import { describe, it, expect, vi, beforeEach } from "vitest";
import { taskCreateCommand } from "./create.js";
import type { CreateIssuesResult } from "../../services/task-service.js";

// Mock services BEFORE imports
vi.mock("../../services/task-service.js", () => ({
  createIssuesFromSpec: vi.fn(),
}));

import { createIssuesFromSpec } from "../../services/task-service.js";

describe("taskCreateCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = 0;
    // Reset command state between tests
    // We need to preserve default values but clear user-provided values
    delete (taskCreateCommand as any)._optionValues.dryRun;
    delete (taskCreateCommand as any)._optionValues.json;
    (taskCreateCommand as any).args = [];
  });

  it("has correct command name 'create'", () => {
    expect(taskCreateCommand.name()).toBe("create");
  });

  it("has required argument 'spec-id'", () => {
    const args = taskCreateCommand.registeredArguments;
    expect(args).toHaveLength(1);
    expect(args[0].name()).toBe("spec-id");
    expect(args[0].required).toBe(true);
  });

  it("has required option '--tasks-file'", () => {
    const option = taskCreateCommand.options.find(
      (opt) => opt.long === "--tasks-file"
    );
    expect(option).toBeDefined();
    expect(option?.required).toBe(true);
  });

  it("has optional '--dry-run' option", () => {
    const option = taskCreateCommand.options.find(
      (opt) => opt.long === "--dry-run"
    );
    expect(option).toBeDefined();
    expect(option?.required).toBe(false);
  });

  it("has optional '--json' option", () => {
    const option = taskCreateCommand.options.find(
      (opt) => opt.long === "--json"
    );
    expect(option).toBeDefined();
    expect(option?.required).toBe(false);
  });

  it("has optional '--max-issues' option with default '20'", () => {
    const option = taskCreateCommand.options.find(
      (opt) => opt.long === "--max-issues"
    );
    expect(option).toBeDefined();
    // Note: Commander marks options with parameters as required=true for the parameter,
    // but the option itself is optional (no requiredOption)
    expect(option?.mandatory).toBe(false);
    expect(option?.defaultValue).toBe(20);
  });

  it("calls createIssuesFromSpec with correct parameters", async () => {
    const mockResult: CreateIssuesResult = {
      specId: "spec-000016",
      issues: [
        {
          title: "Task 1",
          number: 42,
          url: "https://github.com/owner/repo/issues/42",
          priority: "P1",
          estimatedHours: 8,
          labels: ["reqord-generated", "P1"],
        },
      ],
      totalEstimatedHours: 8,
    };

    vi.mocked(createIssuesFromSpec).mockResolvedValue(mockResult);

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await taskCreateCommand.parseAsync([
      "node",
      "test",
      "spec-000016",
      "--tasks-file",
      "tasks.json",
    ]);

    expect(createIssuesFromSpec).toHaveBeenCalledWith(process.cwd(), {
      specId: "spec-000016",
      tasksFile: "tasks.json",
      dryRun: undefined,
      maxIssues: 20,
    });

    consoleLogSpy.mockRestore();
  });

  it("passes --dry-run option to service", async () => {
    const mockResult: CreateIssuesResult = {
      specId: "spec-000016",
      issues: [],
      totalEstimatedHours: 0,
    };

    vi.mocked(createIssuesFromSpec).mockResolvedValue(mockResult);

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await taskCreateCommand.parseAsync([
      "node",
      "test",
      "spec-000016",
      "--tasks-file",
      "tasks.json",
      "--dry-run",
    ]);

    expect(createIssuesFromSpec).toHaveBeenCalledWith(process.cwd(), {
      specId: "spec-000016",
      tasksFile: "tasks.json",
      dryRun: true,
      maxIssues: 20,
    });

    consoleLogSpy.mockRestore();
  });

  it("passes --max-issues option to service", async () => {
    const mockResult: CreateIssuesResult = {
      specId: "spec-000016",
      issues: [],
      totalEstimatedHours: 0,
    };

    vi.mocked(createIssuesFromSpec).mockResolvedValue(mockResult);

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await taskCreateCommand.parseAsync([
      "node",
      "test",
      "spec-000016",
      "--tasks-file",
      "tasks.json",
      "--max-issues",
      "50",
    ]);

    expect(createIssuesFromSpec).toHaveBeenCalledWith(process.cwd(), {
      specId: "spec-000016",
      tasksFile: "tasks.json",
      dryRun: undefined,
      maxIssues: 50,
    });

    consoleLogSpy.mockRestore();
  });

  it("outputs JSON format when --json option is provided", async () => {
    const mockResult: CreateIssuesResult = {
      specId: "spec-000016",
      issues: [
        {
          title: "Task 1",
          number: 42,
          url: "https://github.com/owner/repo/issues/42",
          priority: "P1",
          estimatedHours: 8,
          labels: ["reqord-generated", "P1"],
        },
      ],
      totalEstimatedHours: 8,
    };

    vi.mocked(createIssuesFromSpec).mockResolvedValue(mockResult);

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await taskCreateCommand.parseAsync([
      "node",
      "test",
      "spec-000016",
      "--tasks-file",
      "tasks.json",
      "--json",
    ]);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      JSON.stringify(mockResult, null, 2)
    );

    consoleLogSpy.mockRestore();
  });

  it("displays table format by default", async () => {
    const mockResult: CreateIssuesResult = {
      specId: "spec-000016",
      issues: [
        {
          title: "Task 1",
          number: 42,
          url: "https://github.com/owner/repo/issues/42",
          priority: "P1",
          estimatedHours: 8,
          labels: ["reqord-generated", "P1"],
        },
      ],
      totalEstimatedHours: 8,
    };

    vi.mocked(createIssuesFromSpec).mockResolvedValue(mockResult);

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await taskCreateCommand.parseAsync([
      "node",
      "test",
      "spec-000016",
      "--tasks-file",
      "tasks.json",
    ]);

    // Verify table output (contains the spec ID and task title)
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("Created 1 issues for spec-000016")
    );

    consoleLogSpy.mockRestore();
  });

  it("handles errors with error handler", async () => {
    vi.mocked(createIssuesFromSpec).mockRejectedValue(
      new Error("Specification not found")
    );

    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await taskCreateCommand.parseAsync([
      "node",
      "test",
      "spec-999999",
      "--tasks-file",
      "tasks.json",
    ]);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Specification not found")
    );

    expect(process.exitCode).toBe(1);

    consoleErrorSpy.mockRestore();
  });
});
