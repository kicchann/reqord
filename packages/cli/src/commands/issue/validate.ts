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

  if (!spec.implementation) {
    issues.push({ type: "error", message: "No implementation field found" });
    return { specId: spec.id, issues, valid: false };
  }

  if (spec.implementation.issues.length === 0) {
    issues.push({ type: "warning", message: "No issues found in implementation" });
  } else {
    // Only check progress if there are issues
    if (!spec.implementation.progress) {
      issues.push({ type: "info", message: "No progress data. Run `reqord issue sync` to calculate progress" });
    } else {
      const allClosed = spec.implementation.issues.every(i => i.status === "closed");
      if (allClosed && spec.implementation.progress.percentage !== 100) {
        issues.push({ type: "warning", message: "All issues are closed but progress is not 100%" });
      }
    }
  }

  const hasErrors = issues.some(i => i.type === "error");
  return { specId: spec.id, issues, valid: !hasErrors };
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
    } catch (error) {
      handleError(error, { json: options.json });
    }
  });

function displayValidateResult(result: ValidateResult): void {
  const status = result.valid ? chalk.green("VALID") : chalk.red("INVALID");
  console.log(`${result.specId}: ${status}`);

  for (const issue of result.issues) {
    const icon = issue.type === "error" ? chalk.red("✗") : issue.type === "warning" ? chalk.yellow("⚠") : chalk.blue("ℹ");
    console.log(`  ${icon} ${issue.message}`);
  }
}
