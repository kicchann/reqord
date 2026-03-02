import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Requirement, ProjectSettings } from "@reqord/shared";
import { updateRequirement, checkReqApprovalPrerequisites } from "./requirement-service.js";

// Mock dependencies BEFORE imports
vi.mock("../repositories/requirement.js", () => ({
  findById: vi.fn(),
  findByIdOrThrow: vi.fn(),
  save: vi.fn(),
  saveDescription: vi.fn(),
  loadDescription: vi.fn(),
  loadFile: vi.fn(),
  deleteById: vi.fn(),
  findAll: vi.fn(),
}));

vi.mock("./version-service.js", () => ({
  isValidTransition: vi.fn(),
  shouldRevertToDraft: vi.fn(),
  determineNextVersion: vi.fn(),
  createHistoryEntry: vi.fn(),
  generateChangeSummary: vi.fn(),
  getStateTransitions: vi.fn(),
  parseVersion: vi.fn(),
  formatVersion: vi.fn(),
  applyVersionBump: vi.fn(),
}));

import * as reqRepo from "../repositories/requirement.js";
import * as versionService from "./version-service.js";

function makeSettings(overrides: Partial<ProjectSettings["approvalPrerequisites"]> = {}): ProjectSettings {
  return {
    invariants: {
      versioning: true,
      cyclicDependencyCheck: true,
      statusTransitionRules: true,
      schemaValidation: true,
    },
    approvalPrerequisites: {
      designMdCheck: true,
      descriptionMdCheck: false,
      customFiles: [],
      ...overrides,
    },
    statusTransitionPr: {
      draftToApproved: true,
      approvedToImplemented: false,
      toDraft: true,
    },
    branchNaming: {
      toApprovedPrefix: "reqord",
      toImplementedPrefix: "reqord",
      toDraftPrefix: "reqord",
    },
    feedbackValidation: {
      blockOnUnresolved: false,
      severityThreshold: "critical",
    },
    autoRevert: {
      onContentChange: "always",
    },
    consistencyCheck: {
      specNotImplementedLevel: "warning",
    },
  };
}

function makeRequirement(overrides: Partial<Requirement> = {}): Requirement {
  return {
    id: "req-000001",
    version: "1.0",
    title: "テスト要件タイトル",
    status: "draft",
    priority: "medium",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    versionHistory: [],
    files: { description: "requirements/req-000001/description.md", supplementary: [] },
    successCriteria: ["基準1"],
    format: { type: "free-form" },
    dependencies: { blockedBy: [], blocks: [], relatedTo: [] },
    ...overrides,
  };
}

describe("updateRequirement - 状態遷移バリデーション", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(versionService.isValidTransition).mockReturnValue(true);
    vi.mocked(versionService.shouldRevertToDraft).mockReturnValue(false);
    vi.mocked(versionService.determineNextVersion).mockReturnValue("1.0");
    vi.mocked(reqRepo.save).mockResolvedValue(undefined);
    vi.mocked(reqRepo.saveDescription).mockResolvedValue(undefined);
  });

  it("不正な状態遷移でエラーを投げる", async () => {
    const before = makeRequirement({ status: "draft" });
    vi.mocked(reqRepo.findByIdOrThrow).mockResolvedValue(before);
    vi.mocked(versionService.isValidTransition).mockReturnValue(false);
    vi.mocked(versionService.getStateTransitions).mockReturnValue(
      new Map([["draft", ["approved"]]]),
    );

    await expect(
      updateRequirement("/test/cwd", "req-000001", { status: "implemented" }),
    ).rejects.toThrow(/Invalid status transition: draft → implemented/);
  });

  it("有効な状態遷移を受け入れる", async () => {
    const before = makeRequirement({ status: "draft" });
    vi.mocked(reqRepo.findByIdOrThrow).mockResolvedValue(before);
    vi.mocked(versionService.isValidTransition).mockReturnValue(true);

    const result = await updateRequirement("/test/cwd", "req-000001", {
      status: "approved",
    });

    expect(result.after.status).toBe("approved");
    expect(versionService.isValidTransition).toHaveBeenCalledWith("draft", "approved");
  });

  it("同じstatusへの更新はバリデーションをスキップする", async () => {
    const before = makeRequirement({ status: "draft" });
    vi.mocked(reqRepo.findByIdOrThrow).mockResolvedValue(before);

    await updateRequirement("/test/cwd", "req-000001", { status: "draft" });

    expect(versionService.isValidTransition).not.toHaveBeenCalled();
  });
});

