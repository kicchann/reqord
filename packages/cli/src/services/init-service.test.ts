import { describe, it, expect, vi, beforeEach } from "vitest";
import { SPECIFICATIONS_DIR, ASSETS_DIR, ISSUES_DIR } from "@reqord/shared";

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

  it("必要な7つのディレクトリが作成される", async () => {
    vi.mocked(fs.exists).mockResolvedValue(false);

    const result = await initProject("/cwd");

    const mkdirCalls = vi.mocked(fs.mkdirp).mock.calls.map(([p]) => p);
    expect(mkdirCalls).toContainEqual("/cwd/.reqord/context/domain");
    expect(mkdirCalls).toContainEqual("/cwd/.reqord/requirements");
    expect(mkdirCalls).toContainEqual("/cwd/.reqord/specifications");
    expect(mkdirCalls).toContainEqual("/cwd/.reqord/settings/templates/issue-templates");
    expect(mkdirCalls).toContainEqual("/cwd/.reqord/settings/rules");
    expect(mkdirCalls).toContainEqual("/cwd/.reqord/assets");
    expect(mkdirCalls).toContainEqual("/cwd/.reqord/issues");
    expect(result.alreadyExists).toBe(false);
  });

  it("デフォルトテンプレートとルールファイルが書き込まれる", async () => {
    vi.mocked(fs.exists).mockResolvedValue(false);

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

  it(".gitkeep が specifications と assets と issues に書き込まれる", async () => {
    vi.mocked(fs.exists).mockResolvedValue(false);

    await initProject("/cwd");

    const writeCalls = vi.mocked(fs.writeText).mock.calls;
    const gitkeepWrites = writeCalls.filter(
      ([path, content]) => path.endsWith(".gitkeep") && content === "",
    );
    expect(gitkeepWrites).toHaveLength(3);
    expect(gitkeepWrites.some(([p]) => p.includes(SPECIFICATIONS_DIR))).toBe(true);
    expect(gitkeepWrites.some(([p]) => p.includes(ASSETS_DIR))).toBe(true);
    expect(gitkeepWrites.some(([p]) => p.includes(ISSUES_DIR))).toBe(true);
  });

  it("作成されたパスが created 配列に含まれる", async () => {
    vi.mocked(fs.exists).mockResolvedValue(false);

    const result = await initProject("/cwd");

    // 7 dirs + template + rules + 3 gitkeeps = 12
    expect(result.created).toHaveLength(12);
    expect(result.created.some((p) => p.includes("requirement-description.md"))).toBe(true);
    expect(result.created.some((p) => p.includes("requirement-quality.md"))).toBe(true);
    expect(result.created.filter((p) => p.endsWith(".gitkeep"))).toHaveLength(3);
  });
});
