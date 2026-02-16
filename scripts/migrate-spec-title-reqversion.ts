/**
 * Migration script: Add title and requirementVersion to existing Specification YAML files
 *
 * For each spec-NNNNNN.yaml:
 * - title: set from the linked Requirement's title
 * - requirementVersion: set from the linked Requirement's current version
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as yaml from "js-yaml";

const SPECS_DIR = ".reqord/specifications";
const REQS_DIR = ".reqord/requirements";

function loadYaml<T>(filePath: string): T {
  const content = fs.readFileSync(filePath, "utf-8");
  return yaml.load(content, { schema: yaml.JSON_SCHEMA }) as T;
}

function main(): void {
  const specFiles = fs.readdirSync(SPECS_DIR)
    .filter((f) => /^spec-\d{6}\.yaml$/.test(f))
    .sort();

  console.log(`Found ${specFiles.length} specification files to migrate.\n`);

  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (const specFile of specFiles) {
    const specPath = path.join(SPECS_DIR, specFile);
    const spec = loadYaml<Record<string, unknown>>(specPath);
    const specId = spec.id as string;
    const reqId = spec.requirementId as string;

    // Skip if already has both fields
    if (spec.title !== undefined && spec.requirementVersion !== undefined) {
      console.log(`  SKIP  ${specId} (already migrated)`);
      skipped++;
      continue;
    }

    // Load linked requirement
    const reqPath = path.join(REQS_DIR, `${reqId}.yaml`);
    if (!fs.existsSync(reqPath)) {
      console.error(`  ERROR ${specId}: requirement ${reqId} not found`);
      errors++;
      continue;
    }

    const req = loadYaml<Record<string, unknown>>(reqPath);
    const reqTitle = req.title as string;
    const reqVersion = req.version as string;

    // Insert fields using string manipulation to preserve YAML formatting
    let content = fs.readFileSync(specPath, "utf-8");

    if (spec.title === undefined) {
      // Insert title after requirementId line
      const escapedTitle = reqTitle.replace(/'/g, "''");
      content = content.replace(
        /^(requirementId: .+)$/m,
        `$1\ntitle: '${escapedTitle}'`
      );
    }

    if (spec.requirementVersion === undefined) {
      // Insert requirementVersion after title line
      content = content.replace(
        /^(title: .+)$/m,
        `$1\nrequirementVersion: '${reqVersion}'`
      );
    }

    fs.writeFileSync(specPath, content, "utf-8");
    console.log(`  OK    ${specId}: title="${reqTitle}", reqVersion="${reqVersion}"`);
    migrated++;
  }

  console.log(`\nMigration complete: ${migrated} migrated, ${skipped} skipped, ${errors} errors.`);
}

main();
