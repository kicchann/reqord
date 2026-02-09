import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

function makeSpecJson(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    id: "spec-000001",
    requirementId: "req-000001",
    version: "1.0.0",
    status: "draft",
    createdAt: "2026-02-08T14:07:39.737Z",
    updatedAt: "2026-02-08T14:07:54.055Z",
    versionHistory: [],
    files: {
      design: "specifications/spec-000001/design.md",
      supplementary: [],
    },
    ...overrides,
  });
}

describe("LocalSpecificationRepository", () => {
  let tmpDir: string;
  let specDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "reqord-spec-test-"));
    specDir = join(tmpDir, ".reqord", "specifications");
    await mkdir(specDir, { recursive: true });
    process.env.REQORD_ROOT = tmpDir;
    vi.resetModules();
  });

  afterEach(async () => {
    delete process.env.REQORD_ROOT;
    await rm(tmpDir, { recursive: true, force: true });
  });

  async function getRepo() {
    const { LocalSpecificationRepository } = await import(
      "../../lib/local-specification-repository"
    );
    return new LocalSpecificationRepository();
  }

  describe("findAll", () => {
    it("returns all valid specification files sorted by ID", async () => {
      await writeFile(
        join(specDir, "spec-000002.json"),
        makeSpecJson({ id: "spec-000002", requirementId: "req-000002" }),
      );
      await writeFile(
        join(specDir, "spec-000001.json"),
        makeSpecJson({ id: "spec-000001", requirementId: "req-000001" }),
      );

      const repo = await getRepo();
      const specs = await repo.findAll();

      expect(specs).toHaveLength(2);
      expect(specs[0].id).toBe("spec-000001");
      expect(specs[1].id).toBe("spec-000002");
    });

    it("skips invalid JSON files", async () => {
      await writeFile(
        join(specDir, "spec-000001.json"),
        makeSpecJson({ id: "spec-000001" }),
      );
      await writeFile(join(specDir, "spec-000002.json"), "{ invalid json }");

      const repo = await getRepo();
      const specs = await repo.findAll();

      expect(specs).toHaveLength(1);
      expect(specs[0].id).toBe("spec-000001");
    });

    it("skips files not matching spec-NNNNNN.json pattern", async () => {
      await writeFile(
        join(specDir, "spec-000001.json"),
        makeSpecJson({ id: "spec-000001" }),
      );
      await writeFile(join(specDir, "notes.txt"), "not a spec");

      const repo = await getRepo();
      const specs = await repo.findAll();

      expect(specs).toHaveLength(1);
    });

    it("returns empty array when directory has no files", async () => {
      const repo = await getRepo();
      const specs = await repo.findAll();

      expect(specs).toEqual([]);
    });
  });

  describe("findById", () => {
    it("returns a specification when it exists", async () => {
      await writeFile(
        join(specDir, "spec-000001.json"),
        makeSpecJson({ id: "spec-000001" }),
      );

      const repo = await getRepo();
      const spec = await repo.findById("spec-000001");

      expect(spec).not.toBeNull();
      expect(spec!.id).toBe("spec-000001");
      expect(spec!.requirementId).toBe("req-000001");
    });

    it("returns null when specification does not exist", async () => {
      const repo = await getRepo();
      const spec = await repo.findById("spec-999999");

      expect(spec).toBeNull();
    });

    it("throws on invalid specification data", async () => {
      await writeFile(
        join(specDir, "spec-000001.json"),
        JSON.stringify({ id: "spec-000001" }),
      );

      const repo = await getRepo();
      await expect(repo.findById("spec-000001")).rejects.toThrow(
        "Invalid specification",
      );
    });
  });

  describe("loadDesign", () => {
    it("returns design content when design.md exists", async () => {
      const designDir = join(specDir, "spec-000001");
      await mkdir(designDir, { recursive: true });
      await writeFile(join(designDir, "design.md"), "# Design\n\nSome content");

      const repo = await getRepo();
      const design = await repo.loadDesign("spec-000001");

      expect(design).toBe("# Design\n\nSome content");
    });

    it("returns null when design.md does not exist", async () => {
      const repo = await getRepo();
      const design = await repo.loadDesign("spec-999999");

      expect(design).toBeNull();
    });
  });

  describe("findByRequirementId", () => {
    it("returns specifications matching the requirement ID", async () => {
      await writeFile(
        join(specDir, "spec-000001.json"),
        makeSpecJson({ id: "spec-000001", requirementId: "req-000001" }),
      );
      await writeFile(
        join(specDir, "spec-000002.json"),
        makeSpecJson({ id: "spec-000002", requirementId: "req-000002" }),
      );
      await writeFile(
        join(specDir, "spec-000003.json"),
        makeSpecJson({ id: "spec-000003", requirementId: "req-000001" }),
      );

      const repo = await getRepo();
      const specs = await repo.findByRequirementId("req-000001");

      expect(specs).toHaveLength(2);
      expect(specs.map((s) => s.id)).toEqual(["spec-000001", "spec-000003"]);
    });

    it("returns empty array when no specifications match", async () => {
      await writeFile(
        join(specDir, "spec-000001.json"),
        makeSpecJson({ id: "spec-000001", requirementId: "req-000001" }),
      );

      const repo = await getRepo();
      const specs = await repo.findByRequirementId("req-999999");

      expect(specs).toEqual([]);
    });
  });
});
