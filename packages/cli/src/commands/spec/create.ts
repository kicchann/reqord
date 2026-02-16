import { Command } from "commander";
import chalk from "chalk";
import { createSpecification } from "../../services/specification-service.js";
import { handleError } from "../../utils/error-handler.js";

export const specCreateCommand = new Command("create")
  .description("Create a new specification for a requirement")
  .argument("<req-id>", "Requirement ID (e.g. req-000001)")
  .option("-t, --title <title>", "Specification title (defaults to requirement title)")
  .action(async (reqId: string, options: { title?: string }) => {
    const cwd = process.cwd();

    try {
      const result = await createSpecification(cwd, {
        requirementId: reqId,
        title: options.title,
      });

      const spec = result.specification;
      console.log(chalk.green(`Created specification: ${spec.id}`));
      console.log("");
      console.log(`  ID:            ${spec.id}`);
      console.log(`  Title:         ${spec.title ?? ""}`);
      console.log(`  Requirement:   ${spec.requirementId}`);
      console.log(`  Status:        ${spec.status}`);
      console.log("");
      console.log(chalk.gray(`Design: .reqord/${spec.files.design}`));
    } catch (error) {
      handleError(error);
    }
  });
