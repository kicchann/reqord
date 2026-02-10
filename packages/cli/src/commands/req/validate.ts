import { Command } from "commander";
import chalk from "chalk";
import { validateRequirement } from "../../services/validation-service.js";
import { handleError } from "../../utils/error-handler.js";

const SEVERITY_LABELS: Record<string, string> = {
  error: chalk.red("ERROR"),
  warning: chalk.yellow("WARN"),
  info: chalk.blue("INFO"),
};

export const validateCommand = new Command("validate")
  .description("Validate a requirement against quality criteria")
  .argument("<id>", "Requirement ID (e.g. req-000001)")
  .option("--json", "Output as JSON")
  .action(async (id: string, options: { json?: boolean }) => {
    const cwd = process.cwd();

    try {
      const result = await validateRequirement(cwd, id);

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        if (!result.valid) {
          process.exitCode = 1;
        }
        return;
      }

      // Human-readable output
      console.log(
        chalk.cyan(`Validation: ${id}`) +
          (result.valid ? chalk.green(" ✓ VALID") : chalk.red(" ✗ INVALID")),
      );
      console.log("");

      // Issues
      if (result.issues.length > 0) {
        console.log(chalk.cyan("Issues:"));
        for (const issue of result.issues) {
          const icon = SEVERITY_LABELS[issue.severity] ?? chalk.blue("INFO");
          console.log(`  [${icon}] ${issue.field}: ${issue.message}`);
          if (issue.suggestion) {
            console.log(chalk.gray(`         → ${issue.suggestion}`));
          }
        }
        console.log("");
      } else {
        console.log(chalk.green("  No issues found."));
        console.log("");
      }

      // SMART Score
      const s = result.smartScore;
      console.log(chalk.cyan("SMART Score:"));
      console.log(`  Specific:   ${formatScore(s.specific)}`);
      console.log(`  Measurable: ${formatScore(s.measurable)}`);
      console.log(`  Achievable: ${formatScore(s.achievable)}`);
      console.log(`  Relevant:   ${formatScore(s.relevant)}`);
      console.log(`  TimeBound:  ${formatScore(s.timeBound)}`);
      console.log(`  ${chalk.bold(`Overall:    ${formatScore(s.overall)}`)}`);

      if (!result.valid) {
        process.exitCode = 1;
      }
    } catch (error) {
      handleError(error, { json: options.json });
    }
  });

function formatScore(score: number): string {
  const percent = Math.round(score * 100);
  const bar = "█".repeat(Math.round(score * 10)) + "░".repeat(10 - Math.round(score * 10));
  if (score >= 0.7) return chalk.green(`${bar} ${percent}%`);
  if (score >= 0.4) return chalk.yellow(`${bar} ${percent}%`);
  return chalk.red(`${bar} ${percent}%`);
}
