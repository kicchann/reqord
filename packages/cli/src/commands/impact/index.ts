import { Command } from "commander";
import { analyzeCommand } from "./analyze.js";

export const impactCommand = new Command("impact")
  .description("Analyze impact of requirement/specification changes");

impactCommand.addCommand(analyzeCommand);
