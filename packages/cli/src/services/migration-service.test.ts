import { mkdtemp, writeFile, readFile, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { rm, access } from "node:fs/promises";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { load as yamlLoad } from "js-yaml";
import { createMigrationPlan, migrateToYaml } from "./migration-service.js";
import { AppError } from "../utils/errors.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "reqord-migration-test-"));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

// Helper function to set up .reqord structure
async function setupReqordDir() {
  const reqordDir = join(tmpDir, ".reqord");
  const reqDir = join(reqordDir, "requirements");
  const specDir = join(reqordDir, "specifications");
  const contextDir = join(reqordDir, "context");
  const feedbackDir = join(reqordDir, "feedback");
  await mkdir(reqDir, { recursive: true });
  await mkdir(specDir, { recursive: true });
  await mkdir(contextDir, { recursive: true });
  await mkdir(feedbackDir, { recursive: true });
  return { reqordDir, reqDir, specDir, contextDir, feedbackDir };
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

// Minimal valid JSON test data
const minReq = {
  id: "req-000001",
  title: "Test Requirement",
  version: "1.0.0",
  status: "draft",
  priority: "medium",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  versionHistory: [],
  files: {
    description: "requirements/req-000001/description.md",
    supplementary: [],
  },
  format: {
    type: "free-form",
  },
  dependencies: {
    blockedBy: [],
    blocks: [],
    relatedTo: [],
  },
};

const minSpec = {
  id: "spec-000001",
  requirementId: "req-000001",
  version: "1.0.0",
  status: "draft",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  versionHistory: [],
  files: {
    description: "specifications/spec-000001/description.md",
    supplementary: [],
  },
};

const minContext = {
  productName: "Test Product",
  description: "Test Description",
  domain: "Test Domain",
};

const minFeedback = {
  items: [],
  metadata: {
    totalCount: 0,
    lastUpdated: "2026-01-01T00:00:00.000Z",
  },
};

describe("migration-service", () => {
  describe("createMigrationPlan", () => {
    it("detects requirement JSON files in .reqord/requirements/", async () => {
      const { reqDir } = await setupReqordDir();
      await writeFile(join(reqDir, "req-000001.json"), JSON.stringify(minReq, null, 2));
      await writeFile(join(reqDir, "req-000002.json"), JSON.stringify(minReq, null, 2));

      const plan = await createMigrationPlan(tmpDir);

      expect(plan).toHaveLength(2);
      expect(plan[0].type).toBe("requirement");
      expect(plan[0].source).toContain("req-000001.json");
      expect(plan[0].destination).toContain("req-000001.yaml");
      expect(plan[1].source).toContain("req-000002.json");
    });

    it("detects specification JSON files in .reqord/specifications/", async () => {
      const { specDir } = await setupReqordDir();
      await writeFile(join(specDir, "spec-000001.json"), JSON.stringify(minSpec, null, 2));
      await writeFile(join(specDir, "spec-000002.json"), JSON.stringify(minSpec, null, 2));

      const plan = await createMigrationPlan(tmpDir);

      expect(plan).toHaveLength(2);
      expect(plan[0].type).toBe("specification");
      expect(plan[0].source).toContain("spec-000001.json");
      expect(plan[0].destination).toContain("spec-000001.yaml");
      expect(plan[1].source).toContain("spec-000002.json");
    });

    it("detects context JSON files (product.json, technical.json, structure.json, context.json)", async () => {
      const { contextDir } = await setupReqordDir();
      await writeFile(join(contextDir, "product.json"), JSON.stringify(minContext, null, 2));
      await writeFile(
        join(contextDir, "technical.json"),
        JSON.stringify(minContext, null, 2),
      );
      await writeFile(join(contextDir, "structure.json"), JSON.stringify(minContext, null, 2));
      await writeFile(join(contextDir, "context.json"), JSON.stringify(minContext, null, 2));

      const plan = await createMigrationPlan(tmpDir);

      expect(plan).toHaveLength(4);
      expect(plan.every((item) => item.type === "context")).toBe(true);
      expect(plan.some((item) => item.source.endsWith("product.json"))).toBe(true);
      expect(plan.some((item) => item.source.endsWith("technical.json"))).toBe(true);
      expect(plan.some((item) => item.source.endsWith("structure.json"))).toBe(true);
      expect(plan.some((item) => item.source.endsWith("context.json"))).toBe(true);
    });

    it("detects feedback index.json", async () => {
      const { feedbackDir } = await setupReqordDir();
      await writeFile(join(feedbackDir, "index.json"), JSON.stringify(minFeedback, null, 2));

      const plan = await createMigrationPlan(tmpDir);

      expect(plan).toHaveLength(1);
      expect(plan[0].type).toBe("feedback");
      expect(plan[0].source).toContain("index.json");
      expect(plan[0].destination).toContain("index.yaml");
    });

    it("returns empty plan for empty .reqord directory", async () => {
      await setupReqordDir();

      const plan = await createMigrationPlan(tmpDir);

      expect(plan).toHaveLength(0);
    });

    it("does NOT include .md files or non-JSON files", async () => {
      const { reqDir, specDir, contextDir } = await setupReqordDir();
      await writeFile(join(reqDir, "req-000001.md"), "# Markdown file");
      await writeFile(join(specDir, "spec-000001.txt"), "Text file");
      await writeFile(join(contextDir, "product.yaml"), "yaml: file");
      await writeFile(join(reqDir, "random.json"), "{}"); // Does not start with req-

      const plan = await createMigrationPlan(tmpDir);

      expect(plan).toHaveLength(0);
    });
  });

  describe("migrateToYaml - dryRun mode", () => {
    it("returns plan without modifying any files (dryRun: true)", async () => {
      const { reqDir } = await setupReqordDir();
      const reqFile = join(reqDir, "req-000001.json");
      await writeFile(reqFile, JSON.stringify(minReq, null, 2));

      const result = await migrateToYaml(tmpDir, { dryRun: true });

      expect(result.plan).toHaveLength(1);
      expect(result.success).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
      expect(result.plan[0].source).toContain("req-000001.json");
      expect(result.plan[0].destination).toContain("req-000001.yaml");
    });

    it("JSON files still exist after dry run", async () => {
      const { reqDir } = await setupReqordDir();
      const reqFile = join(reqDir, "req-000001.json");
      await writeFile(reqFile, JSON.stringify(minReq, null, 2));

      await migrateToYaml(tmpDir, { dryRun: true });

      const content = await readFile(reqFile, "utf-8");
      expect(JSON.parse(content)).toEqual(minReq);

      const files = await readdir(reqDir);
      expect(files).toContain("req-000001.json");
      expect(files).not.toContain("req-000001.yaml");
    });
  });

  describe("migrateToYaml - actual migration", () => {
    it("converts JSON files to YAML files", async () => {
      const { reqDir } = await setupReqordDir();
      const reqFile = join(reqDir, "req-000001.json");
      await writeFile(reqFile, JSON.stringify(minReq, null, 2));

      const result = await migrateToYaml(tmpDir, { dryRun: false });

      expect(result.success).toHaveLength(1);
      expect(result.errors).toHaveLength(0);

      const yamlFile = join(reqDir, "req-000001.yaml");
      const yamlContent = await readFile(yamlFile, "utf-8");
      expect(yamlContent).toContain("id: req-000001");
      expect(yamlContent).toContain("title: Test Requirement");
    });

    it("creates backup with directory structure preserved", async () => {
      const { reqDir, contextDir, reqordDir } = await setupReqordDir();
      await writeFile(join(reqDir, "req-000001.json"), JSON.stringify(minReq, null, 2));
      await writeFile(join(contextDir, "context.json"), JSON.stringify(minContext, null, 2));

      await migrateToYaml(tmpDir, { dryRun: false });

      // Find the backup directory (includes timestamp)
      const backupRoot = join(reqordDir, ".backup");
      const backupDirs = await readdir(backupRoot);
      expect(backupDirs).toHaveLength(1);
      const backupDir = join(backupRoot, backupDirs[0]);

      // Directory structure is preserved
      const reqBackup = join(backupDir, "requirements", "req-000001.json");
      const ctxBackup = join(backupDir, "context", "context.json");
      expect(await fileExists(reqBackup)).toBe(true);
      expect(await fileExists(ctxBackup)).toBe(true);

      const backupContent = await readFile(reqBackup, "utf-8");
      expect(JSON.parse(backupContent)).toEqual(minReq);
    });

    it("original JSON files are moved to backup directory", async () => {
      const { reqDir, reqordDir } = await setupReqordDir();
      const reqFile = join(reqDir, "req-000001.json");
      await writeFile(reqFile, JSON.stringify(minReq, null, 2));

      await migrateToYaml(tmpDir, { dryRun: false });

      const files = await readdir(reqDir);
      expect(files).not.toContain("req-000001.json");
      expect(files).toContain("req-000001.yaml");

      const backupRoot = join(reqordDir, ".backup");
      const backupDirs = await readdir(backupRoot);
      const backupDir = join(backupRoot, backupDirs[0]);
      const backupFile = join(backupDir, "requirements", "req-000001.json");
      expect(await fileExists(backupFile)).toBe(true);
    });

    it("YAML files can be parsed back to the same data", async () => {
      const { reqDir } = await setupReqordDir();
      const reqFile = join(reqDir, "req-000001.json");
      await writeFile(reqFile, JSON.stringify(minReq, null, 2));

      await migrateToYaml(tmpDir, { dryRun: false });

      const yamlFile = join(reqDir, "req-000001.yaml");
      const yamlContent = await readFile(yamlFile, "utf-8");
      const parsedData = yamlLoad(yamlContent) as Record<string, unknown>;

      expect(parsedData.id).toBe(minReq.id);
      expect(parsedData.title).toBe(minReq.title);
      expect(parsedData.version).toBe(minReq.version);
      expect(parsedData.status).toBe(minReq.status);
      expect(parsedData.priority).toBe(minReq.priority);
      // Default schema converts dates to Date objects, but JSON_SCHEMA in production keeps them as strings
      expect(parsedData.files).toEqual(minReq.files);
      expect(parsedData.format).toEqual(minReq.format);
      expect(parsedData.dependencies).toEqual(minReq.dependencies);
      expect(parsedData.versionHistory).toEqual(minReq.versionHistory);
    });
  });

  describe("migrateToYaml - error handling", () => {
    it("throws AppError when .reqord/ does not exist", async () => {
      await expect(migrateToYaml(tmpDir, { dryRun: false })).rejects.toThrow(AppError);
      await expect(migrateToYaml(tmpDir, { dryRun: false })).rejects.toThrow(
        ".reqord/ directory not found",
      );
    });

    it("throws MIGRATION_FAILED when error rate exceeds 10%", async () => {
      const { reqDir } = await setupReqordDir();
      // Create 5 files: 4 invalid (80% error rate) + 1 valid
      await writeFile(join(reqDir, "req-000001.json"), "{ invalid json }");
      await writeFile(join(reqDir, "req-000002.json"), "{ invalid json }");
      await writeFile(join(reqDir, "req-000003.json"), "{ invalid json }");
      await writeFile(join(reqDir, "req-000004.json"), "{ invalid json }");
      await writeFile(join(reqDir, "req-000005.json"), JSON.stringify(minReq, null, 2));

      await expect(migrateToYaml(tmpDir, { dryRun: false })).rejects.toThrow(AppError);
      await expect(migrateToYaml(tmpDir, { dryRun: false })).rejects.toThrow(
        "error rate exceeded 10%",
      );
    });

    it("continues migration when error rate is at or below 10%", async () => {
      const { reqDir } = await setupReqordDir();
      // Create 10 files: 1 invalid (10% error rate) + 9 valid
      await writeFile(join(reqDir, "req-000001.json"), "{ invalid json }");
      for (let i = 2; i <= 10; i++) {
        const id = `req-${String(i).padStart(6, "0")}`;
        const data = { ...minReq, id };
        await writeFile(join(reqDir, `${id}.json`), JSON.stringify(data, null, 2));
      }

      const result = await migrateToYaml(tmpDir, { dryRun: false });

      expect(result.errors).toHaveLength(1);
      expect(result.success).toHaveLength(9);
      expect(result.errors[0].file).toContain("req-000001.json");
    });
  });
});
