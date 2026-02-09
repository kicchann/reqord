import { Command } from "commander";
import chalk from "chalk";
import { createRequirement } from "../../services/requirement-service.js";
import { handleError } from "../../utils/error-handler.js";

export const createCommand = new Command("create")
  .description("Create a new requirement")
  .argument("<title>", "Requirement title")
  .option("-p, --priority <priority>", "Priority (low, medium, high)", "medium")
  .option(
    "-f, --format <format>",
    "Format type (user-story, ears, free-form)",
    "user-story",
  )
  .action(async (title: string, options: { priority: string; format: string }) => {
    const cwd = process.cwd();

    try {
      const result = await createRequirement(cwd, {
        title,
        priority: options.priority as "low" | "medium" | "high",
        format: options.format as "user-story" | "ears" | "free-form",
      });

      const req = result.requirement;
      console.log(chalk.green(`Created requirement: ${req.id}`));
      console.log("");
      console.log(`  ID:       ${req.id}`);
      console.log(`  Title:    ${req.title}`);
      console.log(`  Status:   ${req.status}`);
      console.log(`  Priority: ${req.priority}`);
      console.log(`  Format:   ${req.format.type}`);
      console.log("");
      console.log(
        chalk.gray(`Description: .reqord/${result.descriptionPath}`),
      );
    } catch (error) {
      handleError(error);
    }
  });
