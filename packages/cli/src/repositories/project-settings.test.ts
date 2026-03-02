import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { readRawProjectSettings } from "./project-settings.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "reqord-settings-test-"));
  // .reqord/settings/ ディレクトリを作成
  await mkdir(join(tmpDir, ".reqord", "settings"), { recursive: true });
});

afterEach(async () => {
  if (tmpDir) {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

describe("readRawProjectSettings", () => {
  it("setting.yamlが存在しない場合は空オブジェクトを返す", async () => {
    const result = await readRawProjectSettings(tmpDir);
    expect(result).toEqual({});
  });

  it("有効なYAMLファイルの場合はパース結果を返す", async () => {
    const settingPath = join(tmpDir, ".reqord", "settings", "setting.yaml");
    await writeFile(settingPath, "approvalPrerequisites:\n  designMdCheck: false\n", "utf-8");

    const result = await readRawProjectSettings(tmpDir);

    expect(result).toEqual({
      approvalPrerequisites: { designMdCheck: false },
    });
  });

  it("空ファイルの場合は空オブジェクトを返す", async () => {
    const settingPath = join(tmpDir, ".reqord", "settings", "setting.yaml");
    await writeFile(settingPath, "", "utf-8");

    const result = await readRawProjectSettings(tmpDir);

    expect(result).toEqual({});
  });

  it("YAML構文エラーの場合はエラーをそのまま投げる", async () => {
    const settingPath = join(tmpDir, ".reqord", "settings", "setting.yaml");
    await writeFile(settingPath, "key: [\ninvalid yaml", "utf-8");

    await expect(readRawProjectSettings(tmpDir)).rejects.toThrow("YAML syntax error");
  });
});
