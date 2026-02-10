import type { TaskDefinitionFile, TaskDefinition, Implementation } from "@reqord/shared";
import { TaskDefinitionFileSchema } from "@reqord/shared";
import * as specRepo from "../repositories/specification.js";
import * as githubClient from "./github-client.js";
import * as fs from "../repositories/file-system.js";

export interface CreateIssuesOptions {
  specId: string;
  tasksFile: string;
  dryRun?: boolean;
  maxIssues?: number;
}

export interface CreateIssuesResult {
  specId: string;
  issues: CreatedIssueInfo[];
  totalEstimatedHours: number;
}

export interface CreatedIssueInfo {
  title: string;
  number?: number;
  url?: string;
  priority: string;
  estimatedHours: number;
  labels: string[];
}

export async function loadTasksFile(
  cwd: string,
  filePath: string
): Promise<TaskDefinitionFile> {
  const fullPath = fs.joinPath(cwd, filePath);

  if (!(await fs.exists(fullPath))) {
    throw new Error(`Tasks file not found: ${filePath}`);
  }

  const content = await fs.readText(fullPath);
  const json = JSON.parse(content);
  return TaskDefinitionFileSchema.parse(json);
}

export async function loadIssueTemplate(cwd: string): Promise<string | null> {
  const templatePath = fs.joinPath(cwd, ".github/ISSUE_TEMPLATE/06-reqord-implementation.yml");

  if (!(await fs.exists(templatePath))) {
    return null;
  }

  return fs.readText(templatePath);
}

export function buildLabels(task: TaskDefinition): string[] {
  return ["reqord-generated", task.priority];
}

export function buildIssueBody(
  specId: string,
  task: TaskDefinition
): string {
  const metadataTag = `<!-- reqord:specification {"specificationId":"${specId}"} -->`;

  let body = metadataTag + "\n\n";
  body += `## ${task.title}\n\n`;
  body += `${task.description}\n\n`;
  body += `**Estimated Hours:** ${task.estimatedHours}\n\n`;

  if (task.dependencies && task.dependencies.length > 0) {
    body += `**Dependencies:** ${task.dependencies.join(", ")}\n\n`;
  }

  return body;
}

export async function updateSpecificationImplementation(
  cwd: string,
  specId: string,
  implementation: Implementation
): Promise<void> {
  const spec = await specRepo.findById(cwd, specId);
  if (!spec) {
    throw new Error(`Specification ${specId} not found`);
  }

  spec.implementation = implementation;
  spec.updatedAt = new Date().toISOString();
  await specRepo.save(cwd, spec);
}

export async function createIssuesFromSpec(
  cwd: string,
  options: CreateIssuesOptions
): Promise<CreateIssuesResult> {
  const spec = await specRepo.findById(cwd, options.specId);
  if (!spec) {
    throw new Error(`Specification ${options.specId} not found`);
  }

  if (spec.status !== "approved") {
    throw new Error(`Specification ${options.specId} must be approved before creating issues`);
  }

  const tasksData = await loadTasksFile(cwd, options.tasksFile);
  const maxIssues = options.maxIssues ?? 20;

  if (tasksData.tasks.length > maxIssues) {
    throw new Error(
      `Task count (${tasksData.tasks.length}) exceeds maximum allowed (${maxIssues})`
    );
  }

  const issues: CreatedIssueInfo[] = [];
  let totalEstimatedHours = 0;

  for (const task of tasksData.tasks) {
    const labels = buildLabels(task);
    const body = buildIssueBody(options.specId, task);

    if (!options.dryRun) {
      const created = await githubClient.createIssue({
        title: task.title,
        body,
        labels,
      });

      issues.push({
        title: task.title,
        number: created.number,
        url: created.url,
        priority: task.priority,
        estimatedHours: task.estimatedHours,
        labels,
      });
    } else {
      issues.push({
        title: task.title,
        priority: task.priority,
        estimatedHours: task.estimatedHours,
        labels,
      });
    }

    totalEstimatedHours += task.estimatedHours;
  }

  // Update specification with implementation data (skip in dry-run)
  if (!options.dryRun) {
    const implementation: Implementation = {
      issues: issues.map((issue) => ({
        number: issue.number!,
        title: issue.title,
        url: issue.url!,
        priority: issue.priority,
        status: "open" as const,
      })),
      totalEstimatedHours,
      createdAt: new Date().toISOString(),
    };

    await updateSpecificationImplementation(cwd, options.specId, implementation);
  }

  return {
    specId: options.specId,
    issues,
    totalEstimatedHours,
  };
}
