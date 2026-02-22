import * as githubClient from "./github-client.js";
import * as fs from "../repositories/file-system.js";
import { TasksIndexSchema, REQORD_DIR, ISSUES_DIR } from "@reqord/shared";
import type { TaskEntry } from "@reqord/shared";

export interface SyncResult {
  specId: string;
  synced: SyncedIssue[];
  progress: ProgressInfo;
  errors: SyncError[];
}

export interface SyncedIssue {
  number: number;
  title: string;
  previousStatus: string;
  currentStatus: string;
  changed: boolean;
}

export interface ProgressInfo {
  total: number;
  completed: number;
  percentage: number;
}

export interface SyncError {
  issueNumber: number;
  message: string;
}

async function loadTasksYaml(
  cwd: string,
): Promise<{ title: string; tasks: TaskEntry[] } | null> {
  const tasksPath = fs.joinPath(cwd, REQORD_DIR, ISSUES_DIR, "tasks.yaml");
  const raw = await fs.readYAML(tasksPath).catch(() => null);
  if (!raw) return null;
  const parsed = TasksIndexSchema.safeParse(raw);
  if (!parsed.success) return null;
  return parsed.data;
}

async function saveTasksYaml(
  cwd: string,
  data: { title: string; tasks: TaskEntry[] },
): Promise<void> {
  const tasksPath = fs.joinPath(cwd, REQORD_DIR, ISSUES_DIR, "tasks.yaml");
  await fs.writeYAML(tasksPath, data);
}

function calculateProgress(tasks: TaskEntry[]): ProgressInfo {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "closed").length;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { total, completed, percentage };
}

export async function syncSpecification(
  cwd: string,
  specId: string,
): Promise<SyncResult> {
  const tasksIndex = await loadTasksYaml(cwd);

  if (!tasksIndex) {
    throw new Error(`No tasks found for ${specId}`);
  }

  const specTasks = tasksIndex.tasks.filter((t) =>
    t.linkedTo.specifications.includes(specId),
  );

  if (specTasks.length === 0) {
    throw new Error(`No tasks found for ${specId}`);
  }

  const synced: SyncedIssue[] = [];
  const errors: SyncError[] = [];

  for (const task of specTasks) {
    try {
      const ghIssue = await githubClient.getIssueDetail(task.number);
      const currentStatus = ghIssue.state as "open" | "closed";
      const previousStatus = task.status;

      synced.push({
        number: task.number,
        title: task.title,
        previousStatus,
        currentStatus,
        changed: previousStatus !== currentStatus,
      });

      task.status = currentStatus;
      task.syncedAt = new Date().toISOString();
    } catch (error) {
      errors.push({
        issueNumber: task.number,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  await saveTasksYaml(cwd, tasksIndex);

  const progress = calculateProgress(specTasks);

  return {
    specId,
    synced,
    progress,
    errors,
  };
}

export async function syncAll(cwd: string): Promise<SyncResult[]> {
  const tasksIndex = await loadTasksYaml(cwd);
  if (!tasksIndex || tasksIndex.tasks.length === 0) {
    return [];
  }

  const specIds = new Set<string>();
  for (const task of tasksIndex.tasks) {
    for (const specId of task.linkedTo.specifications) {
      specIds.add(specId);
    }
  }

  const results: SyncResult[] = [];
  for (const specId of specIds) {
    const result = await syncSpecification(cwd, specId);
    results.push(result);
  }

  return results;
}
