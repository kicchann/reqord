import { describe, it, expect, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { readYAML, writeYAML } from "../file-system.js";

let tempDir: string;

async function createTempDir(): Promise<string> {
  tempDir = await mkdtemp(join(tmpdir(), "reqord-yaml-test-"));
  return tempDir;
}

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
  }
});

describe("readYAML", () => {
  it("有効なYAMLファイルを正しくパースする", async () => {
    const dir = await createTempDir();
    const filePath = join(dir, "test.yaml");
    await writeFile(filePath, "name: reqord\nversion: 1\n", "utf-8");

    const result = await readYAML<{ name: string; version: number }>(filePath);

    expect(result).toEqual({ name: "reqord", version: 1 });
  });

  it("構文エラーのYAMLで 'YAML構文エラー' をスローする", async () => {
    const dir = await createTempDir();
    const filePath = join(dir, "invalid.yaml");
    await writeFile(filePath, "key: [\ninvalid yaml", "utf-8");

    await expect(readYAML(filePath)).rejects.toThrow("YAML構文エラー");
    await expect(readYAML(filePath)).rejects.toThrow(filePath);
  });

  it("ネストされたオブジェクトと配列を扱える", async () => {
    const dir = await createTempDir();
    const filePath = join(dir, "nested.yaml");
    const yaml = `
parent:
  child:
    key: value
  list:
    - item1
    - item2
`;
    await writeFile(filePath, yaml, "utf-8");

    const result = await readYAML<{
      parent: { child: { key: string }; list: string[] };
    }>(filePath);

    expect(result).toEqual({
      parent: {
        child: { key: "value" },
        list: ["item1", "item2"],
      },
    });
  });

  it("日本語文字列を正しく扱える", async () => {
    const dir = await createTempDir();
    const filePath = join(dir, "japanese.yaml");
    await writeFile(filePath, "title: 要件定義\ndescription: テスト用の説明\n", "utf-8");

    const result = await readYAML<{ title: string; description: string }>(filePath);

    expect(result).toEqual({
      title: "要件定義",
      description: "テスト用の説明",
    });
  });

  it("ISO 8601日付文字列をDateオブジェクトではなく文字列として保持する", async () => {
    const dir = await createTempDir();
    const filePath = join(dir, "dates.yaml");
    await writeFile(
      filePath,
      "createdAt: '2026-01-15T10:30:00Z'\nupdatedAt: '2026-02-01'\n",
      "utf-8",
    );

    const result = await readYAML<{ createdAt: string; updatedAt: string }>(filePath);

    expect(typeof result.createdAt).toBe("string");
    expect(typeof result.updatedAt).toBe("string");
    expect(result.createdAt).toBe("2026-01-15T10:30:00Z");
    expect(result.updatedAt).toBe("2026-02-01");
  });
});

describe("writeYAML", () => {
  it("JavaScriptオブジェクトをYAML形式で書き込む", async () => {
    const dir = await createTempDir();
    const filePath = join(dir, "output.yaml");

    await writeYAML(filePath, { name: "reqord", version: 1 });

    const content = await readFile(filePath, "utf-8");
    expect(content).toContain("name: reqord");
    expect(content).toContain("version: 1");
  });

  it("2スペースインデントを使用する", async () => {
    const dir = await createTempDir();
    const filePath = join(dir, "indent.yaml");

    await writeYAML(filePath, { parent: { child: "value" } });

    const content = await readFile(filePath, "utf-8");
    expect(content).toContain("  child: value");
  });

  it("空配列・空オブジェクト・null値を扱える", async () => {
    const dir = await createTempDir();
    const filePath = join(dir, "empty.yaml");

    await writeYAML(filePath, {
      emptyArray: [],
      emptyObject: {},
      nullValue: null,
    });

    const content = await readFile(filePath, "utf-8");
    expect(content).toContain("emptyArray: []");
    expect(content).toContain("emptyObject: {}");
    expect(content).toContain("nullValue: null");
  });

  it("ISO 8601日付文字列を文字列として保持する", async () => {
    const dir = await createTempDir();
    const filePath = join(dir, "dates-out.yaml");
    const data = {
      createdAt: "2026-01-15T10:30:00Z",
      updatedAt: "2026-02-01",
    };

    await writeYAML(filePath, data);

    const roundTripped = await readYAML<typeof data>(filePath);
    expect(typeof roundTripped.createdAt).toBe("string");
    expect(typeof roundTripped.updatedAt).toBe("string");
    expect(roundTripped.createdAt).toBe("2026-01-15T10:30:00Z");
    expect(roundTripped.updatedAt).toBe("2026-02-01");
  });
});

describe("エッジケース", () => {
  it("特殊文字（:, #, -, |, >）を含む文字列を正しくラウンドトリップする", async () => {
    const dir = await createTempDir();
    const filePath = join(dir, "special.yaml");
    const data = {
      colon: "key: value",
      hash: "comment # here",
      dash: "- list item",
      pipe: "line1 | line2",
      gt: "greater > than",
    };

    await writeYAML(filePath, data);
    const result = await readYAML<typeof data>(filePath);

    expect(result).toEqual(data);
  });
});