describe("updateRequirement - 自動リバートロジック", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(versionService.isValidTransition).mockReturnValue(true);
    vi.mocked(versionService.shouldRevertToDraft).mockReturnValue(false);
    vi.mocked(versionService.determineNextVersion).mockReturnValue("1.0");
    vi.mocked(reqRepo.save).mockResolvedValue(undefined);
  });

  it("approved状態でtitle変更時にdraftに戻す", async () => {
    const before = makeRequirement({ status: "approved", version: "2.0" });
    vi.mocked(reqRepo.findByIdOrThrow).mockResolvedValue(before);
    vi.mocked(versionService.shouldRevertToDraft).mockReturnValue(true);
    vi.mocked(versionService.applyVersionBump).mockReturnValue("3.0");
    vi.mocked(versionService.generateChangeSummary).mockReturnValue("Title updated");
    vi.mocked(versionService.createHistoryEntry).mockReturnValue({
      version: "3.0",
      status: "draft",
      changedAt: "2026-01-02T00:00:00Z",
      summary: "Title updated",
    });

    const result = await updateRequirement("/test/cwd", "req-000001", {
      title: "新しいタイトル",
    });

    expect(versionService.shouldRevertToDraft).toHaveBeenCalledWith("approved", true, "always", undefined);
    expect(result.after.status).toBe("draft");
  });

  it("draft状態では内容変更時もリバートしない", async () => {
    const before = makeRequirement({ status: "draft" });
    vi.mocked(reqRepo.findByIdOrThrow).mockResolvedValue(before);
    vi.mocked(versionService.shouldRevertToDraft).mockReturnValue(false);

    const result = await updateRequirement("/test/cwd", "req-000001", {
      title: "新しいタイトル",
    });

    expect(versionService.shouldRevertToDraft).toHaveBeenCalledWith("draft", true, "always", undefined);
    expect(result.after.status).toBe("draft");
  });

  it("明示的なstatus指定時はauto-revertをスキップする", async () => {
    const before = makeRequirement({ status: "approved", version: "2.0" });
    vi.mocked(reqRepo.findByIdOrThrow).mockResolvedValue(before);
    vi.mocked(versionService.isValidTransition).mockReturnValue(true);
    vi.mocked(versionService.determineNextVersion).mockReturnValue("2.0");

    const result = await updateRequirement("/test/cwd", "req-000001", {
      title: "新しいタイトル",
      status: "deprecated",
    });

    expect(versionService.shouldRevertToDraft).not.toHaveBeenCalled();
    expect(result.after.status).toBe("deprecated");
  });
});

