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
      "緊急の変更です",
    ]);

    expect(notifyImpact).toHaveBeenCalledWith(process.cwd(), "req-000011", {
      dryRun: undefined,
      message: "緊急の変更です",
    });
  });

  it("displays dry-run preview format", async () => {
    vi.mocked(notifyImpact).mockResolvedValue(
      makeNotifyResult({
        dryRun: true,
        notified: [
          { type: "issue", number: 123, title: "ログイン画面の実装" },
          { type: "issue", number: 124, title: "認証API統合テスト" },
        ],
        skipped: [{ type: "issue", number: 125, reason: "closed" }],
      }),
    );

    await notifyCommand.parseAsync(["node", "test", "req-000011", "--dry-run"]);

    const output = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("影響範囲通知プレビュー: req-000011");
    expect(output).toContain("通知対象:");
    expect(output).toContain("#123");
    expect(output).toContain("ログイン画面の実装");
    expect(output).toContain("#124");
    expect(output).toContain("認証API統合テスト");
    expect(output).toContain("スキップ:");
    expect(output).toContain("#125");
    expect(output).toContain("closed");
    expect(output).toContain("--dry-run を外して再実行");
  });

  it("displays actual notification result format", async () => {
    vi.mocked(notifyImpact).mockResolvedValue(
      makeNotifyResult({
        dryRun: false,
        notified: [
          { type: "issue", number: 123, title: "ログイン画面の実装" },
          { type: "issue", number: 124, title: "認証API統合テスト" },
        ],
        skipped: [{ type: "issue", number: 125, reason: "closed" }],
      }),
    );

    await notifyCommand.parseAsync(["node", "test", "req-000011"]);

    const output = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("影響範囲通知: req-000011");
    expect(output).toContain("通知完了:");
    expect(output).toContain("✓");
    expect(output).toContain("#123");
    expect(output).toContain("ログイン画面の実装");
    expect(output).toContain("#124");
    expect(output).toContain("スキップ:");
    expect(output).toContain("#125");
    expect(output).toContain("closed");
    expect(output).toContain("2件の通知を送信しました。");
  });

  it("displays empty notification message", async () => {
    vi.mocked(notifyImpact).mockResolvedValue(makeNotifyResult());

    await notifyCommand.parseAsync(["node", "test", "req-000011"]);

    const output = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("影響範囲通知: req-000011");
    expect(output).toContain("通知対象のissueはありません。");
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
