import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";

let mockSpawnInstance: EventEmitter & { stdin: PassThrough; stderr: PassThrough; stdout: PassThrough };

vi.mock("node:child_process", () => {
  const mockExec = Object.assign(vi.fn(), { __type: "exec" });
  const mockSpawn = vi.fn(() => mockSpawnInstance);
  return {
    exec: mockExec,
    spawn: mockSpawn,
  };
});

vi.mock("node:util", () => {
  const mockExecAsync = vi.fn();
  return {
    promisify: () => mockExecAsync,
    mockExecAsync,
  };
});

import {
  listFeedbackIssues,
  getIssue,
  updateIssueBody,
  closeIssue,
  createIssue,
  getIssueDetail,
  listIssuesByLabel,
} from "./github-client.js";
import * as util from "node:util";
import * as childProcess from "node:child_process";

const mockExecAsync = (util as unknown as { mockExecAsync: ReturnType<typeof vi.fn> }).mockExecAsync;
const mockSpawn = vi.mocked(childProcess.spawn);

function createMockSpawnInstance(exitCode = 0, stdoutData = "", stderrData = "") {
  const instance = new EventEmitter() as EventEmitter & { stdin: PassThrough; stderr: PassThrough; stdout: PassThrough };
  instance.stdin = new PassThrough();
  instance.stderr = new PassThrough();
  instance.stdout = new PassThrough();
  mockSpawnInstance = instance;

  // Emit close on next tick to allow stdin.write/end to complete
  process.nextTick(() => {
    if (stdoutData) {
      instance.stdout.push(stdoutData);
      instance.stdout.push(null);
    }
    if (stderrData) {
      instance.stderr.push(stderrData);
      instance.stderr.push(null);
    }
    instance.emit("close", exitCode);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listFeedbackIssues", () => {
  it("gh issueコマンドにbodyフィールドとmaxBufferを含めて実行する", async () => {
    mockExecAsync.mockResolvedValue({
      stdout: "[]",
      stderr: "",
    });

    await listFeedbackIssues();

    expect(mockExecAsync).toHaveBeenCalledWith(
      "gh issue list --label feedback --json number,title,state,labels,createdAt,body --limit 1000",
      { maxBuffer: 10 * 1024 * 1024 },
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
  it("spawnで--body-file -を使いstdin経由でbodyを渡す", async () => {
    createMockSpawnInstance(0);

    await updateIssueBody(17, "New body content");

    expect(mockSpawn).toHaveBeenCalledWith(
      "gh",
      ["issue", "edit", "17", "--body-file", "-"],
    );
  });

  it("HTMLコメント付きのbodyをstdin経由で安全に渡す", async () => {
    createMockSpawnInstance(0);

    const body = 'Issue text\n<!-- reqord:feedback {"type":"bug"} -->';
    await updateIssueBody(17, body);

    expect(mockSpawn).toHaveBeenCalledWith(
      "gh",
      ["issue", "edit", "17", "--body-file", "-"],
    );
  });

  it("ghコマンド失敗時にエラーを投げる", async () => {
    createMockSpawnInstance(1);

    await expect(updateIssueBody(17, "body")).rejects.toThrow("gh issue edit failed");
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

describe("createIssue", () => {
  it("spawnでgh issue createを--body-file -付きで実行する", async () => {
    const stdoutData = "https://github.com/owner/repo/issues/42\n";
    createMockSpawnInstance(0, stdoutData);

    const options = {
      title: "New issue",
      body: "Issue body",
      labels: ["bug", "enhancement"],
    };

    await createIssue(options);

    expect(mockSpawn).toHaveBeenCalledWith("gh", [
      "issue",
      "create",
      "--title",
      "New issue",
      "--label",
      "bug,enhancement",
      "--body-file",
      "-",
    ]);
  });

  it("stdoutのURLからissue番号とURLを抽出する", async () => {
    const stdoutData = "https://github.com/owner/repo/issues/42\n";
    createMockSpawnInstance(0, stdoutData);

    const options = {
      title: "New issue",
      body: "Issue body",
      labels: ["bug"],
    };

    const result = await createIssue(options);

    expect(result).toEqual({
      number: 42,
      url: "https://github.com/owner/repo/issues/42",
    });
  });

  it("HTMLコメント付きのbodyをstdin経由で安全に渡す", async () => {
    const stdoutData = "https://github.com/owner/repo/issues/123\n";
    createMockSpawnInstance(0, stdoutData);

    const options = {
      title: "Spec issue",
      body: 'Issue text\n<!-- reqord:specification {"version":"1.0.0"} -->',
      labels: ["reqord"],
    };

    await createIssue(options);

    expect(mockSpawn).toHaveBeenCalledWith("gh", [
      "issue",
      "create",
      "--title",
      "Spec issue",
      "--label",
      "reqord",
      "--body-file",
      "-",
    ]);
  });

  it("ghコマンド失敗時にエラーを投げる", async () => {
    const stderrData = "error: title is required";
    createMockSpawnInstance(1, "", stderrData);

    const options = {
      title: "",
      body: "body",
      labels: ["bug"],
    };

    await expect(createIssue(options)).rejects.toThrow("gh issue create failed");
  });

  it("stdoutからURLを抽出できない場合にエラーを投げる", async () => {
    const stdoutData = "Some unexpected output\n";
    createMockSpawnInstance(0, stdoutData);

    const options = {
      title: "New issue",
      body: "body",
      labels: ["bug"],
    };

    await expect(createIssue(options)).rejects.toThrow("Failed to extract issue URL from gh output");
  });
});

describe("getIssueDetail", () => {
  it("issue番号を指定してupdatedAt/closedAtを含むgh issue viewを実行する", async () => {
    const rawIssue = {
      number: 17,
      title: "Test",
      state: "OPEN",
      labels: [{ name: "reqord-generated" }],
      createdAt: "2026-01-01T00:00:00Z",
      body: "body",
      updatedAt: "2026-01-05T00:00:00Z",
      closedAt: null,
    };
    mockExecAsync.mockResolvedValue({ stdout: JSON.stringify(rawIssue), stderr: "" });

    await getIssueDetail(17);

    expect(mockExecAsync).toHaveBeenCalledWith(
      "gh issue view 17 --json number,title,state,labels,createdAt,body,updatedAt,closedAt",
    );
  });

  it("updatedAtとclosedAtを含む詳細を返す", async () => {
    const rawIssue = {
      number: 17,
      title: "Test issue",
      state: "CLOSED",
      labels: [{ name: "reqord-generated" }, { name: "P1" }],
      createdAt: "2026-01-01T00:00:00Z",
      body: "Some body",
      updatedAt: "2026-01-10T00:00:00Z",
      closedAt: "2026-01-10T00:00:00Z",
    };
    mockExecAsync.mockResolvedValue({ stdout: JSON.stringify(rawIssue), stderr: "" });

    const result = await getIssueDetail(17);

    expect(result).toEqual({
      number: 17,
      title: "Test issue",
      state: "closed",
      labels: ["reqord-generated", "P1"],
      createdAt: "2026-01-01T00:00:00Z",
      body: "Some body",
      updatedAt: "2026-01-10T00:00:00Z",
      closedAt: "2026-01-10T00:00:00Z",
    });
  });

  it("closedAtがnullの場合はnullを返す", async () => {
    const rawIssue = {
      number: 17,
      title: "Open issue",
      state: "OPEN",
      labels: [{ name: "reqord-generated" }],
      createdAt: "2026-01-01T00:00:00Z",
      body: "body",
      updatedAt: "2026-01-05T00:00:00Z",
      closedAt: null,
    };
    mockExecAsync.mockResolvedValue({ stdout: JSON.stringify(rawIssue), stderr: "" });

    const result = await getIssueDetail(17);
    expect(result.closedAt).toBeNull();
  });
});

describe("listIssuesByLabel", () => {
  it("指定ラベルでspawn経由でgh issue listを実行する", async () => {
    createMockSpawnInstance(0, "[]");

    await listIssuesByLabel(["reqord-generated"]);

    expect(mockSpawn).toHaveBeenCalledWith("gh", [
      "issue", "list",
      "--label", "reqord-generated",
      "--state", "all",
      "--json", "number,title,state,labels,createdAt,body",
      "--limit", "1000",
    ]);
  });

  it("複数ラベル指定時に各ラベルを個別の--label引数で渡す", async () => {
    createMockSpawnInstance(0, "[]");

    await listIssuesByLabel(["reqord-generated", "P1"]);

    expect(mockSpawn).toHaveBeenCalledWith("gh", [
      "issue", "list",
      "--label", "reqord-generated",
      "--label", "P1",
      "--state", "all",
      "--json", "number,title,state,labels,createdAt,body",
      "--limit", "1000",
    ]);
  });

  it("state指定でフィルタする", async () => {
    createMockSpawnInstance(0, "[]");

    await listIssuesByLabel(["reqord-generated"], "open");

    expect(mockSpawn).toHaveBeenCalledWith("gh", [
      "issue", "list",
      "--label", "reqord-generated",
      "--state", "open",
      "--json", "number,title,state,labels,createdAt,body",
      "--limit", "1000",
    ]);
  });

  it("結果をnormalizeして返す", async () => {
    const rawIssues = [
      {
        number: 42,
        title: "Task 1",
        state: "OPEN",
        labels: [{ name: "reqord-generated" }, { name: "P1" }],
        createdAt: "2026-01-01T00:00:00Z",
        body: "Issue body",
      },
    ];
    createMockSpawnInstance(0, JSON.stringify(rawIssues));

    const result = await listIssuesByLabel(["reqord-generated"]);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      number: 42,
      title: "Task 1",
      state: "open",
      labels: ["reqord-generated", "P1"],
      createdAt: "2026-01-01T00:00:00Z",
      body: "Issue body",
    });
  });

  it("ghコマンド失敗時にエラーを投げる", async () => {
    createMockSpawnInstance(1, "", "gh command failed");
    await expect(listIssuesByLabel(["reqord-generated"])).rejects.toThrow("gh issue list failed");
  });
});
