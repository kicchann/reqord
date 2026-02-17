import { Command } from "commander";
import chalk from "chalk";
import { validateSpecDesign } from "../../services/spec-validation-service.js";
import { handleError } from "../../utils/error-handler.js";

export const specValidateCommand = new Command("validate")
  .description("Validate specification design against project rules")
  .argument("<id>", "Specification ID (e.g. spec-000001)")
  .option("--json", "Output as JSON")
  .action(async (id: string, options: { json?: boolean }) => {
    const cwd = process.cwd();

    try {
      const result = await validateSpecDesign(cwd, id);

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      console.log(chalk.bold.cyan(`\n設計検証: ${id}\n`));

      for (const rule of result.rules) {
        const icon =
          rule.status === "pass"
            ? chalk.green("[PASS]")
            : rule.severity === "error"
              ? chalk.red("[FAIL]")
              : rule.severity === "warning"
                ? chalk.yellow("[WARN]")
                : chalk.blue("[INFO]");

        console.log(`  ${icon} ${rule.ruleName}`);
        if (rule.message) {
          console.log(chalk.gray(`         ${rule.message}`));
        }
        if (rule.location) {
          console.log(
            chalk.gray(
              `         → design.md L${rule.location.line}: "${rule.location.content}"`,
            ),
          );
        }
      }

      console.log(
        `\n検証結果: ${result.errors} error, ${result.warnings} warning, ${result.passed} passed\n`,
      );

      if (result.errors > 0) {
        process.exitCode = 1;
      }
    } catch (error) {
      handleError(error, { json: options.json });
    }
  });
