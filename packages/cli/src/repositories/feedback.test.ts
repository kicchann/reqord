import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FeedbackEntry, FeedbackIndex } from "@reqord/shared";

// Mock file-system module
vi.mock("./file-system.js", () => ({
  exists: vi.fn(),
  readYAML: vi.fn(),
  writeYAML: vi.fn(),
  mkdirp: vi.fn(),
  joinPath: vi.fn((...segments: string[]) => segments.join("/")),
  getReqordDir: vi.fn((cwd: string, ...sub: string[]) => [cwd, ".reqord", ...sub].join("/")),
}));

import * as fs from "./file-system.js";
import { loadIndex, saveIndex, findFeedbackByIssue, upsertFeedback } from "./feedback.js";

const mockFs = vi.mocked(fs);

function makeFeedbackEntry(overrides: Partial<FeedbackEntry> = {}): FeedbackEntry {
  return {
    githubIssue: 123,
    type: "bug",
    severity: "high",
    linkedTo: {
      requirements: [],
      createdRequirements: [],
      specifications: [],
    },
    syncedAt: "2026-02-09T12:00:00Z",
    status: "open",
    ...overrides,
  };
}

function makeFeedbackIndex(overrides: Partial<FeedbackIndex> = {}): FeedbackIndex {
  return {
    feedbacks: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("loadIndex", () => {
  it("ファイルが存在しない場合は空のインデックスを返す", async () => {
    mockFs.exists.mockResolvedValue(false);

    const result = await loadIndex("/cwd");

    expect(result).toEqual({ feedbacks: [] });
  });

  it("ファイルが存在し有効な場合はパース済みインデックスを返す", async () => {
    const index = makeFeedbackIndex({
      feedbacks: [makeFeedbackEntry({ githubIssue: 123 })],
    });
    mockFs.exists.mockResolvedValue(true);
    mockFs.readYAML.mockResolvedValue(index);

    const result = await loadIndex("/cwd");

    expect(result).toEqual(index);
  });

  it("無効なデータの場合はエラーを投げる", async () => {
    mockFs.exists.mockResolvedValue(true);
    mockFs.readYAML.mockResolvedValue({ invalid: "data" });

    await expect(loadIndex("/cwd")).rejects.toThrow("Invalid feedback index");
  });
});

describe("saveIndex", () => {
  it("ディレクトリを作成して検証済みJSONを書き込む", async () => {
    const index = makeFeedbackIndex({
      feedbacks: [makeFeedbackEntry()],
    });
    mockFs.mkdirp.mockResolvedValue(undefined);
    mockFs.writeYAML.mockResolvedValue(undefined);

    await saveIndex("/cwd", index);

    expect(mockFs.mkdirp).toHaveBeenCalledWith("/cwd/.reqord/feedback");
    expect(mockFs.writeYAML).toHaveBeenCalledWith("/cwd/.reqord/feedback/index.yaml", index);
  });
});

describe("findFeedbackByIssue", () => {
  it("見つかった場合はフィードバックエントリを返す", async () => {
    const entry = makeFeedbackEntry({ githubIssue: 456 });
    mockFs.exists.mockResolvedValue(true);
    mockFs.readYAML.mockResolvedValue(makeFeedbackIndex({ feedbacks: [entry] }));

    const result = await findFeedbackByIssue("/cwd", 456);

    expect(result).toEqual(entry);
  });

  it("見つからない場合はundefinedを返す", async () => {
    mockFs.exists.mockResolvedValue(true);
    mockFs.readYAML.mockResolvedValue(makeFeedbackIndex({ feedbacks: [] }));

    const result = await findFeedbackByIssue("/cwd", 999);

    expect(result).toBeUndefined();
  });
});

describe("upsertFeedback", () => {
  it("存在しない場合は新しいフィードバックを挿入する", async () => {
    const newEntry = makeFeedbackEntry({ githubIssue: 789 });
    mockFs.exists.mockResolvedValue(true);
    mockFs.readYAML.mockResolvedValue(makeFeedbackIndex({ feedbacks: [] }));
    mockFs.mkdirp.mockResolvedValue(undefined);
    mockFs.writeYAML.mockResolvedValue(undefined);

    await upsertFeedback("/cwd", newEntry);

    expect(mockFs.writeYAML).toHaveBeenCalledWith(
      "/cwd/.reqord/feedback/index.yaml",
      { feedbacks: [newEntry] },
    );
  });

  it("既存のフィードバックをissue番号で更新する", async () => {
    const existingEntry = makeFeedbackEntry({ githubIssue: 123, status: "open" });
    const updatedEntry = makeFeedbackEntry({ githubIssue: 123, status: "closed" });
    mockFs.exists.mockResolvedValue(true);
    mockFs.readYAML.mockResolvedValue(makeFeedbackIndex({ feedbacks: [existingEntry] }));
    mockFs.mkdirp.mockResolvedValue(undefined);
    mockFs.writeYAML.mockResolvedValue(undefined);

    await upsertFeedback("/cwd", updatedEntry);

    expect(mockFs.writeYAML).toHaveBeenCalledWith(
      "/cwd/.reqord/feedback/index.yaml",
      { feedbacks: [updatedEntry] },
    );
  });
});
