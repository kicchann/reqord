import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("loadSpecFile", () => {
  let tmpDir: string;
  let specDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "reqord-spec-file-test-"));
    specDir = join(tmpDir, ".reqord", "specifications");
    await mkdir(specDir, { recursive: true });
    process.env.REQORD_ROOT = tmpDir;
    vi.resetModules();
  });

  afterEach(async () => {
    delete process.env.REQORD_ROOT;
    await rm(tmpDir, { recursive: true, force: true });
  });

  async function getLoadSpecFile() {
    const { loadSpecFile } = await import("../../lib/specification-file");
    return loadSpecFile;
  }

  it("returns file content when file exists", async () => {
    const specSubDir = join(specDir, "spec-000001");
    await mkdir(specSubDir, { recursive: true });
    await writeFile(join(specSubDir, "design.md"), "# Design\n\nContent here");

    const loadSpecFile = await getLoadSpecFile();
    const content = await loadSpecFile("spec-000001", "design.md");

    expect(content).toBe("# Design\n\nContent here");
  });

  it("returns null when file does not exist", async () => {
    const loadSpecFile = await getLoadSpecFile();
    const content = await loadSpecFile("spec-999999", "nonexistent.md");

    expect(content).toBeNull();
  });

  it("returns null when spec directory does not exist", async () => {
    const loadSpecFile = await getLoadSpecFile();
    const content = await loadSpecFile("spec-999999", "design.md");

    expect(content).toBeNull();
  });

  it("loads research.md correctly", async () => {
    const specSubDir = join(specDir, "spec-000001");
    await mkdir(specSubDir, { recursive: true });
    await writeFile(join(specSubDir, "research.md"), "# Research\n\nFindings");

    const loadSpecFile = await getLoadSpecFile();
    const content = await loadSpecFile("spec-000001", "research.md");

    expect(content).toBe("# Research\n\nFindings");
  });
});
