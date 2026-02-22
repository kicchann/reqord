import type { TaskDefinitionFile, TaskDefinition } from "@reqord/shared";
import { TaskDefinitionFileSchema } from "@reqord/shared";
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
  priority: "P0" | "P1" | "P2" | "P3";
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

export function buildLabels(task: TaskDefinition): string[] {
  return ["reqord-generated", task.priority];
}

export function buildIssueBody(
  specId: string,
  task: TaskDefinition
): string {
  const metadataTag = `<!-- reqord:specification {"specificationId":"${specId}","priority":"${task.priority}","estimatedHours":${task.estimatedHours}} -->`;

  let body = metadataTag + "\n\n";
  body += `## ${task.title}\n\n`;
  body += `${task.description}\n\n`;
  body += `**Estimated Hours:** ${task.estimatedHours}\n\n`;

  if (task.dependencies && task.dependencies.length > 0) {
    body += `**Dependencies:** ${task.dependencies.join(", ")}\n\n`;
  }

  return body;
}

export async function createIssuesFromSpec(
  cwd: string,
  options: CreateIssuesOptions
): Promise<CreateIssuesResult> {
  const specRepo = await import("../repositories/specification.js");
  const spec = await specRepo.findByIdOrThrow(cwd, options.specId);
  if (spec.status !== "approved") {
    throw new Error(`Specification ${options.specId} must be approved before creating issues`);
  }

  const tasksData = await loadTasksFile(cwd, options.tasksFile);
  const maxIssues = options.maxIssues ?? 20;

  if (!Number.isFinite(maxIssues) || maxIssues <= 0) {
    throw new Error(`Invalid maxIssues value: ${maxIssues}. Must be a positive integer.`);
  }

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

  return {
    specId: options.specId,
    issues,
    totalEstimatedHours,
  };
}
