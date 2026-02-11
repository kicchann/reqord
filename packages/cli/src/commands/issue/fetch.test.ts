import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FetchResult } from "../../services/issue-fetch-service.js";

vi.mock("../../services/issue-fetch-service.js", () => ({
  fetchIssues: vi.fn(),
}));

import { issueFetchCommand } from "./fetch.js";
import { fetchIssues } from "../../services/issue-fetch-service.js";

describe("issueFetchCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = 0;
    delete (issueFetchCommand as any)._optionValues.dryRun;
    delete (issueFetchCommand as any)._optionValues.json;
    (issueFetchCommand as any).args = [];
  });

  it("has correct command name 'fetch'", () => {
    expect(issueFetchCommand.name()).toBe("fetch");
  });

  it("has optional argument 'spec-id'", () => {
    const args = issueFetchCommand.registeredArguments;
    expect(args).toHaveLength(1);
    expect(args[0].name()).toBe("spec-id");
    expect(args[0].required).toBe(false);
  });

  it("has optional '--dry-run' option", () => {
    const option = issueFetchCommand.options.find(
      (opt) => opt.long === "--dry-run",
    );
    expect(option).toBeDefined();
    expect(option?.required).toBe(false);
  });

  it("has optional '--json' option", () => {
    const option = issueFetchCommand.options.find(
      (opt) => opt.long === "--json",
    );
    expect(option).toBeDefined();
    expect(option?.required).toBe(false);
  });

  it("calls fetchIssues without specId when no argument given", async () => {
    const mockResult: FetchResult = {
      specsUpdated: [],
      issuesWithoutSpec: [],
      totalIssuesFetched: 0,
      totalIssuesWithTag: 0,
    };
    vi.mocked(fetchIssues).mockResolvedValue(mockResult);

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await issueFetchCommand.parseAsync(["node", "test"]);

    expect(fetchIssues).toHaveBeenCalledWith(process.cwd(), {
      specId: undefined,
      dryRun: undefined,
    });

    consoleLogSpy.mockRestore();
  });

  it("calls fetchIssues with specId when argument given", async () => {
    const mockResult: FetchResult = {
      specsUpdated: [],
      issuesWithoutSpec: [],
      totalIssuesFetched: 0,
      totalIssuesWithTag: 0,
    };
    vi.mocked(fetchIssues).mockResolvedValue(mockResult);

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await issueFetchCommand.parseAsync(["node", "test", "spec-000022"]);

    expect(fetchIssues).toHaveBeenCalledWith(process.cwd(), {
      specId: "spec-000022",
      dryRun: undefined,
    });

    consoleLogSpy.mockRestore();
  });

  it("passes --dry-run option to service", async () => {
    const mockResult: FetchResult = {
      specsUpdated: [],
      issuesWithoutSpec: [],
      totalIssuesFetched: 0,
      totalIssuesWithTag: 0,
    };
    vi.mocked(fetchIssues).mockResolvedValue(mockResult);

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await issueFetchCommand.parseAsync(["node", "test", "--dry-run"]);

    expect(fetchIssues).toHaveBeenCalledWith(process.cwd(), {
      specId: undefined,
      dryRun: true,
    });

    consoleLogSpy.mockRestore();
  });

  it("outputs JSON format when --json option is provided", async () => {
    const mockResult: FetchResult = {
      specsUpdated: [
        {
          specId: "spec-000022",
          issueCount: 3,
          totalEstimatedHours: 16,
          previousIssueCount: 0,
          updated: true,
        },
      ],
      issuesWithoutSpec: [],
      totalIssuesFetched: 10,
      totalIssuesWithTag: 3,
    };
    vi.mocked(fetchIssues).mockResolvedValue(mockResult);

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await issueFetchCommand.parseAsync(["node", "test", "--json"]);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      JSON.stringify(mockResult, null, 2),
    );

    consoleLogSpy.mockRestore();
  });

  it("displays table format by default", async () => {
    const mockResult: FetchResult = {
      specsUpdated: [
        {
          specId: "spec-000022",
          issueCount: 2,
          totalEstimatedHours: 12,
          previousIssueCount: 0,
          updated: true,
        },
      ],
      issuesWithoutSpec: [],
      totalIssuesFetched: 5,
      totalIssuesWithTag: 2,
    };
    vi.mocked(fetchIssues).mockResolvedValue(mockResult);

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await issueFetchCommand.parseAsync(["node", "test"]);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("Fetched 5 issues, 2 with reqord tags"),
    );

    consoleLogSpy.mockRestore();
  });

  it("handles errors with error handler", async () => {
    vi.mocked(fetchIssues).mockRejectedValue(
      new Error("GitHub API failed"),
    );

    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await issueFetchCommand.parseAsync(["node", "test"]);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("GitHub API failed"),
    );
    expect(process.exitCode).toBe(1);

    consoleErrorSpy.mockRestore();
  });
});
