import { Command } from "commander";
import chalk from "chalk";
import * as specRepo from "../../repositories/specification.js";
import * as fs from "../../repositories/file-system.js";
import { TasksIndexSchema, REQORD_DIR, ISSUES_DIR } from "@reqord/shared";
import type { TaskEntry } from "@reqord/shared";
import { handleError } from "../../utils/error-handler.js";

export interface ValidationIssue {
  type: "error" | "warning" | "info";
  message: string;
}

export interface ValidateResult {
  specId: string;
  issues: ValidationIssue[];
  valid: boolean;
}

export function validateSpecTasks(
  specId: string,
  tasks: TaskEntry[],
): ValidateResult {
  const issues: ValidationIssue[] = [];

  if (tasks.length === 0) {
    issues.push({
      type: "warning",
      message: "No tasks found in tasks.yaml for this specification",
    });
    return { specId, issues, valid: true };
  }

  const hasSyncedAt = tasks.some((t) => t.syncedAt);
  if (!hasSyncedAt) {
    issues.push({
      type: "info",
      message: "No progress data. Run `reqord task sync` to calculate progress",
    });
    return { specId, issues, valid: true };
  }

  return { specId, issues, valid: true };
}

async function loadTasksForSpec(
  cwd: string,
  specId: string,
): Promise<TaskEntry[]> {
  const tasksPath = fs.joinPath(cwd, REQORD_DIR, ISSUES_DIR, "tasks.yaml");
  const raw = await fs.readYAML(tasksPath).catch(() => null);
  if (!raw) return [];
  const parsed = TasksIndexSchema.safeParse(raw);
  if (!parsed.success) return [];
  return parsed.data.tasks.filter((t) =>
    t.linkedTo.specifications.includes(specId),
  );
}

export const taskValidateCommand = new Command("validate")
  .description("Validate specification-issue integrity")
  .argument("[spec-id]", "Specification ID")
  .option("--all", "Validate all specifications")
  .option("--json", "Output as JSON")
  .action(
    async (
      specId: string | undefined,
      options: { all?: boolean; json?: boolean },
    ) => {
      try {
        const cwd = process.cwd();
        const results: ValidateResult[] = [];

        if (options.all) {
          const specs = await specRepo.findAll(cwd);
          for (const spec of specs) {
            const tasks = await loadTasksForSpec(cwd, spec.id);
            results.push(validateSpecTasks(spec.id, tasks));
          }
        } else if (specId) {
          const tasks = await loadTasksForSpec(cwd, specId);
          results.push(validateSpecTasks(specId, tasks));
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

        if (results.some((r) => !r.valid)) {
          process.exitCode = 1;
        }
      } catch (error) {
        handleError(error, { json: options.json });
      }
    },
  );

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
