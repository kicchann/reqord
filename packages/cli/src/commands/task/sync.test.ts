import { describe, it, expect, vi, beforeEach } from "vitest";
import { taskSyncCommand, taskSyncAllCommand } from "./sync.js";
import type { SyncResult } from "../../services/task-sync-service.js";

// Mock services BEFORE imports
vi.mock("../../services/task-sync-service.js", () => ({
  syncSpecification: vi.fn(),
  syncAll: vi.fn(),
}));

import { syncSpecification, syncAll } from "../../services/task-sync-service.js";

describe("taskSyncCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = 0;
    // Reset command state between tests
    delete (taskSyncCommand as any)._optionValues.json;
    (taskSyncCommand as any).args = [];
  });

  it("has correct command name 'sync'", () => {
    expect(taskSyncCommand.name()).toBe("sync");
  });

  it("has required argument 'spec-id'", () => {
    const args = taskSyncCommand.registeredArguments;
    expect(args).toHaveLength(1);
    expect(args[0].name()).toBe("spec-id");
    expect(args[0].required).toBe(true);
  });

  it("has optional '--json' option", () => {
    const option = taskSyncCommand.options.find(
      (opt) => opt.long === "--json"
    );
    expect(option).toBeDefined();
    expect(option?.required).toBe(false);
  });

  it("calls syncSpecification with correct parameters", async () => {
    const mockResult: SyncResult = {
      specId: "spec-000001",
      synced: [
        {
          number: 42,
          title: "Issue 42",
          previousStatus: "open",
          currentStatus: "closed",
          changed: true,
        },
      ],
      progress: {
        total: 1,
        completed: 1,
        percentage: 100,
      },
      errors: [],
    };

    vi.mocked(syncSpecification).mockResolvedValue(mockResult);

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await taskSyncCommand.parseAsync([
      "node",
      "test",
      "spec-000001",
    ]);

    expect(syncSpecification).toHaveBeenCalledWith(process.cwd(), "spec-000001");

    consoleLogSpy.mockRestore();
  });

  it("outputs JSON format when --json option is provided", async () => {
    const mockResult: SyncResult = {
      specId: "spec-000001",
      synced: [
        {
          number: 42,
          title: "Issue 42",
          previousStatus: "open",
          currentStatus: "closed",
          changed: true,
        },
      ],
      progress: {
        total: 1,
        completed: 1,
        percentage: 100,
      },
      errors: [],
    };

    vi.mocked(syncSpecification).mockResolvedValue(mockResult);

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await taskSyncCommand.parseAsync([
      "node",
      "test",
      "spec-000001",
      "--json",
    ]);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      JSON.stringify(mockResult, null, 2)
    );

    consoleLogSpy.mockRestore();
  });

  it("displays formatted output by default", async () => {
    const mockResult: SyncResult = {
      specId: "spec-000001",
      synced: [
        {
          number: 42,
          title: "Issue 42",
          previousStatus: "open",
          currentStatus: "closed",
          changed: true,
        },
      ],
      progress: {
        total: 1,
        completed: 1,
        percentage: 100,
      },
      errors: [],
    };

    vi.mocked(syncSpecification).mockResolvedValue(mockResult);

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await taskSyncCommand.parseAsync([
      "node",
      "test",
      "spec-000001",
    ]);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("Syncing spec-000001")
    );

    consoleLogSpy.mockRestore();
  });

  it("handles errors with error handler", async () => {
    vi.mocked(syncSpecification).mockRejectedValue(
      new Error("Specification not found")
    );

    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await taskSyncCommand.parseAsync([
      "node",
      "test",
      "spec-999999",
    ]);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Specification not found")
    );

    expect(process.exitCode).toBe(1);

    consoleErrorSpy.mockRestore();
  });
});

describe("taskSyncAllCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = 0;
    // Reset command state between tests
    delete (taskSyncAllCommand as any)._optionValues.json;
  });

  it("has correct command name 'sync-all'", () => {
    expect(taskSyncAllCommand.name()).toBe("sync-all");
  });

  it("has optional '--json' option", () => {
    const option = taskSyncAllCommand.options.find(
      (opt) => opt.long === "--json"
    );
    expect(option).toBeDefined();
    expect(option?.required).toBe(false);
  });

  it("calls syncAll with correct parameters", async () => {
    const mockResults: SyncResult[] = [
      {
        specId: "spec-000001",
        synced: [
          {
            number: 42,
            title: "Issue 42",
            previousStatus: "open",
            currentStatus: "closed",
            changed: true,
          },
        ],
        progress: {
          total: 1,
          completed: 1,
          percentage: 100,
        },
        errors: [],
      },
    ];

    vi.mocked(syncAll).mockResolvedValue(mockResults);

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await taskSyncAllCommand.parseAsync([
      "node",
      "test",
    ]);

    expect(syncAll).toHaveBeenCalledWith(process.cwd());

    consoleLogSpy.mockRestore();
  });

  it("outputs JSON format when --json option is provided", async () => {
    const mockResults: SyncResult[] = [
      {
        specId: "spec-000001",
        synced: [],
        progress: {
          total: 0,
          completed: 0,
          percentage: 0,
        },
        errors: [],
      },
    ];

    vi.mocked(syncAll).mockResolvedValue(mockResults);

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await taskSyncAllCommand.parseAsync([
      "node",
      "test",
      "--json",
    ]);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      JSON.stringify(mockResults, null, 2)
    );

    consoleLogSpy.mockRestore();
  });

  it("displays formatted output for multiple results", async () => {
    const mockResults: SyncResult[] = [
      {
        specId: "spec-000001",
        synced: [
          {
            number: 42,
            title: "Issue 42",
            previousStatus: "open",
            currentStatus: "closed",
            changed: true,
          },
        ],
        progress: {
          total: 1,
          completed: 1,
          percentage: 100,
        },
        errors: [],
      },
      {
        specId: "spec-000002",
        synced: [
          {
            number: 43,
            title: "Issue 43",
            previousStatus: "open",
            currentStatus: "open",
            changed: false,
          },
        ],
        progress: {
          total: 1,
          completed: 0,
          percentage: 0,
        },
        errors: [],
      },
    ];

    vi.mocked(syncAll).mockResolvedValue(mockResults);

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await taskSyncAllCommand.parseAsync([
      "node",
      "test",
    ]);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("Syncing spec-000001")
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("Syncing spec-000002")
    );

    consoleLogSpy.mockRestore();
  });

  it("displays message when no specifications found", async () => {
    vi.mocked(syncAll).mockResolvedValue([]);

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await taskSyncAllCommand.parseAsync([
      "node",
      "test",
    ]);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("No specifications with implementation found")
    );

    consoleLogSpy.mockRestore();
  });

  it("handles errors with error handler", async () => {
    vi.mocked(syncAll).mockRejectedValue(
      new Error("Failed to sync specifications")
    );

    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await taskSyncAllCommand.parseAsync([
      "node",
      "test",
    ]);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to sync specifications")
    );

    expect(process.exitCode).toBe(1);

    consoleErrorSpy.mockRestore();
  });
});
