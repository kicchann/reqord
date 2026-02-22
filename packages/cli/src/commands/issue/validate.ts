import { Command } from "commander";
import chalk from "chalk";
import * as specRepo from "../../repositories/specification.js";
import { handleError } from "../../utils/error-handler.js";
import type { Specification } from "@reqord/shared";

export interface ValidationIssue {
  type: "error" | "warning" | "info";
  message: string;
}

export interface ValidateResult {
  specId: string;
  issues: ValidationIssue[];
  valid: boolean;
}

export function validateSpecification(spec: Specification): ValidateResult {
  const issues: ValidationIssue[] = [];

  // spec.implementation has been removed; use tasks.yaml-based workflow
  issues.push({ type: "info", message: "Issue tracking has moved to tasks.yaml. Use `reqord task` commands to manage tasks." });

  return { specId: spec.id, issues, valid: true };
}

export const issueValidateCommand = new Command("validate")
  .description("Validate specification-issue integrity")
  .argument("[spec-id]", "Specification ID")
  .option("--all", "Validate all specifications")
  .option("--json", "Output as JSON")
  .action(async (specId: string | undefined, options: { all?: boolean; json?: boolean }) => {
    try {
      const cwd = process.cwd();
      const results: ValidateResult[] = [];

      if (options.all) {
        const specs = await specRepo.findAll(cwd);
        for (const spec of specs) {
          results.push(validateSpecification(spec));
        }
      } else if (specId) {
        const spec = await specRepo.findById(cwd, specId);
        if (!spec) {
          throw new Error(`Specification not found: ${specId}`);
        }
        results.push(validateSpecification(spec));
      } else {
        throw new Error("Please specify a spec-id or use --all");
      }

      if (options.json) {
        console.log(JSON.stringify(results, null, 2));
      } else {
        for (const result of results) {
          displayValidateResult(result);
        }
      }

      if (results.some(r => !r.valid)) {
        process.exitCode = 1;
      }
    } catch (error) {
      handleError(error, { json: options.json });
    }
  });

const ISSUE_ICONS: Record<string, string> = {
  error: chalk.red("✗"),
  warning: chalk.yellow("⚠"),
  info: chalk.blue("ℹ"),
};

function displayValidateResult(result: ValidateResult): void {
  const status = result.valid ? chalk.green("VALID") : chalk.red("INVALID");
  console.log(`${result.specId}: ${status}`);

  for (const issue of result.issues) {
    const icon = ISSUE_ICONS[issue.type] ?? chalk.blue("ℹ");
    console.log(`  ${icon} ${issue.message}`);
  }
}
