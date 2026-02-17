import { Command } from "commander";
import chalk from "chalk";
import { validateImplementation } from "../../services/impl-validation-service.js";
import { handleError } from "../../utils/error-handler.js";

export const implValidateCommand = new Command("impl")
  .description("Validate implementation completeness for a specification")
  .argument("<spec-id>", "Specification ID (e.g. spec-000001)")
  .option("--json", "Output as JSON")
  .option("--strict", "Exit with code 1 if implementation is incomplete")
  .action(
    async (
      specId: string,
      options: { json?: boolean; strict?: boolean },
    ) => {
      const cwd = process.cwd();

      try {
        const result = await validateImplementation(cwd, specId);

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
          if (options.strict && result.overallStatus !== "complete") {
            process.exitCode = 1;
          }
          return;
        }

        console.log(
          chalk.bold.cyan(`\n実装検証: ${specId}\n`),
        );

        // Issues
        if (result.issueCheck.total > 0) {
          console.log(chalk.bold("GitHub Issues:"));
          for (const issue of result.issueCheck.issues) {
            const icon =
              issue.state === "closed"
                ? chalk.green("[DONE]   ")
                : chalk.yellow("[OPEN]   ");
            const priorityStr = issue.priority
              ? chalk.gray(` (${issue.priority})`)
              : "";
            console.log(`  ${icon} #${issue.number} ${issue.title}${priorityStr}`);
          }
          console.log();
        }

        // Components
        if (result.componentCheck.total > 0) {
          console.log(chalk.bold("コンポーネント:"));
          for (const comp of result.componentCheck.components) {
            const icon = comp.exists
              ? chalk.green("[EXISTS] ")
              : chalk.red("[MISSING]");
            console.log(`  ${icon} ${comp.path}`);
          }
          console.log();
        }

        // Tests
        if (result.testCheck.total > 0) {
          console.log(chalk.bold("テストファイル:"));
          for (const test of result.testCheck.tests) {
            const icon = test.exists
              ? chalk.green("[EXISTS] ")
              : chalk.red("[MISSING]");
            console.log(`  ${icon} ${test.path}`);
          }
          console.log();
        }

        // Summary
        const { issueCheck, componentCheck, testCheck } = result;
        console.log(
          `サマリー: Issues ${issueCheck.completed}/${issueCheck.total}, Components ${componentCheck.exists}/${componentCheck.total}, Tests ${testCheck.exists}/${testCheck.total}`,
        );
        console.log(
          `ステータス: ${result.overallStatus === "complete" ? chalk.green("complete") : result.overallStatus === "partial" ? chalk.yellow("partial") : chalk.red("not-started")}\n`,
        );

        if (options.strict && result.overallStatus !== "complete") {
          console.error(
            chalk.red("実装検証失敗: 未完了項目があります"),
          );
          process.exitCode = 1;
        }
      } catch (error) {
        handleError(error, { json: options.json });
      }
    },
  );
