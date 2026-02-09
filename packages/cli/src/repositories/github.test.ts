import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";

let mockSpawnInstance: EventEmitter & { stdin: PassThrough; stderr: PassThrough };

vi.mock("node:child_process", () => {
  const mockExecFile = Object.assign(vi.fn(), { __type: "execFile" });
  const mockSpawn = vi.fn(() => mockSpawnInstance);
  return { execFile: mockExecFile, spawn: mockSpawn };
});

vi.mock("node:util", () => {
  const mockExecFileAsync = vi.fn();
  return {
    promisify: () => mockExecFileAsync,
    mockExecFileAsync,
  };
});

import {
  createPullRequest,
  getPullRequest,
} from "./github.js";
import * as util from "node:util";
import * as childProcess from "node:child_process";

const mockExecFileAsync = (util as unknown as { mockExecFileAsync: ReturnType<typeof vi.fn> }).mockExecFileAsync;
const mockSpawn = vi.mocked(childProcess.spawn);

function createMockSpawnInstance(exitCode = 0) {
  const instance = new EventEmitter() as EventEmitter & { stdin: PassThrough; stderr: PassThrough };
  instance.stdin = new PassThrough();
  instance.stderr = new PassThrough();
  mockSpawnInstance = instance;

  process.nextTick(() => {
    instance.emit("close", exitCode);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createPullRequest", () => {
  it("spawnでgh pr createを実行しexecFileでPR情報を取得する", async () => {
    createMockSpawnInstance(0);
    mockExecFileAsync.mockResolvedValue({
      stdout: JSON.stringify({ number: 42, url: "https://github.com/owner/repo/pull/42" }),
      stderr: "",
    });

    const result = await createPullRequest({
      title: "Add new feature",
      body: "This is a description",
      head: "feature-branch",
    });

    // Verify spawn called with argv array (no shell interpolation)
    expect(mockSpawn).toHaveBeenCalledWith("gh", [
      "pr", "create",
      "--title", "Add new feature",
      "--body-file", "-",
      "--head", "feature-branch",
    ]);

    // Verify PR info fetched via execFile
    expect(mockExecFileAsync).toHaveBeenCalledWith("gh", [
      "pr", "view", "feature-branch",
      "--json", "number,url",
    ]);
    expect(result).toEqual({ number: 42, url: "https://github.com/owner/repo/pull/42" });
  });

  it("baseブランチを指定してPRを作成する", async () => {
    createMockSpawnInstance(0);
    mockExecFileAsync.mockResolvedValue({
      stdout: JSON.stringify({ number: 43, url: "https://github.com/owner/repo/pull/43" }),
      stderr: "",
    });

    await createPullRequest({
      title: "Fix bug",
      body: "Bug fix description",
      head: "fix-branch",
      base: "develop",
    });

    expect(mockSpawn).toHaveBeenCalledWith("gh", [
      "pr", "create",
      "--title", "Fix bug",
      "--body-file", "-",
      "--head", "fix-branch",
      "--base", "develop",
    ]);
  });

  it("ドラフトPRを作成する", async () => {
    createMockSpawnInstance(0);
    mockExecFileAsync.mockResolvedValue({
      stdout: JSON.stringify({ number: 44, url: "https://github.com/owner/repo/pull/44" }),
      stderr: "",
    });

    await createPullRequest({
      title: "Draft PR",
      body: "WIP",
      head: "wip-branch",
      draft: true,
    });

    expect(mockSpawn).toHaveBeenCalledWith("gh", [
      "pr", "create",
      "--title", "Draft PR",
      "--body-file", "-",
      "--head", "wip-branch",
      "--draft",
    ]);
  });

  it("特殊文字を含むタイトル・ボディがそのまま渡される", async () => {
    createMockSpawnInstance(0);
    mockExecFileAsync.mockResolvedValue({
      stdout: JSON.stringify({ number: 45, url: "https://github.com/owner/repo/pull/45" }),
      stderr: "",
    });

    await createPullRequest({
      title: 'Add "new" feature $(echo injection)',
      body: 'Body with `backticks` and $variable',
      head: "feature-branch",
    });

    // With spawn + argv, special chars are passed safely without escaping
    expect(mockSpawn).toHaveBeenCalledWith("gh", [
      "pr", "create",
      "--title", 'Add "new" feature $(echo injection)',
      "--body-file", "-",
      "--head", "feature-branch",
    ]);
  });

  it("ghコマンド失敗時にエラーを投げる", async () => {
    createMockSpawnInstance(1);

    await expect(
      createPullRequest({
        title: "Test",
        body: "Test",
        head: "test-branch",
      }),
    ).rejects.toThrow("gh pr create failed");
  });
});

describe("getPullRequest", () => {
  it("PR番号を指定してexecFileでgh pr viewを実行する", async () => {
    mockExecFileAsync.mockResolvedValue({
      stdout: JSON.stringify({
        number: 42,
        url: "https://github.com/owner/repo/pull/42",
        state: "OPEN",
      }),
      stderr: "",
    });

    const result = await getPullRequest(42);

    expect(mockExecFileAsync).toHaveBeenCalledWith("gh", [
      "pr", "view", "42",
      "--json", "number,url,state",
    ]);
    expect(result).toEqual({
      number: 42,
      url: "https://github.com/owner/repo/pull/42",
      state: "OPEN",
    });
  });

  it("ghコマンド失敗時にエラーを投げる", async () => {
    mockExecFileAsync.mockRejectedValue(new Error("PR not found"));

    await expect(getPullRequest(999)).rejects.toThrow("PR not found");
  });
});