describe("updateRequirement - バージョンインクリメント", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(versionService.isValidTransition).mockReturnValue(true);
    vi.mocked(versionService.shouldRevertToDraft).mockReturnValue(false);
    vi.mocked(reqRepo.save).mockResolvedValue(undefined);
  });

  it("draft→draftではバージョン据え置き", async () => {
    const before = makeRequirement({ status: "draft", version: "1.0" });
    vi.mocked(reqRepo.findByIdOrThrow).mockResolvedValue(before);
    vi.mocked(versionService.determineNextVersion).mockReturnValue("1.0");

    const result = await updateRequirement("/test/cwd", "req-000001", {
      priority: "high",
    });

    expect(result.after.version).toBe("1.0");
    expect(result.versionChanged).toBe(false);
  });

  it("draft→approvedではバージョン据え置き", async () => {
    const before = makeRequirement({ status: "draft", version: "1.0" });
    vi.mocked(reqRepo.findByIdOrThrow).mockResolvedValue(before);
    vi.mocked(versionService.determineNextVersion).mockReturnValue("1.0");

    const result = await updateRequirement("/test/cwd", "req-000001", {
      status: "approved",
    });

    expect(result.after.version).toBe("1.0");
    expect(result.versionChanged).toBe(false);
  });

  it("approved→draftでバージョンが変更されないこと（明示的versionBumpなし）", async () => {
    const before = makeRequirement({ status: "approved", version: "1.0" });
    vi.mocked(reqRepo.findByIdOrThrow).mockResolvedValue(before);
    vi.mocked(versionService.shouldRevertToDraft).mockReturnValue(true);

    const result = await updateRequirement("/test/cwd", "req-000001", {
      title: "変更タイトル",
    });

    expect(versionService.applyVersionBump).not.toHaveBeenCalled();
    expect(result.after.version).toBe("1.0");
    expect(result.versionChanged).toBe(false);
  });

  it("approved→draftで明示的versionBump指定時はバンプされること", async () => {
    const before = makeRequirement({ status: "approved", version: "1.0" });
    vi.mocked(reqRepo.findByIdOrThrow).mockResolvedValue(before);
    vi.mocked(versionService.shouldRevertToDraft).mockReturnValue(true);
    vi.mocked(versionService.applyVersionBump).mockReturnValue("1.1");
    vi.mocked(versionService.generateChangeSummary).mockReturnValue("Status changed");
    vi.mocked(versionService.createHistoryEntry).mockReturnValue({
      version: "1.1",
      status: "draft",
      changedAt: "2026-01-02T00:00:00Z",
      summary: "Status changed",
    });

    const result = await updateRequirement("/test/cwd", "req-000001", {
      title: "変更タイトル",
      versionBump: "patch",
    });

    expect(versionService.applyVersionBump).toHaveBeenCalledWith("1.0", "patch");
    expect(result.after.version).toBe("1.1");
    expect(result.versionChanged).toBe(true);
  });

  it("implemented→draftでバージョンが変更されないこと（明示的versionBumpなし）", async () => {
    const before = makeRequirement({ status: "implemented", version: "2.0" });
    vi.mocked(reqRepo.findByIdOrThrow).mockResolvedValue(before);
    vi.mocked(versionService.shouldRevertToDraft).mockReturnValue(true);

    const result = await updateRequirement("/test/cwd", "req-000001", {
      title: "変更タイトル",
    });

    expect(versionService.applyVersionBump).not.toHaveBeenCalled();
    expect(result.after.version).toBe("2.0");
    expect(result.versionChanged).toBe(false);
  });

  it("明示的versionBumpがdraft遷移以外でも適用される", async () => {
    const before = makeRequirement({ version: "1.0", status: "draft" });
    vi.mocked(reqRepo.findByIdOrThrow).mockResolvedValue(before);
    vi.mocked(versionService.applyVersionBump).mockReturnValue("2.0");
    vi.mocked(versionService.generateChangeSummary).mockReturnValue("Version bumped");
    vi.mocked(versionService.createHistoryEntry).mockReturnValue({
      version: "2.0",
      status: "draft",
      changedAt: "2026-01-02T00:00:00Z",
      summary: "Version bumped",
    });

    const result = await updateRequirement("/test/cwd", "req-000001", {
      priority: "high",
      versionBump: "major",
    });

    expect(versionService.applyVersionBump).toHaveBeenCalledWith("1.0", "major");
    expect(result.after.version).toBe("2.0");
  });
});

