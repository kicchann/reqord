import { Command } from "commander";
import chalk from "chalk";
import { showRequirement } from "../../services/requirement-service.js";
import { handleError } from "../../utils/error-handler.js";

export const showCommand = new Command("show")
  .description("Show requirement details")
  .argument("<id>", "Requirement ID (e.g. req-000001)")
  .option("--json", "Output as JSON")
  .action(async (id: string, options: { json?: boolean }) => {
    const cwd = process.cwd();

    try {
      const result = await showRequirement(cwd, id);
      const req = result.requirement;

      if (options.json) {
        console.log(
          JSON.stringify(
            { ...req, description: result.description },
            null,
            2,
          ),
        );
        return;
      }

      console.log(chalk.cyan(`Requirement: ${req.id}`));
      console.log("");
      console.log(`  Title:      ${req.title}`);
      console.log(`  Status:     ${req.status}`);
      console.log(`  Priority:   ${req.priority}`);
      console.log(`  Format:     ${req.format.type}`);
      console.log(`  Version:    ${req.version}`);
      console.log(`  Created:    ${req.createdAt}`);
      console.log(`  Updated:    ${req.updatedAt}`);

      if (req.successCriteria.length > 0) {
        console.log(`  Criteria:   ${req.successCriteria.join(", ")}`);
      }

      if (result.description) {
        console.log("");
        console.log(chalk.cyan("Description:"));
        console.log(result.description);
      }
    } catch (error) {
      handleError(error, { json: options.json });
    }
  });
