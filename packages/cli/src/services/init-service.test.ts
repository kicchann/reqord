import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  CONTEXT_DIR,
  REQUIREMENTS_DIR,
  SPECIFICATIONS_DIR,
  SETTINGS_DIR,
  TEMPLATES_DIR,
  RULES_DIR,
  ASSETS_DIR,
  DOMAIN_DIR,
  ISSUE_TEMPLATES_DIR,
} from "@reqord/shared";

vi.mock("../repositories/file-system.js", () => ({
  exists: vi.fn(),
  mkdirp: vi.fn(),
  writeText: vi.fn(),
  readText: vi.fn(),
  joinPath: vi.fn((...args: string[]) => args.join("/")),
  getReqordDir: vi.fn((...args: string[]) => [args[0], ".reqord", ...args.slice(1)].join("/")),
}));

vi.mock("../utils/templates.js", () => ({
  DEFAULT_REQUIREMENT_DESCRIPTION_TEMPLATE: "# Template",
  DEFAULT_REQUIREMENT_QUALITY_RULES: "# Rules",
}));

import { initProject } from "./init-service.js";
import * as fs from "../repositories/file-system.js";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("initProject", () => {
  it(".reqord/ が既に存在する場合は alreadyExists: true を返す", async () => {
    vi.mocked(fs.exists).mockResolvedValue(true);

    const result = await initProject("/cwd");

    expect(result).toEqual({ created: [], alreadyExists: true });
    expect(fs.mkdirp).not.toHaveBeenCalled();
    expect(fs.writeText).not.toHaveBeenCalled();
  });

  it("必要な6つのディレクトリが作成される", async () => {
    vi.mocked(fs.exists).mockResolvedValue(false);
    vi.mocked(fs.readText).mockResolvedValue("workflow-content");

    const result = await initProject("/cwd");

    const mkdirCalls = vi.mocked(fs.mkdirp).mock.calls.map(([p]) => p);
    expect(mkdirCalls).toContainEqual(expect.stringContaining(CONTEXT_DIR + "/" + DOMAIN_DIR));
    expect(mkdirCalls).toContainEqual(expect.stringContaining(REQUIREMENTS_DIR));
    expect(mkdirCalls).toContainEqual(expect.stringContaining(SPECIFICATIONS_DIR));
    expect(mkdirCalls).toContainEqual(
      expect.stringContaining(SETTINGS_DIR + "/" + TEMPLATES_DIR + "/" + ISSUE_TEMPLATES_DIR),
    );
    expect(mkdirCalls).toContainEqual(
      expect.stringContaining(SETTINGS_DIR + "/" + RULES_DIR),
    );
    expect(mkdirCalls).toContainEqual(expect.stringContaining(ASSETS_DIR));
    expect(result.alreadyExists).toBe(false);
  });

  it("デフォルトテンプレートとルールファイルが書き込まれる", async () => {
    vi.mocked(fs.exists).mockResolvedValue(false);
    vi.mocked(fs.readText).mockResolvedValue("workflow-content");

    await initProject("/cwd");

    const writeCalls = vi.mocked(fs.writeText).mock.calls;
    const templateWrite = writeCalls.find(
      ([path]) => path.includes("requirement-description.md"),
    );
    expect(templateWrite).toBeDefined();
    expect(templateWrite![1]).toBe("# Template");

    const rulesWrite = writeCalls.find(
      ([path]) => path.includes("requirement-quality.md"),
    );
    expect(rulesWrite).toBeDefined();
    expect(rulesWrite![1]).toBe("# Rules");
  });

  it(".gitkeep が specifications と assets に書き込まれる", async () => {
    vi.mocked(fs.exists).mockResolvedValue(false);
    vi.mocked(fs.readText).mockResolvedValue("workflow-content");

    await initProject("/cwd");

    const writeCalls = vi.mocked(fs.writeText).mock.calls;
    const gitkeepWrites = writeCalls.filter(
      ([path, content]) => path.endsWith(".gitkeep") && content === "",
    );
    expect(gitkeepWrites).toHaveLength(2);
    expect(gitkeepWrites.some(([p]) => p.includes(SPECIFICATIONS_DIR))).toBe(true);
    expect(gitkeepWrites.some(([p]) => p.includes(ASSETS_DIR))).toBe(true);
  });

  it("GitHub Actions ワークフローが生成される", async () => {
    vi.mocked(fs.exists).mockResolvedValue(false);
    vi.mocked(fs.readText).mockResolvedValue("workflow-yaml-content");

    const result = await initProject("/cwd");

    const writeCalls = vi.mocked(fs.writeText).mock.calls;
    const workflowWrite = writeCalls.find(
      ([path]) => path.includes("finalize-approval.yml"),
    );
    expect(workflowWrite).toBeDefined();
    expect(workflowWrite![1]).toBe("workflow-yaml-content");
    expect(result.created.some((p) => p.includes("finalize-approval.yml"))).toBe(true);
  });

  it("GitHub Actions ワークフローが既に存在する場合はスキップされる", async () => {
    vi.mocked(fs.exists)
      .mockResolvedValueOnce(false) // .reqord/ は存在しない
      .mockResolvedValueOnce(true); // finalize-approval.yml は存在する

    const result = await initProject("/cwd");

    const writeCalls = vi.mocked(fs.writeText).mock.calls;
    const workflowWrite = writeCalls.find(
      ([path]) => path.includes("finalize-approval.yml"),
    );
    expect(workflowWrite).toBeUndefined();
    expect(result.created.every((p) => !p.includes("finalize-approval.yml"))).toBe(true);
  });

  it("作成されたパスが created 配列に含まれる", async () => {
    vi.mocked(fs.exists).mockResolvedValue(false);
    vi.mocked(fs.readText).mockResolvedValue("workflow-content");

    const result = await initProject("/cwd");

    // 6 dirs + template + rules + workflow = 9
    expect(result.created).toHaveLength(9);
    expect(result.created.some((p) => p.includes("requirement-description.md"))).toBe(true);
    expect(result.created.some((p) => p.includes("requirement-quality.md"))).toBe(true);
    expect(result.created.some((p) => p.includes("finalize-approval.yml"))).toBe(true);
  });
});
