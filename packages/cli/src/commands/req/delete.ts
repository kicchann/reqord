import { Command } from "commander";
import chalk from "chalk";
import { createInterface } from "node:readline/promises";
import { deleteRequirement } from "../../services/requirement-service.js";
import { handleError } from "../../utils/error-handler.js";

async function confirm(message: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(`${message} (y/N) `);
    return answer.toLowerCase() === "y";
  } finally {
    rl.close();
  }
}

export const deleteCommand = new Command("delete")
  .description("Delete a requirement")
  .argument("<id>", "Requirement ID (e.g. req-000001)")
  .option("-f, --force", "Skip confirmation prompt")
  .action(async (id: string, options: { force?: boolean }) => {
    const cwd = process.cwd();

    try {
      if (!options.force) {
        const ok = await confirm(
          `Are you sure you want to delete ${id}?`,
        );
        if (!ok) {
          console.log(chalk.gray("Cancelled."));
          return;
        }
      }

      await deleteRequirement(cwd, id);
      console.log(chalk.green(`Deleted requirement: ${id}`));
    } catch (error) {
      handleError(error);
    }
  });
