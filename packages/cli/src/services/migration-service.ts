import { readFile, readdir, rename, mkdir } from "node:fs/promises";
import { join, basename } from "node:path";
import { dump as yamlDump, JSON_SCHEMA } from "js-yaml";
import {
  REQORD_DIR,
  REQUIREMENTS_DIR,
  SPECIFICATIONS_DIR,
  CONTEXT_DIR,
  FEEDBACK_DIR,
} from "@reqord/shared";
import * as fs from "../repositories/file-system.js";
import { AppError, ErrorCode } from "../utils/errors.js";

export interface MigrationOptions {
  dryRun: boolean;
}

export interface MigrationPlanItem {
  source: string;
  destination: string;
  type: "requirement" | "specification" | "context" | "feedback";
}

export interface MigrationResult {
  plan: MigrationPlanItem[];
  success: string[];
  errors: Array<{ file: string; reason: string }>;
}

export async function createMigrationPlan(cwd: string): Promise<MigrationPlanItem[]> {
  const plan: MigrationPlanItem[] = [];
  const reqordPath = join(cwd, REQORD_DIR);

  // Requirements
  const requirementsPath = join(reqordPath, REQUIREMENTS_DIR);
  if (await fs.exists(requirementsPath)) {
    const entries = await readdir(requirementsPath);
    for (const file of entries.filter((f) => f.endsWith(".json") && f.startsWith("req-"))) {
      plan.push({
        source: join(requirementsPath, file),
        destination: join(requirementsPath, file.replace(".json", ".yaml")),
        type: "requirement",
      });
    }
  }

  // Specifications
  const specificationsPath = join(reqordPath, SPECIFICATIONS_DIR);
  if (await fs.exists(specificationsPath)) {
    const entries = await readdir(specificationsPath);
    for (const file of entries.filter((f) => f.endsWith(".json") && f.startsWith("spec-"))) {
      plan.push({
        source: join(specificationsPath, file),
        destination: join(specificationsPath, file.replace(".json", ".yaml")),
        type: "specification",
      });
    }
  }

  // Context files
  const contextPath = join(reqordPath, CONTEXT_DIR);
  const contextFiles = ["product.json", "technical.json", "structure.json", "context.json"];
  for (const file of contextFiles) {
    const filePath = join(contextPath, file);
    if (await fs.exists(filePath)) {
      plan.push({
        source: filePath,
        destination: filePath.replace(".json", ".yaml"),
        type: "context",
      });
    }
  }

  // Feedback
  const feedbackIndexPath = join(reqordPath, FEEDBACK_DIR, "index.json");
  if (await fs.exists(feedbackIndexPath)) {
    plan.push({
      source: feedbackIndexPath,
      destination: feedbackIndexPath.replace(".json", ".yaml"),
      type: "feedback",
    });
  }

  return plan;
}

function convertToYaml(data: unknown): string {
  return yamlDump(data, {
    indent: 2,
    lineWidth: 120,
    noRefs: true,
    sortKeys: false,
    schema: JSON_SCHEMA,
  });
}

export async function migrateToYaml(
  cwd: string,
  options: MigrationOptions,
): Promise<MigrationResult> {
  const reqordPath = join(cwd, REQORD_DIR);

  if (!(await fs.exists(reqordPath))) {
    throw new AppError(
      ".reqord/ ディレクトリが見つかりません。先に 'reqord init' を実行してください。",
      ErrorCode.NOT_FOUND,
    );
  }

  const plan = await createMigrationPlan(cwd);

  if (options.dryRun) {
    return { plan, success: [], errors: [] };
  }

  // Create backup directory
  const backupDir = join(reqordPath, ".backup", new Date().toISOString().split("T")[0]);
  await mkdir(backupDir, { recursive: true });

  const success: string[] = [];
  const errors: Array<{ file: string; reason: string }> = [];

  for (const item of plan) {
    try {
      const jsonContent = await readFile(item.source, "utf-8");
      const data = JSON.parse(jsonContent);
      const yamlContent = convertToYaml(data);

      await fs.writeText(item.destination, yamlContent);

      // Move original JSON to backup
      const backupPath = join(backupDir, basename(item.source));
      await rename(item.source, backupPath);

      success.push(item.destination);
    } catch (error) {
      errors.push({
        file: item.source,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Abort if too many errors
  if (plan.length > 0 && errors.length > 0 && errors.length / plan.length > 0.1) {
    throw new AppError(
      `移行がエラー率10%を超えたため中断しました (${errors.length}/${plan.length}件失敗)。--dry-run で確認してください。`,
      ErrorCode.MIGRATION_FAILED,
    );
  }

  return { plan, success, errors };
}
