import { Command } from "commander";
import chalk from "chalk";
import { showSpecification } from "../../services/specification-service.js";
import { handleError } from "../../utils/error-handler.js";

export const specShowCommand = new Command("show")
  .description("Show specification details")
  .argument("<id>", "Specification ID (e.g. spec-000001)")
  .option("--json", "Output as JSON")
  .action(async (id: string, options: { json?: boolean }) => {
    const cwd = process.cwd();

    try {
      const result = await showSpecification(cwd, id);
      const spec = result.specification;

      if (options.json) {
        console.log(
          JSON.stringify(
            {
              ...spec,
              design: result.design,
            },
            null,
            2,
          ),
        );
        return;
      }

      console.log(chalk.cyan(`Specification: ${spec.id}`));
      console.log("");
      if (spec.title) {
        console.log(`  Title:         ${spec.title}`);
      }
      console.log(`  Requirement:   ${spec.requirementId}`);
      if (spec.requirementVersion) {
        console.log(`  Req Version:   ${spec.requirementVersion}`);
      }
      console.log(`  Status:        ${spec.status}`);
      console.log(`  Version:       ${spec.version}`);
      console.log(`  Created:       ${spec.createdAt}`);
      console.log(`  Updated:       ${spec.updatedAt}`);

      if (spec.files.supplementary.length > 0) {
        console.log("");
        console.log(chalk.cyan("Supplementary Files:"));
        for (const file of spec.files.supplementary) {
          console.log(`  - ${file}`);
        }
      }

      if (result.design) {
        console.log("");
        console.log(chalk.cyan("Design:"));
        console.log(result.design);
      }
    } catch (error) {
      handleError(error, { json: options.json });
    }
  });
