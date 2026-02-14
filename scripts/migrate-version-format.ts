#!/usr/bin/env tsx
/**
 * Migrate version format from x.y.z to X.Y across all YAML files in .reqord/
 *
 * Usage:
 *   pnpm exec tsx scripts/migrate-version-format.ts [--dry-run]
 */

import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Convert semantic version (x.y.z) to X.Y format using string replacement
 * This approach preserves all YAML formatting and avoids data loss
 * - x.y.z → X.0 (discard minor/patch components)
 */
function processYamlFileWithRegex(filePath: string, dryRun: boolean): boolean {
  try {
    let content = fs.readFileSync(filePath, "utf-8");
    const originalContent = content;
    let changeCount = 0;

    // Pattern 1: version: X.Y.Z at start of line (main version field)
    // Matches: version: 1.2.3 or version: '1.2.3' or version: "1.2.3"
    content = content.replace(
      /^version:\s+(['"]?)(\d+)\.(\d+)\.(\d+)(['"]?)$/gm,
      (match, startQuote, major, minor, patch, endQuote) => {
        changeCount++;
        const oldVersion = `${major}.${minor}.${patch}`;
        const newVersion = `${major}.0`;
        if (!dryRun) {
          console.log(`  ${filePath}: version ${oldVersion} → ${newVersion}`);
        } else {
          console.log(`  [DRY-RUN] ${filePath}: version ${oldVersion} → ${newVersion}`);
        }
        // Preserve quotes if present
        return `version: ${startQuote}${newVersion}${endQuote}`;
      }
    );

    // Pattern 2: - version: X.Y.Z (versionHistory list entries)
    // Matches: - version: 1.2.3 or - version: '1.2.3'
    content = content.replace(
      /^(\s+)-(\s+)version:\s+(['"]?)(\d+)\.(\d+)\.(\d+)(['"]?)$/gm,
      (match, indent, dashSpace, startQuote, major, minor, patch, endQuote) => {
        changeCount++;
        const oldVersion = `${major}.${minor}.${patch}`;
        const newVersion = `${major}.0`;
        if (!dryRun) {
          console.log(`  ${filePath}: versionHistory ${oldVersion} → ${newVersion}`);
        } else {
          console.log(`  [DRY-RUN] ${filePath}: versionHistory ${oldVersion} → ${newVersion}`);
        }
        // Preserve indentation, dash, and quotes
        return `${indent}-${dashSpace}version: ${startQuote}${newVersion}${endQuote}`;
      }
    );

    const modified = content !== originalContent;

    if (modified && !dryRun) {
      fs.writeFileSync(filePath, content, "utf-8");
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
    const wasModified = processYamlFileWithRegex(filePath, dryRun);
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
