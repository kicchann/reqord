import { Command } from "commander";
import chalk from "chalk";
import Table from "cli-table3";
import {
  getProjectStatus,
  getRequirementStatus,
  getSpecificationStatus,
  renderProgressBar,
} from "../services/status-service.js";
import { handleError } from "../utils/error-handler.js";
import { STATUS_COLORS, PRIORITY_COLORS, identityColor } from "../utils/display.js";

export const statusCommand = new Command("status")
  .description("Show project status dashboard")
  .argument("[id]", "Requirement ID (req-NNNNNN) or Specification ID (spec-NNNNNN)")
  .option("--json", "Output as JSON")
  .option("--quiet", "Output only completion percentage (for CI)")
  .action(
    async (
      id: string | undefined,
      options: { json?: boolean; quiet?: boolean },
    ) => {
      const cwd = process.cwd();

      try {
        if (!id) {
          await showProjectStatus(cwd, options);
        } else if (/^req-\d{6}$/.test(id)) {
          await showRequirementStatus(cwd, id, options);
        } else if (/^spec-\d{6}$/.test(id)) {
          await showSpecificationStatus(cwd, id, options);
        } else {
          throw new Error(`不正なID形式: ${id} (req-NNNNNN or spec-NNNNNN)`);
        }
      } catch (error) {
        handleError(error, { json: options.json });
      }
    },
  );

async function showProjectStatus(
  cwd: string,
  options: { json?: boolean; quiet?: boolean },
): Promise<void> {
  const status = await getProjectStatus(cwd);

  if (options.json) {
    console.log(JSON.stringify(status, null, 2));
    return;
  }

  if (options.quiet) {
    console.log(String(status.requirements.implementedPercentage));
    return;
  }

  console.log(chalk.bold.cyan("\nreqord プロジェクトステータス\n"));

  // Requirements
  console.log(chalk.bold("Requirements:"));
  printStatusBars(status.requirements.byStatus, status.requirements.total);

  // Specifications
  console.log(chalk.bold("\nSpecifications:"));
  printStatusBars(status.specifications.byStatus, status.specifications.total);

  // Issues
  console.log(chalk.bold("\nIssues:"));
  if (status.issues.total > 0) {
    const closedPct = status.issues.closedPercentage;
    const openPct = 100 - closedPct;
    console.log(
      `  closed    ${renderProgressBar(closedPct)}  ${closedPct}% (${status.issues.closed}/${status.issues.total})`,
    );
    console.log(
      `  open      ${renderProgressBar(openPct)}  ${openPct}% (${status.issues.open}/${status.issues.total})`,
    );
  } else {
    console.log(chalk.gray("  No issues tracked."));
  }

  // Warnings
  if (status.warnings.length > 0) {
    console.log(chalk.bold.yellow("\n⚠ 警告:"));
    for (const w of status.warnings) {
      console.log(chalk.yellow(`  - ${w.id}: ${w.message}`));
    }
  }

  console.log();
}