describe("updateRequirement - バージョン履歴", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(versionService.isValidTransition).mockReturnValue(true);
    vi.mocked(versionService.shouldRevertToDraft).mockReturnValue(false);
    vi.mocked(reqRepo.save).mockResolvedValue(undefined);
  });

  it("バージョン変更時に履歴エントリが追加される", async () => {
    const before = makeRequirement({ status: "draft", version: "1.0", versionHistory: [] });
    vi.mocked(reqRepo.findByIdOrThrow).mockResolvedValue(before);
    vi.mocked(versionService.applyVersionBump).mockReturnValue("2.0");
    vi.mocked(versionService.generateChangeSummary).mockReturnValue("Version bumped");
    vi.mocked(versionService.createHistoryEntry).mockReturnValue({
      version: "2.0",
      status: "draft",
      changedAt: "2026-01-02T00:00:00Z",
      summary: "Version bumped",
    });

    const result = await updateRequirement("/test/cwd", "req-000001", {
      versionBump: "major",
    });

    expect(result.after.versionHistory).toHaveLength(1);
    expect(result.after.versionHistory[0]).toMatchObject({
      version: "2.0",
      summary: "Version bumped",
    });
  });

  it("バージョン据え置き時は履歴エントリが追加されない", async () => {
    const before = makeRequirement({ status: "draft", version: "1.0", versionHistory: [] });
    vi.mocked(reqRepo.findByIdOrThrow).mockResolvedValue(before);
    vi.mocked(versionService.determineNextVersion).mockReturnValue("1.0");

    const result = await updateRequirement("/test/cwd", "req-000001", {
      priority: "high",
    });

    expect(result.after.versionHistory).toHaveLength(0);
    expect(versionService.createHistoryEntry).not.toHaveBeenCalled();
  });

  it("既存のversionHistoryが保持される", async () => {
    const existingHistory = [
      {
        version: "1.0",
        status: "draft" as const,
          changedAt: "2026-01-01T00:00:00Z",
        summary: "Initial version",
      },
    ];
    const before = makeRequirement({
      status: "draft",
      version: "1.0",
      versionHistory: existingHistory,
    });
    vi.mocked(reqRepo.findByIdOrThrow).mockResolvedValue(before);
    vi.mocked(versionService.applyVersionBump).mockReturnValue("2.0");
    vi.mocked(versionService.generateChangeSummary).mockReturnValue("Version bumped");
    vi.mocked(versionService.createHistoryEntry).mockReturnValue({
      version: "2.0",
      status: "draft",
      changedAt: "2026-01-02T00:00:00Z",
      summary: "Version bumped",
    });

    const result = await updateRequirement("/test/cwd", "req-000001", {
      versionBump: "major",
    });

    expect(result.after.versionHistory).toHaveLength(2);
    expect(result.after.versionHistory[0]).toEqual(existingHistory[0]);
    expect(result.after.versionHistory[1]).toMatchObject({
      version: "2.0",
    });
  });
});

describe("updateRequirement - 統合シナリオ", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(versionService.isValidTransition).mockReturnValue(true);
    vi.mocked(versionService.shouldRevertToDraft).mockReturnValue(false);
    vi.mocked(reqRepo.save).mockResolvedValue(undefined);
  });

  it("draft状態でtitle変更のみではバージョン据え置き", async () => {
    const before = makeRequirement({
      title: "元のタイトル",
      status: "draft",
      version: "1.0",
      versionHistory: [],
    });
    vi.mocked(reqRepo.findByIdOrThrow).mockResolvedValue(before);
    vi.mocked(versionService.determineNextVersion).mockReturnValue("1.0");

    const result = await updateRequirement("/test/cwd", "req-000001", {
      title: "新しいタイトル",
    });

    expect(result.after.title).toBe("新しいタイトル");
    expect(result.after.version).toBe("1.0");
    expect(result.versionChanged).toBe(false);
  });

  it("存在しない要件でエラーを投げる", async () => {
    vi.mocked(reqRepo.findByIdOrThrow).mockRejectedValue(
      new Error("Requirement req-999999 not found."),
    );

    await expect(
      updateRequirement("/test/cwd", "req-999999", { title: "test" }),
    ).rejects.toThrow("Requirement req-999999 not found.");
  });
});

