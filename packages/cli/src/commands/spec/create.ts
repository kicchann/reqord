import { Command } from "commander";
import chalk from "chalk";
import { createSpecification } from "../../services/specification-service.js";

export const specCreateCommand = new Command("create")
  .description("Create a new specification for a requirement")
  .argument("<req-id>", "Requirement ID (e.g. req-000001)")
  .action(async (reqId: string) => {
    const cwd = process.cwd();

    try {
      const result = await createSpecification(cwd, {
        requirementId: reqId,
      });

      const spec = result.specification;
      console.log(chalk.green(`Created specification: ${spec.id}`));
      console.log("");
      console.log(`  ID:            ${spec.id}`);
      console.log(`  Requirement:   ${spec.requirementId}`);
      console.log(`  Status:        ${spec.status}`);
      console.log("");
      console.log(chalk.gray(`Design: .reqord/${spec.files.design}`));
    } catch (error) {
      console.error(
        chalk.red(
          `Failed to create specification: ${(error as Error).message}`,
        ),
      );
      process.exitCode = 1;
    }
  });
