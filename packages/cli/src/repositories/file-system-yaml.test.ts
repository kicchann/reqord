import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { readYAML, writeYAML } from "./file-system.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "reqord-yaml-test-"));
});

afterEach(async () => {
  if (tmpDir) {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

describe("readYAML", () => {
  it("parses valid YAML correctly (simple object)", async () => {
    const filePath = join(tmpDir, "simple.yaml");
    await writeFile(filePath, "name: reqord\nversion: 1\n", "utf-8");

    const result = await readYAML<{ name: string; version: number }>(filePath);

    expect(result).toEqual({ name: "reqord", version: 1 });
  });

  it("handles nested objects and arrays", async () => {
    const filePath = join(tmpDir, "nested.yaml");
    const yamlContent = `
parent:
  child:
    key: value
  list:
    - item1
    - item2
`;
    await writeFile(filePath, yamlContent, "utf-8");

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

  it("handles Japanese strings", async () => {
    const filePath = join(tmpDir, "japanese.yaml");
    await writeFile(
      filePath,
      "title: 要件定義\ndescription: テストケースの説明文\n",
      "utf-8",
    );

    const result = await readYAML<{ title: string; description: string }>(filePath);

    expect(result).toEqual({
      title: "要件定義",
      description: "テストケースの説明文",
    });
  });

  it("preserves ISO 8601 date strings as strings (NOT Date objects!)", async () => {
    const filePath = join(tmpDir, "dates.yaml");
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

  it('throws with "YAML構文エラー" on syntax error', async () => {
    const filePath = join(tmpDir, "invalid.yaml");
    await writeFile(filePath, "key: [\ninvalid yaml syntax", "utf-8");

    await expect(readYAML(filePath)).rejects.toThrow("YAML構文エラー");
    await expect(readYAML(filePath)).rejects.toThrow(filePath);
  });
});

describe("writeYAML", () => {
  it("writes objects as valid YAML", async () => {
    const filePath = join(tmpDir, "output.yaml");
    const data = { name: "reqord", version: 1 };

    await writeYAML(filePath, data);

    const content = await readFile(filePath, "utf-8");
    expect(content).toContain("name: reqord");
    expect(content).toContain("version: 1");
  });

  it("uses 2-space indentation", async () => {
    const filePath = join(tmpDir, "indented.yaml");
    const data = { parent: { child: { nested: "value" } } };

    await writeYAML(filePath, data);

    const content = await readFile(filePath, "utf-8");
    expect(content).toContain("  child:");
    expect(content).toContain("    nested: value");
  });

  it("handles empty arrays and objects", async () => {
    const filePath = join(tmpDir, "empty.yaml");
    const data = {
      emptyArray: [],
      emptyObject: {},
      nullValue: null,
    };

    await writeYAML(filePath, data);

    const content = await readFile(filePath, "utf-8");
    expect(content).toContain("emptyArray: []");
    expect(content).toContain("emptyObject: {}");
    expect(content).toContain("nullValue: null");
  });

  it("preserves ISO 8601 date strings", async () => {
    const filePath = join(tmpDir, "dates-output.yaml");
    const data = {
      createdAt: "2026-01-15T10:30:00Z",
      updatedAt: "2026-02-01",
    };

    await writeYAML(filePath, data);

    const content = await readFile(filePath, "utf-8");
    expect(content).toContain("2026-01-15T10:30:00Z");
    expect(content).toContain("2026-02-01");
  });
});

describe("Round-trip", () => {
  it("write then read preserves data integrity", async () => {
    const filePath = join(tmpDir, "roundtrip.yaml");
    const originalData = {
      string: "value",
      number: 42,
      boolean: true,
      array: [1, 2, 3],
      nested: {
        key: "nested value",
        list: ["a", "b", "c"],
      },
      date: "2026-01-15T10:30:00Z",
    };

    await writeYAML(filePath, originalData);
    const roundTripped = await readYAML<typeof originalData>(filePath);

    expect(roundTripped).toEqual(originalData);
  });

  it("preserves special characters in strings", async () => {
    const filePath = join(tmpDir, "special.yaml");
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

  it("preserves Japanese text through round-trip", async () => {
    const filePath = join(tmpDir, "japanese-roundtrip.yaml");
    const data = {
      title: "要件管理システム",
      description: "仕様書を管理するためのツール",
      tags: ["開発", "自動化", "品質"],
    };

    await writeYAML(filePath, data);
    const result = await readYAML<typeof data>(filePath);

    expect(result).toEqual(data);
  });
});
