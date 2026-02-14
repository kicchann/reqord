#!/usr/bin/env tsx
/**
 * Migrate version format from x.y.z to X.Y across all YAML files in .reqord/
 *
 * Usage:
 *   pnpm exec tsx scripts/migrate-version-format.ts [--dry-run]
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as yaml from "js-yaml";

interface VersionHistoryEntry {
  version: string;
  status: string;
  changedAt: string;
  gitCommit?: string;
  summary?: string;
}

interface YamlData {
  version: string;
  versionHistory?: VersionHistoryEntry[];
  [key: string]: unknown;
}

/**
 * Convert semantic version (x.y.z) to X.Y format
 * - x.0.0 → X.0
 * - x.y.z → X.0 (discard minor/patch)
 */
function convertVersion(oldVersion: string): string {
  // Check if already X.Y format
  if (/^\d+\.\d+$/.test(oldVersion)) {
    return oldVersion;
  }

  // Try x.y.z format
  const match = oldVersion.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    console.warn(`  WARNING: Unrecognized version format: ${oldVersion}`);
    return oldVersion;
  }

  const major = match[1];
  const minor = match[2];
  const patch = match[3];

  // x.0.0 → X.0
  if (minor === "0" && patch === "0") {
    return `${major}.0`;
  }

  // x.y.z → X.0 (discard minor/patch)
  return `${major}.0`;
}

/**
 * Process a single YAML file
 */
function processYamlFile(filePath: string, dryRun: boolean): boolean {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const data = yaml.load(content, { schema: yaml.JSON_SCHEMA }) as YamlData;

    let modified = false;

    // Convert main version field
    if (data.version && typeof data.version === "string") {
      const newVersion = convertVersion(data.version);
      if (newVersion !== data.version) {
        if (dryRun) {
          console.log(
            `  [DRY-RUN] ${filePath}: version ${data.version} → ${newVersion}`
          );
        } else {
          console.log(`  ${filePath}: version ${data.version} → ${newVersion}`);
        }
        data.version = newVersion;
        modified = true;
      }
    }

    // Convert versionHistory entries
    if (Array.isArray(data.versionHistory)) {
      for (const entry of data.versionHistory) {
        if (entry.version && typeof entry.version === "string") {
          const newVersion = convertVersion(entry.version);
          if (newVersion !== entry.version) {
            if (dryRun) {
              console.log(
                `  [DRY-RUN] ${filePath}: versionHistory ${entry.version} → ${newVersion}`
              );
            } else {
              console.log(
                `  ${filePath}: versionHistory ${entry.version} → ${newVersion}`
              );
            }
            entry.version = newVersion;
            modified = true;
          }
        }
      }
    }

    // Write back if modified
    if (modified && !dryRun) {
      const newContent = yaml.dump(data, {
        schema: yaml.JSON_SCHEMA,
        lineWidth: -1,
        noRefs: true,
      });
      fs.writeFileSync(filePath, newContent, "utf-8");
    }

    return modified;
  } catch (error) {
    console.error(`  ERROR processing ${filePath}:`, error);
    return false;
  }
}

/**
 * Find all YAML files in .reqord/ directory
 */
function findYamlFiles(reqordDir: string): string[] {
  const yamlFiles: string[] = [];

  const requirementsDir = path.join(reqordDir, "requirements");
  const specificationsDir = path.join(reqordDir, "specifications");

  // Scan requirements/*.yaml
  if (fs.existsSync(requirementsDir)) {
    const files = fs.readdirSync(requirementsDir);
    for (const file of files) {
      if (file.endsWith(".yaml")) {
        yamlFiles.push(path.join(requirementsDir, file));
      }
    }
  }

  // Scan specifications/*.yaml
  if (fs.existsSync(specificationsDir)) {
    const files = fs.readdirSync(specificationsDir);
    for (const file of files) {
      if (file.endsWith(".yaml")) {
        yamlFiles.push(path.join(specificationsDir, file));
      }
    }
  }

  return yamlFiles.sort();
}

/**
 * Main migration function
 */
function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");

  const reqordDir = path.join(process.cwd(), ".reqord");

  if (!fs.existsSync(reqordDir)) {
    console.error(`Error: .reqord/ directory not found at ${reqordDir}`);
    process.exit(1);
  }

  console.log("=".repeat(60));
  console.log(
    `Migration: Semantic Versioning (x.y.z) → X.Y Format ${dryRun ? "[DRY-RUN]" : ""}`
  );
  console.log("=".repeat(60));
  console.log();

  const yamlFiles = findYamlFiles(reqordDir);

  if (yamlFiles.length === 0) {
    console.log("No YAML files found in .reqord/");
    return;
  }

  console.log(`Found ${yamlFiles.length} YAML file(s):`);
  console.log();

  let modifiedCount = 0;

  for (const filePath of yamlFiles) {
    const wasModified = processYamlFile(filePath, dryRun);
    if (wasModified) {
      modifiedCount++;
    }
  }

  console.log();
  console.log("=".repeat(60));
  console.log(
    `Summary: ${modifiedCount} file(s) modified ${dryRun ? "(dry-run, not saved)" : ""}`
  );
  console.log("=".repeat(60));

  if (dryRun) {
    console.log();
    console.log("Run without --dry-run to apply changes:");
    console.log("  pnpm exec tsx scripts/migrate-version-format.ts");
  } else if (modifiedCount > 0) {
    console.log();
    console.log("Next steps:");
    console.log("  1. Review changes: git diff .reqord/");
    console.log("  2. Validate: pnpm exec reqord validate");
    console.log("  3. Commit changes if correct");
  }
}

main();
