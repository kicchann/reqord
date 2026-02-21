import type {
  TaskDefinitionFile,
  TaskDefinition,
  TaskEntry,
  TasksIndex,
} from "@reqord/shared";
import { TaskDefinitionFileSchema, TasksIndexSchema, ISSUES_DIR } from "@reqord/shared";
import * as specRepo from "../repositories/specification.js";
import * as githubClient from "./github-client.js";
import * as fs from "../repositories/file-system.js";

const TASKS_FILENAME = "tasks.yaml";

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

  const raw = await fs.readYAML<unknown>(fullPath);
  return TaskDefinitionFileSchema.parse(raw);
}

export function buildLabels(task: TaskDefinition): string[] {
  return ["reqord-generated", task.priority];
}

export function buildIssueBody(specId: string, task: TaskDefinition): string {
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

function getTasksYamlPath(cwd: string): string {
  return fs.getReqordDir(cwd, ISSUES_DIR, TASKS_FILENAME);
}

async function loadTasksIndex(tasksYamlPath: string): Promise<TasksIndex> {
  if (!(await fs.exists(tasksYamlPath))) {
    return { title: "Tasks", tasks: [] };
  }
  const raw = await fs.readYAML<unknown>(tasksYamlPath);
  const result = TasksIndexSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Invalid tasks.yaml: ${result.error.message}`);
  }
  return result.data;
}

async function appendToTasksFile(
  cwd: string,
  specId: string,
  issues: CreatedIssueInfo[]
): Promise<void> {
  const tasksYamlPath = getTasksYamlPath(cwd);
  const issuesDir = fs.getReqordDir(cwd, ISSUES_DIR);
  await fs.mkdirp(issuesDir);

  const index = await loadTasksIndex(tasksYamlPath);
  const syncedAt = new Date().toISOString();

  const newEntries: TaskEntry[] = issues.map((issue) => ({
    number: issue.number!,
    title: issue.title,
    url: issue.url!,
    linkedTo: { specifications: [specId] },
    priority: issue.priority,
    status: "open" as const,
    estimatedHours: issue.estimatedHours,
    syncedAt,
  }));

  index.tasks.push(...newEntries);
  await fs.writeYAML(tasksYamlPath, index);
}

export async function createIssuesFromSpec(
  cwd: string,
  options: CreateIssuesOptions
): Promise<CreateIssuesResult> {
  const spec = await specRepo.findByIdOrThrow(cwd, options.specId);
  if (spec.status !== "approved") {
    throw new Error(
      `Specification ${options.specId} must be approved before creating issues`
    );
  }

  const tasksData = await loadTasksFile(cwd, options.tasksFile);
  const maxIssues = options.maxIssues ?? 20;

  if (!Number.isFinite(maxIssues) || maxIssues <= 0) {
    throw new Error(
      `Invalid maxIssues value: ${maxIssues}. Must be a positive integer.`
    );
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

  if (!options.dryRun) {
    await appendToTasksFile(cwd, options.specId, issues);
  }

  return {
    specId: options.specId,
    issues,
    totalEstimatedHours,
  };
}