describe("updateRequirement - description変更", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(versionService.isValidTransition).mockReturnValue(true);
    vi.mocked(versionService.shouldRevertToDraft).mockReturnValue(false);
    vi.mocked(reqRepo.save).mockResolvedValue(undefined);
    vi.mocked(reqRepo.saveDescription).mockResolvedValue(undefined);
  });

  it("description変更のみではバージョン据え置き（非draft）", async () => {
    const before = makeRequirement({ version: "1.0", status: "approved" });
    vi.mocked(reqRepo.findByIdOrThrow).mockResolvedValue(before);
    vi.mocked(versionService.determineNextVersion).mockReturnValue("1.0");

    const result = await updateRequirement("/test/cwd", "req-000001", {
      descriptionContent: "新しい説明文",
    });

    expect(result.after.version).toBe("1.0");
    expect(result.descriptionUpdated).toBe(true);
    expect(result.versionChanged).toBe(false);
  });

  it("description変更はdraft状態でもバージョン据え置き", async () => {
    const before = makeRequirement({ version: "1.0", status: "draft" });
    vi.mocked(reqRepo.findByIdOrThrow).mockResolvedValue(before);
    vi.mocked(versionService.determineNextVersion).mockReturnValue("1.0");

    const result = await updateRequirement("/test/cwd", "req-000001", {
      descriptionContent: "新しい説明文",
    });

    expect(result.after.version).toBe("1.0");
    expect(result.versionChanged).toBe(false);
  });

  it("description変更がauto-revertをトリガーする", async () => {
    const before = makeRequirement({ version: "1.0", status: "approved" });
    vi.mocked(reqRepo.findByIdOrThrow).mockResolvedValue(before);
    vi.mocked(versionService.shouldRevertToDraft).mockReturnValue(true);
    vi.mocked(versionService.applyVersionBump).mockReturnValue("2.0");
    vi.mocked(versionService.generateChangeSummary).mockReturnValue("Status changed");
    vi.mocked(versionService.createHistoryEntry).mockReturnValue({
      version: "2.0",
      status: "draft",
      changedAt: "2026-01-02T00:00:00Z",
      summary: "Status changed",
    });

    const result = await updateRequirement("/test/cwd", "req-000001", {
      descriptionContent: "変更された説明文",
    });

    expect(versionService.shouldRevertToDraft).toHaveBeenCalledWith("approved", true, "always", undefined);
    expect(result.after.status).toBe("draft");
  });
});

