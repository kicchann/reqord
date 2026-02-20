import { Command } from "commander";
import chalk from "chalk";
import Table from "cli-table3";
import { analyzeRequirementCoverage } from "../../services/coverage-service.js";
import { handleError } from "../../utils/error-handler.js";

const COVERAGE_COLORS: Record<string, (s: string) => string> = {
  covered: chalk.green,
  partial: chalk.yellow,
  "not-covered": chalk.red,
};

export const coverageCommand = new Command("coverage")
  .description("Analyze requirement coverage by specifications")
  .argument("[req-id]", "Requirement ID (optional, analyzes all if omitted)")
  .option("--json", "Output as JSON")
  .action(async (reqId: string | undefined, options: { json?: boolean }) => {
    const cwd = process.cwd();

    try {
      const report = await analyzeRequirementCoverage(cwd, reqId);

      if (options.json) {
        console.log(JSON.stringify(report, null, 2));
        return;
      }

      console.log(chalk.bold.cyan("\nRequirement Coverage:\n"));

      const table = new Table({
        head: ["ID", "Title", "Coverage", "Specs"],
        style: { head: ["cyan"] },
      });

      for (const cov of report.requirements) {
        const colorFn = COVERAGE_COLORS[cov.status] ?? ((s: string) => s);
        const specInfo =
          cov.specifications.length > 0
            ? `${cov.specifications.length}`
            : "0";

        table.push([
          cov.requirementId,
          cov.title.length > 30
            ? cov.title.slice(0, 27) + "..."
            : cov.title,
          colorFn(cov.status),
          specInfo,
        ]);
      }

      console.log(table.toString());

      const { summary } = report;
      console.log(
        chalk.gray(
          `\nSummary: ${summary.covered} covered, ${summary.partial} partial, ${summary.notCovered} not-covered (total: ${summary.total})\n`,
        ),
      );

      // Exit code 1 if coverage is below 50%
      const coveredPercentage =
        summary.total > 0
          ? ((summary.covered + summary.partial) / summary.total) * 100
          : 0;
      if (coveredPercentage < 50) {
        process.exitCode = 1;
      }
    } catch (error) {
      handleError(error, { json: options.json });
    }
  });
