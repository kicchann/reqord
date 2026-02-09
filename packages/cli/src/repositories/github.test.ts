import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("node:child_process", () => {
  const mockExec = Object.assign(vi.fn(), { __type: "exec" });
  return { exec: mockExec };
});

vi.mock("node:util", () => {
  const mockExecAsync = vi.fn();
  return {
    promisify: () => mockExecAsync,
    mockExecAsync,
  };
});

import {
  createPullRequest,
  getPullRequest,
} from "./github.js";
import * as util from "node:util";

const mockExecAsync = (util as unknown as { mockExecAsync: ReturnType<typeof vi.fn> }).mockExecAsync;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createPullRequest", () => {
  it("gh pr createコマンドを実行してPR情報を取得する", async () => {
    mockExecAsync
      .mockResolvedValueOnce({
        stdout: "",
        stderr: "",
      })
      .mockResolvedValueOnce({
        stdout: JSON.stringify({ number: 42, url: "https://github.com/owner/repo/pull/42" }),
        stderr: "",
      });

    const result = await createPullRequest({
      title: "Add new feature",
      body: "This is a description",
      head: "feature-branch",
    });

    expect(mockExecAsync).toHaveBeenNthCalledWith(
      1,
      "gh pr create --title \"Add new feature\" --body \"This is a description\" --head feature-branch",
    );
    expect(mockExecAsync).toHaveBeenNthCalledWith(
      2,
      "gh pr view feature-branch --json number,url",
    );
    expect(result).toEqual({ number: 42, url: "https://github.com/owner/repo/pull/42" });
  });

  it("baseブランチを指定してPRを作成する", async () => {
    mockExecAsync
      .mockResolvedValueOnce({
        stdout: "",
        stderr: "",
      })
      .mockResolvedValueOnce({
        stdout: JSON.stringify({ number: 43, url: "https://github.com/owner/repo/pull/43" }),
        stderr: "",
      });

    await createPullRequest({
      title: "Fix bug",
      body: "Bug fix description",
      head: "fix-branch",
      base: "develop",
    });

    expect(mockExecAsync).toHaveBeenNthCalledWith(
      1,
      "gh pr create --title \"Fix bug\" --body \"Bug fix description\" --head fix-branch --base develop",
    );
  });

  it("ドラフトPRを作成する", async () => {
    mockExecAsync
      .mockResolvedValueOnce({
        stdout: "",
        stderr: "",
      })
      .mockResolvedValueOnce({
        stdout: JSON.stringify({ number: 44, url: "https://github.com/owner/repo/pull/44" }),
        stderr: "",
      });

    await createPullRequest({
      title: "Draft PR",
      body: "WIP",
      head: "wip-branch",
      draft: true,
    });

    expect(mockExecAsync).toHaveBeenNthCalledWith(
      1,
      "gh pr create --title \"Draft PR\" --body \"WIP\" --head wip-branch --draft",
    );
  });

  it("タイトルとボディ内のダブルクォートをエスケープする", async () => {
    mockExecAsync
      .mockResolvedValueOnce({
        stdout: "",
        stderr: "",
      })
      .mockResolvedValueOnce({
        stdout: JSON.stringify({ number: 45, url: "https://github.com/owner/repo/pull/45" }),
        stderr: "",
      });

    await createPullRequest({
      title: 'Add "new" feature',
      body: 'This is a "quoted" description',
      head: "feature-branch",
    });

    expect(mockExecAsync).toHaveBeenNthCalledWith(
      1,
      'gh pr create --title "Add \\"new\\" feature" --body "This is a \\"quoted\\" description" --head feature-branch',
    );
  });

  it("ghコマンド失敗時にエラーを投げる", async () => {
    mockExecAsync.mockRejectedValue(new Error("gh pr create failed"));

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
  it("PR番号を指定してgh pr viewを実行する", async () => {
    mockExecAsync.mockResolvedValue({
      stdout: JSON.stringify({
        number: 42,
        url: "https://github.com/owner/repo/pull/42",
        state: "OPEN",
      }),
      stderr: "",
    });

    const result = await getPullRequest(42);

    expect(mockExecAsync).toHaveBeenCalledWith(
      "gh pr view 42 --json number,url,state",
    );
    expect(result).toEqual({
      number: 42,
      url: "https://github.com/owner/repo/pull/42",
      state: "OPEN",
    });
  });

  it("ghコマンド失敗時にエラーを投げる", async () => {
    mockExecAsync.mockRejectedValue(new Error("PR not found"));

    await expect(getPullRequest(999)).rejects.toThrow("PR not found");
  });
});
