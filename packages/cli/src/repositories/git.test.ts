import { describe, it, expect, vi, beforeEach } from "vitest";

const mockExecFileAsync = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", () => ({
  execFile: Object.assign(vi.fn(), { __type: "execFile" }),
}));

vi.mock("node:util", () => ({
  promisify: () => mockExecFileAsync,
}));

import {
  createBranch,
  checkout,
  add,
  commit,
  push,
  getCurrentBranch,
  getCurrentCommitHash,
} from "./git.js";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createBranch", () => {
  it("git branchコマンドを正しいcwdで実行する", async () => {
    mockExecFileAsync.mockResolvedValue({ stdout: "", stderr: "" });

    await createBranch("/test/repo", "feature-branch");

    expect(mockExecFileAsync).toHaveBeenCalledWith(
      "git",
      ["branch", "feature-branch"],
      { cwd: "/test/repo" },
    );
  });

  it("gitコマンド失敗時にエラーを投げる", async () => {
    mockExecFileAsync.mockRejectedValue(new Error("fatal: not a git repository"));

    await expect(createBranch("/test/repo", "feature")).rejects.toThrow(
      "fatal: not a git repository",
    );
  });
});

describe("checkout", () => {
  it("git checkoutコマンドを実行する", async () => {
    mockExecFileAsync.mockResolvedValue({ stdout: "", stderr: "" });

    await checkout("/test/repo", "main");

    expect(mockExecFileAsync).toHaveBeenCalledWith(
      "git",
      ["checkout", "main"],
      { cwd: "/test/repo" },
    );
  });

  it("gitコマンド失敗時にエラーを投げる", async () => {
    mockExecFileAsync.mockRejectedValue(new Error("error: pathspec 'invalid' did not match"));

    await expect(checkout("/test/repo", "invalid")).rejects.toThrow(
      "error: pathspec 'invalid' did not match",
    );
  });
});

describe("add", () => {
  it("git addコマンドで単一ファイルを追加する", async () => {
    mockExecFileAsync.mockResolvedValue({ stdout: "", stderr: "" });

    await add("/test/repo", ["file.txt"]);

    expect(mockExecFileAsync).toHaveBeenCalledWith(
      "git",
      ["add", "file.txt"],
      { cwd: "/test/repo" },
    );
  });

  it("git addコマンドで複数ファイルを追加する", async () => {
    mockExecFileAsync.mockResolvedValue({ stdout: "", stderr: "" });

    await add("/test/repo", ["file1.txt", "file2.txt", "file3.txt"]);

    expect(mockExecFileAsync).toHaveBeenCalledWith(
      "git",
      ["add", "file1.txt", "file2.txt", "file3.txt"],
      { cwd: "/test/repo" },
    );
  });

  it("gitコマンド失敗時にエラーを投げる", async () => {
    mockExecFileAsync.mockRejectedValue(new Error("fatal: pathspec 'missing.txt' did not match"));

    await expect(add("/test/repo", ["missing.txt"])).rejects.toThrow(
      "fatal: pathspec 'missing.txt' did not match",
    );
  });
});

describe("commit", () => {
  it("git commitコマンドでメッセージ付きコミットする", async () => {
    mockExecFileAsync.mockResolvedValue({ stdout: "", stderr: "" });

    await commit("/test/repo", "Add new feature");

    expect(mockExecFileAsync).toHaveBeenCalledWith(
      "git",
      ["commit", "-m", "Add new feature"],
      { cwd: "/test/repo" },
    );
  });

  it("メッセージに特殊文字を含む場合も正しく処理する", async () => {
    mockExecFileAsync.mockResolvedValue({ stdout: "", stderr: "" });

    await commit("/test/repo", 'Fix "bug" in user\'s profile');

    expect(mockExecFileAsync).toHaveBeenCalledWith(
      "git",
      ["commit", "-m", 'Fix "bug" in user\'s profile'],
      { cwd: "/test/repo" },
    );
  });

  it("gitコマンド失敗時にエラーを投げる", async () => {
    mockExecFileAsync.mockRejectedValue(new Error("fatal: nothing to commit"));

    await expect(commit("/test/repo", "message")).rejects.toThrow(
      "fatal: nothing to commit",
    );
  });
});

describe("push", () => {
  it("git pushコマンドでブランチをリモートにプッシュする", async () => {
    mockExecFileAsync.mockResolvedValue({ stdout: "", stderr: "" });

    await push("/test/repo", "feature-branch");

    expect(mockExecFileAsync).toHaveBeenCalledWith(
      "git",
      ["push", "-u", "origin", "feature-branch"],
      { cwd: "/test/repo" },
    );
  });

  it("gitコマンド失敗時にエラーを投げる", async () => {
    mockExecFileAsync.mockRejectedValue(new Error("fatal: remote origin does not exist"));

    await expect(push("/test/repo", "branch")).rejects.toThrow(
      "fatal: remote origin does not exist",
    );
  });
});

describe("getCurrentBranch", () => {
  it("git rev-parseでカレントブランチ名を取得する", async () => {
    mockExecFileAsync.mockResolvedValue({ stdout: "main\n", stderr: "" });

    const result = await getCurrentBranch("/test/repo");

    expect(mockExecFileAsync).toHaveBeenCalledWith(
      "git",
      ["rev-parse", "--abbrev-ref", "HEAD"],
      { cwd: "/test/repo" },
    );
    expect(result).toBe("main");
  });

  it("stdoutの末尾の改行文字をトリムする", async () => {
    mockExecFileAsync.mockResolvedValue({ stdout: "feature-branch\n", stderr: "" });

    const result = await getCurrentBranch("/test/repo");

    expect(result).toBe("feature-branch");
  });

  it("gitコマンド失敗時にエラーを投げる", async () => {
    mockExecFileAsync.mockRejectedValue(new Error("fatal: not a git repository"));

    await expect(getCurrentBranch("/test/repo")).rejects.toThrow(
      "fatal: not a git repository",
    );
  });
});

describe("getCurrentCommitHash", () => {
  it("git rev-parseでカレントコミットのショートハッシュを取得する", async () => {
    mockExecFileAsync.mockResolvedValue({ stdout: "abc123f\n", stderr: "" });

    const result = await getCurrentCommitHash("/test/repo");

    expect(mockExecFileAsync).toHaveBeenCalledWith(
      "git",
      ["rev-parse", "--short", "HEAD"],
      { cwd: "/test/repo" },
    );
    expect(result).toBe("abc123f");
  });

  it("stdoutの末尾の改行文字をトリムする", async () => {
    mockExecFileAsync.mockResolvedValue({ stdout: "1a2b3c4\n", stderr: "" });

    const result = await getCurrentCommitHash("/test/repo");

    expect(result).toBe("1a2b3c4");
  });

  it("gitコマンド失敗時にエラーを投げる", async () => {
    mockExecFileAsync.mockRejectedValue(new Error("fatal: not a git repository"));

    await expect(getCurrentCommitHash("/test/repo")).rejects.toThrow(
      "fatal: not a git repository",
    );
  });
});
