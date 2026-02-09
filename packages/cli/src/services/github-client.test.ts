import { describe, it, expect, vi, beforeEach } from "vitest";

// Create mock inside the factory to avoid hoisting issues
vi.mock("node:child_process", () => {
  const mockExec = Object.assign(vi.fn(), { __type: "exec" });
  const mockExecFile = Object.assign(vi.fn(), { __type: "execFile" });
  return {
    exec: mockExec,
    execFile: mockExecFile,
  };
});

vi.mock("node:util", () => {
  const mockExecAsync = vi.fn();
  const mockExecFileAsync = vi.fn();
  return {
    promisify: (fn: unknown) => {
      const tagged = fn as { __type?: string };
      if (tagged.__type === "execFile") return mockExecFileAsync;
      return mockExecAsync;
    },
    mockExecAsync,
    mockExecFileAsync,
  };
});

import {
  listFeedbackIssues,
  getIssue,
  updateIssueBody,
  closeIssue,
} from "./github-client.js";
import * as util from "node:util";

const mockExecAsync = (util as unknown as { mockExecAsync: ReturnType<typeof vi.fn> }).mockExecAsync;
const mockExecFileAsync = (util as unknown as { mockExecFileAsync: ReturnType<typeof vi.fn> }).mockExecFileAsync;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listFeedbackIssues", () => {
  it("gh issueコマンドにbodyフィールドを含めて実行する", async () => {
    mockExecAsync.mockResolvedValue({
      stdout: "[]",
      stderr: "",
    });

    await listFeedbackIssues();

    expect(mockExecAsync).toHaveBeenCalledWith(
      "gh issue list --label feedback --json number,title,state,labels,createdAt,body --limit 1000",
    );
  });

  it("JSON形式のissue一覧をパースする", async () => {
    const rawIssues = [
      {
        number: 17,
        title: "Test feedback",
        state: "OPEN",
        labels: [{ name: "feedback" }, { name: "bug" }],
        createdAt: "2026-01-01T00:00:00Z",
        body: "Issue body",
      },
      {
        number: 18,
        title: "Another feedback",
        state: "CLOSED",
        labels: [{ name: "feedback" }],
        createdAt: "2026-01-02T00:00:00Z",
        body: "Another body",
      },
    ];

    mockExecAsync.mockResolvedValue({
      stdout: JSON.stringify(rawIssues),
      stderr: "",
    });

    const result = await listFeedbackIssues();

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      number: 17,
      title: "Test feedback",
      state: "open",
      labels: ["feedback", "bug"],
      createdAt: "2026-01-01T00:00:00Z",
      body: "Issue body",
    });
    expect(result[1]).toEqual({
      number: 18,
      title: "Another feedback",
      state: "closed",
      labels: ["feedback"],
      createdAt: "2026-01-02T00:00:00Z",
      body: "Another body",
    });
  });

  it("labels配列をオブジェクトから文字列配列に変換する", async () => {
    const rawIssues = [
      {
        number: 17,
        title: "Test",
        state: "OPEN",
        labels: [
          { name: "feedback" },
          { name: "bug" },
        ],
        createdAt: "2026-01-01T00:00:00Z",
        body: "",
      },
    ];

    mockExecAsync.mockResolvedValue({
      stdout: JSON.stringify(rawIssues),
      stderr: "",
    });

    const result = await listFeedbackIssues();

    expect(result[0].labels).toEqual(["feedback", "bug"]);
  });

  it("ghコマンド失敗時にエラーを投げる", async () => {
    mockExecAsync.mockRejectedValue(new Error("gh command failed"));

    await expect(listFeedbackIssues()).rejects.toThrow("gh command failed");
  });
});

describe("getIssue", () => {
  it("issue番号を指定してgh issue viewを実行する", async () => {
    const rawIssue = {
      number: 17,
      title: "Test",
      state: "OPEN",
      labels: [{ name: "feedback" }],
      createdAt: "2026-01-01T00:00:00Z",
      body: "Issue body",
    };

    mockExecAsync.mockResolvedValue({
      stdout: JSON.stringify(rawIssue),
      stderr: "",
    });

    await getIssue(17);

    expect(mockExecAsync).toHaveBeenCalledWith(
      "gh issue view 17 --json number,title,state,labels,createdAt,body",
    );
  });

  it("issueの詳細を正規化して返す", async () => {
    const rawIssue = {
      number: 17,
      title: "Test feedback",
      state: "OPEN",
      labels: [{ name: "feedback" }, { name: "bug" }],
      createdAt: "2026-01-01T00:00:00Z",
      body: "Issue body content",
    };

    mockExecAsync.mockResolvedValue({
      stdout: JSON.stringify(rawIssue),
      stderr: "",
    });

    const result = await getIssue(17);

    expect(result).toEqual({
      number: 17,
      title: "Test feedback",
      state: "open",
      labels: ["feedback", "bug"],
      createdAt: "2026-01-01T00:00:00Z",
      body: "Issue body content",
    });
  });

  it("ghコマンド失敗時にエラーを投げる", async () => {
    mockExecAsync.mockRejectedValue(new Error("Issue not found"));

    await expect(getIssue(999)).rejects.toThrow("Issue not found");
  });
});

describe("updateIssueBody", () => {
  it("execFileを使ってIssue bodyを安全に更新する", async () => {
    mockExecFileAsync.mockResolvedValue({
      stdout: "",
      stderr: "",
    });

    await updateIssueBody(17, "New body content");

    expect(mockExecFileAsync).toHaveBeenCalledWith(
      "gh",
      ["issue", "edit", "17", "--body", "New body content"],
    );
  });

  it("HTMLコメント付きのbodyを安全に更新する", async () => {
    mockExecFileAsync.mockResolvedValue({
      stdout: "",
      stderr: "",
    });

    const body = 'Issue text\n<!-- reqord:feedback {"type":"bug"} -->';
    await updateIssueBody(17, body);

    expect(mockExecFileAsync).toHaveBeenCalledWith(
      "gh",
      ["issue", "edit", "17", "--body", body],
    );
  });

  it("ghコマンド失敗時にエラーを投げる", async () => {
    mockExecFileAsync.mockRejectedValue(new Error("Failed to update issue"));

    await expect(updateIssueBody(17, "body")).rejects.toThrow("Failed to update issue");
  });
});

describe("closeIssue", () => {
  it("コメントなしでissueをクローズする", async () => {
    mockExecAsync.mockResolvedValue({
      stdout: "",
      stderr: "",
    });

    await closeIssue(17);

    expect(mockExecAsync).toHaveBeenCalledWith("gh issue close 17");
  });

  it("コメント付きでissueをクローズする", async () => {
    mockExecAsync.mockResolvedValue({
      stdout: "",
      stderr: "",
    });

    await closeIssue(17, "Fixed in PR #123");

    expect(mockExecAsync).toHaveBeenCalledWith(
      'gh issue close 17 --comment "Fixed in PR #123"',
    );
  });

  it("コメント内のダブルクォートをエスケープする", async () => {
    mockExecAsync.mockResolvedValue({
      stdout: "",
      stderr: "",
    });

    await closeIssue(17, 'Fixed with "new feature"');

    expect(mockExecAsync).toHaveBeenCalledWith(
      'gh issue close 17 --comment "Fixed with \\"new feature\\""',
    );
  });

  it("ghコマンド失敗時にエラーを投げる", async () => {
    mockExecAsync.mockRejectedValue(new Error("Failed to close issue"));

    await expect(closeIssue(17)).rejects.toThrow("Failed to close issue");
  });
});