function printStatusBars(
  byStatus: Record<string, number>,
  total: number,
): void {
  const statusOrder = ["implemented", "approved", "draft", "deprecated"];
  const entries = Object.entries(byStatus).sort((a, b) => {
    const ai = statusOrder.indexOf(a[0]);
    const bi = statusOrder.indexOf(b[0]);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  for (const [status, count] of entries) {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    const colorFn = STATUS_COLORS[status] ?? identityColor;
    const label = status.padEnd(12);
    console.log(
      `  ${colorFn(label)} ${renderProgressBar(pct)}  ${pct}% (${count}/${total})`,
    );
  }
}

async function showRequirementStatus(
  cwd: string,
  reqId: string,
  options: { json?: boolean; quiet?: boolean },
): Promise<void> {
  const status = await getRequirementStatus(cwd, reqId);

  if (options.json) {
    console.log(JSON.stringify(status, null, 2));
    return;
  }

  if (options.quiet) {
    const pct =
      status.issueProgress.total > 0
        ? Math.round(
            (status.issueProgress.completed / status.issueProgress.total) *
              100,
          )
        : 0;
    console.log(String(pct));
    return;
  }

  const req = status.requirement;
  const statusColor = STATUS_COLORS[req.status] ?? identityColor;
  const priorityColor = PRIORITY_COLORS[req.priority] ?? identityColor;

  console.log(
    chalk.bold.cyan(`\n要件ステータス: ${req.id} (${req.title})\n`),
  );

  console.log(`  ステータス:   ${statusColor(req.status)}`);
  console.log(`  優先度:       ${priorityColor(req.priority)}`);
  if (req.estimatedComplexity) {
    console.log(`  複雑度:       ${req.estimatedComplexity}`);
  }

  // Related Specifications
  if (status.specifications.length > 0) {
    console.log(chalk.bold("\n関連Specification:"));
    const table = new Table({
      head: ["ID", "Title", "Status"],
      style: { head: ["cyan"] },
    });
    for (const spec of status.specifications) {
      const sColor = STATUS_COLORS[spec.status] ?? identityColor;
      table.push([
        spec.id,
        (spec.title ?? "").length > 40
          ? (spec.title ?? "").slice(0, 37) + "..."
          : spec.title ?? "",
        sColor(spec.status),
      ]);
    }
    console.log(table.toString());
  }

  // Dependencies
  if (status.dependencyStatus.length > 0) {
    console.log(chalk.bold("\n依存関係:"));
    for (const dep of status.dependencyStatus) {
      const depColor = STATUS_COLORS[dep.status] ?? identityColor;
      const check =
        dep.status === "approved" || dep.status === "implemented"
          ? chalk.green(" ✓")
          : chalk.red(" ✗");
      console.log(
        `  ${dep.relation.padEnd(10)}  ${dep.id} (${depColor(dep.status)})${check}  ${dep.title}`,
      );
    }
  }

  // Issue Progress
  if (status.issueProgress.total > 0) {
    const pct = Math.round(
      (status.issueProgress.completed / status.issueProgress.total) * 100,
    );
    console.log(
      chalk.bold("\nIssue進捗:  ") +
        `${renderProgressBar(pct)}  ${pct}% (${status.issueProgress.completed}/${status.issueProgress.total})`,
    );
  }

  console.log();
}

async function showSpecificationStatus(
  cwd: string,
  specId: string,
  options: { json?: boolean; quiet?: boolean },
): Promise<void> {
  const status = await getSpecificationStatus(cwd, specId);

  if (options.json) {
    console.log(JSON.stringify(status, null, 2));
    return;
  }

  if (options.quiet) {
    const pct =
      status.issueProgress.total > 0
        ? Math.round(
            (status.issueProgress.completed / status.issueProgress.total) *
              100,
          )
        : 0;
    console.log(String(pct));
    return;
  }

  const spec = status.specification;
  const statusColor = STATUS_COLORS[spec.status] ?? identityColor;

  console.log(
    chalk.bold.cyan(
      `\n仕様ステータス: ${spec.id} (${spec.title ?? spec.id})\n`,
    ),
  );

  console.log(`  ステータス:   ${statusColor(spec.status)}`);

  if (status.requirement) {
    const reqColor = STATUS_COLORS[status.requirement.status] ?? identityColor;
    console.log(
      `  要件:         ${status.requirement.id} (${reqColor(status.requirement.status)}) ${status.requirement.title}`,
    );
  }

  // Issue Progress
  if (status.issueProgress.total > 0) {
    const pct = Math.round(
      (status.issueProgress.completed / status.issueProgress.total) * 100,
    );
    console.log(
      chalk.bold("\nIssue進捗:  ") +
        `${renderProgressBar(pct)}  ${pct}% (${status.issueProgress.completed}/${status.issueProgress.total})`,
    );
  }

  console.log();
}
