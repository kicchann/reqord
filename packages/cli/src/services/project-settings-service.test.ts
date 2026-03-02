import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../repositories/project-settings.js", () => ({
  readRawProjectSettings: vi.fn(),
}));

import * as projectSettingsRepo from "../repositories/project-settings.js";
import { loadProjectSettings, getDefaultProjectSettings } from "./project-settings-service.js";

const mockRepo = vi.mocked(projectSettingsRepo);

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loadProjectSettings", () => {
  it("リポジトリが空オブジェクトを返す場合はデフォルト設定を返す", async () => {
    mockRepo.readRawProjectSettings.mockResolvedValue({});

    const result = await loadProjectSettings("/cwd");

    expect(result.invariants.versioning).toBe(true);
    expect(result.approvalPrerequisites.designMdCheck).toBe(true);
    expect(result.autoRevert.onContentChange).toBe("always");
  });

  it("正常なデータの場合はパース結果を返す", async () => {
    mockRepo.readRawProjectSettings.mockResolvedValue({
      approvalPrerequisites: { designMdCheck: false },
      autoRevert: { onContentChange: "never" },
    });

    const result = await loadProjectSettings("/cwd");

    expect(result.approvalPrerequisites.designMdCheck).toBe(false);
    expect(result.autoRevert.onContentChange).toBe("never");
  });

  it("部分定義の場合はデフォルトとマージされた結果を返す", async () => {
    mockRepo.readRawProjectSettings.mockResolvedValue({
      statusTransitionPr: { draftToApproved: false },
    });

    const result = await loadProjectSettings("/cwd");

    expect(result.statusTransitionPr.draftToApproved).toBe(false);
    expect(result.statusTransitionPr.approvedToImplemented).toBe(false); // デフォルト
    expect(result.statusTransitionPr.toDraft).toBe(true); // デフォルト
  });

  it("リポジトリがエラーを投げる場合はconsole.warnを呼びデフォルト設定を返す", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    mockRepo.readRawProjectSettings.mockRejectedValue(new Error("YAML syntax error"));

    const result = await loadProjectSettings("/cwd");

    expect(result.invariants.versioning).toBe(true); // デフォルト
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("Could not read setting.yaml"),
    );
  });

  it("バリデーション失敗の場合はconsole.warnを呼びデフォルト設定を返す", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    mockRepo.readRawProjectSettings.mockResolvedValue({
      invariants: { versioning: false }, // z.literal(true)違反
    });

    const result = await loadProjectSettings("/cwd");

    expect(result.invariants.versioning).toBe(true); // デフォルト
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("Invalid setting.yaml"),
    );
  });
});

describe("getDefaultProjectSettings", () => {
  it("全フィールドがデフォルト値の設定を返す", () => {
    const result = getDefaultProjectSettings();
    expect(result.invariants.versioning).toBe(true);
    expect(result.feedbackValidation.severityThreshold).toBe("critical");
  });
});
