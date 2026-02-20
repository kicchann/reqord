import { Command } from "commander";
import chalk from "chalk";
import Table from "cli-table3";
import { analyzeImpact } from "../../services/impact-service.js";
import type { ImpactAnalysis } from "../../services/impact-service.js";
import { handleError } from "../../utils/error-handler.js";

function parsePositiveInt(value: string): number {
  const n = Number.parseInt(value, 10);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error("Depth must be a positive integer");
  }
  return n;
}

export const analyzeCommand = new Command("analyze")
  .description("Analyze impact of requirement/specification changes")
  .argument("<id>", "Target ID (req-NNNNNN or spec-NNNNNN)")
  .option("--json", "Output as JSON")
  .option("--depth <n>", "Maximum traversal depth", parsePositiveInt)
  .action(async (id: string, options: { json?: boolean; depth?: number }) => {
    try {
      const result = await analyzeImpact(process.cwd(), id, {
        maxDepth: options.depth,
      });

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      displayResult(result);
    } catch (error) {
      handleError(error, { json: options.json });
    }
  });

function displayResult(result: ImpactAnalysis): void {
  console.log(chalk.bold(`\nImpact analysis: ${result.sourceId}\n`));

  if (result.sourceType === "requirement") {
    displayRequirementResult(result);
  } else {
    displaySpecificationResult(result);
  }
}

function displayRequirementResult(result: ImpactAnalysis): void {
  // Direct impacts
  console.log(chalk.bold("Direct impacts:"));
  if (result.directImpacts.length === 0) {
    console.log("  None\n");
  } else {
    const directTable = new Table({
      head: ["ID", "Relation", "Title"],
      style: { head: [], border: [] },
    });
    for (const impact of result.directImpacts) {
      directTable.push([impact.id, impact.relation, impact.title]);
    }
    console.log(directTable.toString());
    console.log("");
  }

  // Indirect impacts
  console.log(chalk.bold("Indirect impacts:"));
  if (result.indirectImpacts.length === 0) {
    console.log("  None\n");
  } else {
    const indirectTable = new Table({
      head: ["ID", "Via", "Title"],
      style: { head: [], border: [] },
    });
    for (const impact of result.indirectImpacts) {
      const via = impact.path.slice(1, -1).join(" → ");
      indirectTable.push([impact.id, via, impact.title]);
    }
    console.log(indirectTable.toString());
    console.log("");
  }

  displaySpecifications(result);
  displayIssues(result);
  displayCircularDependencies(result);
}

function displaySpecificationResult(result: ImpactAnalysis): void {
  if (result.parentRequirement) {
    console.log(chalk.bold("Parent Requirement:"));
    console.log(`  ${result.parentRequirement.id} (${result.parentRequirement.title})\n`);
  }
  displaySpecifications(result);
  displayIssues(result);
}

function displaySpecifications(result: ImpactAnalysis): void {
  console.log(chalk.bold("Related Specifications:"));
  if (result.relatedSpecifications.length === 0) {
    console.log("  None\n");
  } else {
    const specTable = new Table({
      head: ["ID", "Req ID", "Status"],
      style: { head: [], border: [] },
    });
    for (const spec of result.relatedSpecifications) {
      specTable.push([spec.id, spec.requirementId, spec.status]);
    }
    console.log(specTable.toString());
    console.log("");
  }
}

function displayIssues(result: ImpactAnalysis): void {
  console.log(chalk.bold("Related Issues:"));
  if (result.relatedIssues.length === 0) {
    console.log("  None\n");
  } else {
    const issueTable = new Table({
      head: ["#", "Status", "Title"],
      style: { head: [], border: [] },
    });
    for (const issue of result.relatedIssues) {
      issueTable.push([`#${issue.number}`, issue.status, issue.title]);
    }
    console.log(issueTable.toString());
    console.log("");
  }
}

function displayCircularDependencies(result: ImpactAnalysis): void {
  if (result.circularDependencies.length === 0) return;

  console.log(chalk.bold.yellow("Circular dependencies:"));
  for (const cycle of result.circularDependencies) {
    console.log(`  ⚠ ${cycle.join(" → ")}`);
  }
  console.log("");
}
