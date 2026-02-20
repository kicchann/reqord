import { Command } from "commander";
import chalk from "chalk";
import { validateSpecDesign } from "../../services/spec-validation-service.js";
import * as specRepo from "../../repositories/specification.js";
import { handleError } from "../../utils/error-handler.js";

export const specValidateCommand = new Command("validate")
  .description("Validate specification design against project rules")
  .argument("<id>", "Specification ID (e.g. spec-000001)")
  .option("--json", "Output as JSON")
  .action(async (id: string, options: { json?: boolean }) => {
    const cwd = process.cwd();

    try {
      const { validation: result, spec } = await validateSpecDesign(cwd, id);

      // Persist validation result to spec's designValidation field
      await specRepo.save(cwd, {
        ...spec,
        designValidation: {
          passed: result.passed,
          warnings: result.warnings,
          errors: result.errors,
          // location is excluded intentionally: DesignValidationRuleSchema (shared)
          // does not include it. Location info is display-only, not persisted.
          rules: result.rules.map((r) => ({
            ruleId: r.ruleId,
            status: r.status,
            severity: r.severity,
            message: r.message,
          })),
          validatedAt: result.validatedAt,
        },
      });

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      console.log(chalk.bold.cyan(`\nDesign validation: ${id}\n`));

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
        `\nValidation result: ${result.errors} error, ${result.warnings} warning, ${result.passed} passed\n`,
      );

      if (result.errors > 0) {
        process.exitCode = 1;
      }
    } catch (error) {
      handleError(error, { json: options.json });
    }
  });
