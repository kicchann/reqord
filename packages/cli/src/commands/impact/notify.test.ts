import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../services/impact-service.js", () => ({
  notifyImpact: vi.fn(),
}));

import { notifyImpact } from "../../services/impact-service.js";
import type { NotifyResult } from "../../services/impact-service.js";
import { notifyCommand } from "./notify.js";

function makeNotifyResult(overrides: Partial<NotifyResult> = {}): NotifyResult {
  return {
    notified: [],
    skipped: [],
    dryRun: false,
    ...overrides,
  };
}

describe("notifyCommand", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = 0;
    (notifyCommand as any).args = [];
    delete (notifyCommand as any)._optionValues.dryRun;
    delete (notifyCommand as any)._optionValues.message;
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("has correct command name 'notify'", () => {
    expect(notifyCommand.name()).toBe("notify");
  });

  it("has required argument 'id'", () => {
    const args = notifyCommand.registeredArguments;
    expect(args).toHaveLength(1);
    expect(args[0].name()).toBe("id");
    expect(args[0].required).toBe(true);
  });

  it("has optional '--dry-run' option", () => {
    const option = notifyCommand.options.find(
      (opt) => opt.long === "--dry-run",
    );
    expect(option).toBeDefined();
  });

  it("has optional '--message' option", () => {
    const option = notifyCommand.options.find(
      (opt) => opt.long === "--message",
    );
    expect(option).toBeDefined();
  });

  it("calls notifyImpact with correct parameters", async () => {
    vi.mocked(notifyImpact).mockResolvedValue(makeNotifyResult());

    await notifyCommand.parseAsync(["node", "test", "req-000011"]);

    expect(notifyImpact).toHaveBeenCalledWith(process.cwd(), "req-000011", {
      dryRun: undefined,
      message: undefined,
    });
  });

  it("passes --dry-run option to notifyImpact", async () => {
    vi.mocked(notifyImpact).mockResolvedValue(makeNotifyResult({ dryRun: true }));

    await notifyCommand.parseAsync(["node", "test", "req-000011", "--dry-run"]);

    expect(notifyImpact).toHaveBeenCalledWith(process.cwd(), "req-000011", {
      dryRun: true,
      message: undefined,
    });
  });

  it("passes --message option to notifyImpact", async () => {
    vi.mocked(notifyImpact).mockResolvedValue(makeNotifyResult());

    await notifyCommand.parseAsync([
      "node",
      "test",
      "req-000011",
      "--message",
      "Urgent change",
    ]);

    expect(notifyImpact).toHaveBeenCalledWith(process.cwd(), "req-000011", {
      dryRun: undefined,
      message: "Urgent change",
    });
  });

  it("displays dry-run preview format", async () => {
    vi.mocked(notifyImpact).mockResolvedValue(
      makeNotifyResult({
        dryRun: true,
        notified: [
          { type: "issue", number: 123, title: "Login screen implementation" },
          { type: "issue", number: 124, title: "Auth API integration test" },
        ],
        skipped: [{ type: "issue", number: 125, reason: "closed" }],
      }),
    );

    await notifyCommand.parseAsync(["node", "test", "req-000011", "--dry-run"]);

    const output = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("Impact notification preview: req-000011");
    expect(output).toContain("Notify targets:");
    expect(output).toContain("#123");
    expect(output).toContain("Login screen implementation");
    expect(output).toContain("#124");
    expect(output).toContain("Auth API integration test");
    expect(output).toContain("Skipped:");
    expect(output).toContain("#125");
    expect(output).toContain("closed");
    expect(output).toContain("remove --dry-run and run again");
  });

  it("displays actual notification result format", async () => {
    vi.mocked(notifyImpact).mockResolvedValue(
      makeNotifyResult({
        dryRun: false,
        notified: [
          { type: "issue", number: 123, title: "Login screen implementation" },
          { type: "issue", number: 124, title: "Auth API integration test" },
        ],
        skipped: [{ type: "issue", number: 125, reason: "closed" }],
      }),
    );

    await notifyCommand.parseAsync(["node", "test", "req-000011"]);

    const output = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("Impact notification: req-000011");
    expect(output).toContain("Notified:");
    expect(output).toContain("✓");
    expect(output).toContain("#123");
    expect(output).toContain("Login screen implementation");
    expect(output).toContain("#124");
    expect(output).toContain("Skipped:");
    expect(output).toContain("#125");
    expect(output).toContain("closed");
    expect(output).toContain("Sent 2 notification(s).");
  });

  it("displays empty notification message", async () => {
    vi.mocked(notifyImpact).mockResolvedValue(makeNotifyResult());

    await notifyCommand.parseAsync(["node", "test", "req-000011"]);

    const output = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("Impact notification: req-000011");
    expect(output).toContain("No issues to notify.");
  });

  it("handles errors with error handler", async () => {
    vi.mocked(notifyImpact).mockRejectedValue(
      new Error("Requirement req-999999 not found."),
    );

    await notifyCommand.parseAsync(["node", "test", "req-999999"]);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("req-999999 not found"),
    );
    expect(process.exitCode).toBe(1);
  });
});