describe("updateRequirement - 自動リバートロジック（settings連携）", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(versionService.isValidTransition).mockReturnValue(true);
    vi.mocked(versionService.shouldRevertToDraft).mockReturnValue(false);
    vi.mocked(versionService.determineNextVersion).mockReturnValue("1.0");
    vi.mocked(reqRepo.save).mockResolvedValue(undefined);
  });

  it("settings.autoRevert.onContentChange=major-onlyとversionBump=patchが渡される", async () => {
    const before = makeRequirement({ status: "approved", version: "1.0" });
    vi.mocked(reqRepo.findByIdOrThrow).mockResolvedValue(before);

    await updateRequirement("/test/cwd", "req-000001", {
      title: "新しいタイトル",
      versionBump: "patch",
      settings: {
        invariants: { versioning: true as const, cyclicDependencyCheck: true as const, statusTransitionRules: true as const, schemaValidation: true as const },
        approvalPrerequisites: { designMdCheck: true, descriptionMdCheck: false, customFiles: [] as string[] },
        statusTransitionPr: { draftToApproved: true, approvedToImplemented: false, toDraft: true },
        branchNaming: { toApprovedPrefix: "reqord", toImplementedPrefix: "reqord", toDraftPrefix: "reqord" },
        feedbackValidation: { blockOnUnresolved: false, severityThreshold: "critical" as const },
        autoRevert: { onContentChange: "major-only" as const },
        consistencyCheck: { specNotImplementedLevel: "warning" as const },
      },
    });

    expect(versionService.shouldRevertToDraft).toHaveBeenCalledWith(
      "approved",
      true,
      "major-only",
      "patch",
    );
  });

  it("settings.autoRevert.onContentChange=neverの場合shouldRevertToDraftにneverが渡される", async () => {
    const before = makeRequirement({ status: "approved", version: "1.0" });
    vi.mocked(reqRepo.findByIdOrThrow).mockResolvedValue(before);

    await updateRequirement("/test/cwd", "req-000001", {
      title: "新しいタイトル",
      settings: {
        invariants: { versioning: true as const, cyclicDependencyCheck: true as const, statusTransitionRules: true as const, schemaValidation: true as const },
        approvalPrerequisites: { designMdCheck: true, descriptionMdCheck: false, customFiles: [] as string[] },
        statusTransitionPr: { draftToApproved: true, approvedToImplemented: false, toDraft: true },
        branchNaming: { toApprovedPrefix: "reqord", toImplementedPrefix: "reqord", toDraftPrefix: "reqord" },
        feedbackValidation: { blockOnUnresolved: false, severityThreshold: "critical" as const },
        autoRevert: { onContentChange: "never" as const },
        consistencyCheck: { specNotImplementedLevel: "warning" as const },
      },
    });

    expect(versionService.shouldRevertToDraft).toHaveBeenCalledWith(
      "approved",
      true,
      "never",
      undefined,
    );
  });

  it("settings未指定の場合はalwaysがデフォルトとして使われる", async () => {
    const before = makeRequirement({ status: "approved", version: "1.0" });
    vi.mocked(reqRepo.findByIdOrThrow).mockResolvedValue(before);

    await updateRequirement("/test/cwd", "req-000001", {
      title: "新しいタイトル",
    });

    expect(versionService.shouldRevertToDraft).toHaveBeenCalledWith(
      "approved",
      true,
      "always",
      undefined,
    );
  });

  it("settings.autoRevert.onContentChange=major-only+versionBump=majorでdraftに戻る", async () => {
    const before = makeRequirement({ status: "approved", version: "1.0" });
    vi.mocked(reqRepo.findByIdOrThrow).mockResolvedValue(before);
    vi.mocked(versionService.shouldRevertToDraft).mockReturnValue(true);
    vi.mocked(versionService.applyVersionBump).mockReturnValue("2.0");
    vi.mocked(versionService.generateChangeSummary).mockReturnValue("Title updated");
    vi.mocked(versionService.createHistoryEntry).mockReturnValue({
      version: "2.0",
      status: "draft",
      changedAt: "2026-01-02T00:00:00Z",
      summary: "Title updated",
    });

    const result = await updateRequirement("/test/cwd", "req-000001", {
      title: "新しいタイトル",
      versionBump: "major",
      settings: {
        invariants: { versioning: true as const, cyclicDependencyCheck: true as const, statusTransitionRules: true as const, schemaValidation: true as const },
        approvalPrerequisites: { designMdCheck: true, descriptionMdCheck: false, customFiles: [] as string[] },
        statusTransitionPr: { draftToApproved: true, approvedToImplemented: false, toDraft: true },
        branchNaming: { toApprovedPrefix: "reqord", toImplementedPrefix: "reqord", toDraftPrefix: "reqord" },
        feedbackValidation: { blockOnUnresolved: false, severityThreshold: "critical" as const },
        autoRevert: { onContentChange: "major-only" as const },
        consistencyCheck: { specNotImplementedLevel: "warning" as const },
      },
    });

    expect(result.after.status).toBe("draft");
  });
});

