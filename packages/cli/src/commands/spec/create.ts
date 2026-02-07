import { Command } from "commander";
import chalk from "chalk";
import { createSpecification } from "../../services/specification-service.js";
import type { SpecComplexity } from "@reqord/shared";

export const specCreateCommand = new Command("create")
  .description("Create a new specification for a requirement")
  .argument("<req-id>", "Requirement ID (e.g. req-000001)")
  .option("--complexity <complexity>", "Complexity (S, M, L, XL)")
  .option("--estimated-hours <hours>", "Estimated hours", parseFloat)
  .action(
    async (
      reqId: string,
      options: { complexity?: string; estimatedHours?: number },
    ) => {
      const cwd = process.cwd();

      try {
        const result = await createSpecification(cwd, {
          requirementId: reqId,
          complexity: options.complexity as SpecComplexity | undefined,
          estimatedHours: options.estimatedHours,
        });

        const spec = result.specification;
        console.log(chalk.green(`Created specification: ${spec.id}`));
        console.log("");
        console.log(`  ID:            ${spec.id}`);
        console.log(`  Requirement:   ${spec.requirementId}`);
        console.log(`  Status:        ${spec.status}`);
        if (spec.complexity) {
          console.log(`  Complexity:    ${spec.complexity}`);
        }
        if (spec.estimatedHours) {
          console.log(`  Est. Hours:    ${spec.estimatedHours}`);
        }
        console.log("");
        console.log(chalk.gray(`Research:     .reqord/${spec.files.research}`));
        console.log(chalk.gray(`Design:       .reqord/${spec.files.design}`));
        console.log(
          chalk.gray(`Architecture: .reqord/${spec.files.architecture}`),
        );
      } catch (error) {
        console.error(
          chalk.red(
            `Failed to create specification: ${(error as Error).message}`,
          ),
        );
        process.exitCode = 1;
      }
    },
  );