describe("checkReqApprovalPrerequisites", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("[descriptionMdCheck=false] description.mdが存在しなくても承認チェックが通る", async () => {
    const settings = makeSettings({ descriptionMdCheck: false, customFiles: [] });
    const result = await checkReqApprovalPrerequisites("/test/cwd", "req-000001", settings);

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(reqRepo.loadDescription).not.toHaveBeenCalled();
  });

  it("[descriptionMdCheck=false] description.mdが空でも承認チェックが通る", async () => {
    const settings = makeSettings({ descriptionMdCheck: false, customFiles: [] });
    const result = await checkReqApprovalPrerequisites("/test/cwd", "req-000001", settings);

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("[descriptionMdCheck=false] description.mdがテンプレートのままでも承認チェックが通る", async () => {
    const settings = makeSettings({ descriptionMdCheck: false, customFiles: [] });
    const result = await checkReqApprovalPrerequisites("/test/cwd", "req-000001", settings);

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("[descriptionMdCheck=true] description.mdが存在しない場合はエラー", async () => {
    vi.mocked(reqRepo.loadDescription).mockResolvedValue(null);

    const settings = makeSettings({ descriptionMdCheck: true, customFiles: [] });
    const result = await checkReqApprovalPrerequisites("/test/cwd", "req-000001", settings);

    expect(result.ok).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("description.md does not exist");
  });

  it("[descriptionMdCheck=true] description.mdが空の場合はエラー", async () => {
    vi.mocked(reqRepo.loadDescription).mockResolvedValue("   ");

    const settings = makeSettings({ descriptionMdCheck: true, customFiles: [] });
    const result = await checkReqApprovalPrerequisites("/test/cwd", "req-000001", settings);

    expect(result.ok).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("description.md is empty");
  });

  it("[descriptionMdCheck=true] description.mdがテンプレートのままの場合はエラー", async () => {
    vi.mocked(reqRepo.loadDescription).mockResolvedValue("# {{title}}\n\nWrite here.");

    const settings = makeSettings({ descriptionMdCheck: true, customFiles: [] });
    const result = await checkReqApprovalPrerequisites("/test/cwd", "req-000001", settings);

    expect(result.ok).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("template placeholders");
  });

  it("[descriptionMdCheck=true] description.mdが有効なコンテンツであれば成功", async () => {
    vi.mocked(reqRepo.loadDescription).mockResolvedValue("# 要件説明\n\nここに詳細を記載する。");

    const settings = makeSettings({ descriptionMdCheck: true, customFiles: [] });
    const result = await checkReqApprovalPrerequisites("/test/cwd", "req-000001", settings);

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("[customFiles] 指定ファイルがreq-ディレクトリ内に存在する場合は成功", async () => {
    vi.mocked(reqRepo.loadFile).mockResolvedValue("file content");

    const settings = makeSettings({ descriptionMdCheck: false, customFiles: ["acceptance-criteria.md"] });
    const result = await checkReqApprovalPrerequisites("/test/cwd", "req-000001", settings);

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(reqRepo.loadFile).toHaveBeenCalledWith("/test/cwd", "req-000001", "acceptance-criteria.md");
  });

  it("[customFiles] 指定ファイルがreq-ディレクトリ内に存在しない場合はエラー", async () => {
    vi.mocked(reqRepo.loadFile).mockResolvedValue(null);

    const settings = makeSettings({ descriptionMdCheck: false, customFiles: ["acceptance-criteria.md"] });
    const result = await checkReqApprovalPrerequisites("/test/cwd", "req-000001", settings);

    expect(result.ok).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('"acceptance-criteria.md"');
    expect(result.errors[0]).toContain("does not exist in the requirement directory");
  });

  it("[customFiles] 複数ファイル指定で一部存在しない場合はエラー", async () => {
    vi.mocked(reqRepo.loadFile)
      .mockResolvedValueOnce("content") // first file exists
      .mockResolvedValueOnce(null);     // second file missing

    const settings = makeSettings({
      descriptionMdCheck: false,
      customFiles: ["acceptance-criteria.md", "test-plan.md"],
    });
    const result = await checkReqApprovalPrerequisites("/test/cwd", "req-000001", settings);

    expect(result.ok).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('"test-plan.md"');
  });
});
