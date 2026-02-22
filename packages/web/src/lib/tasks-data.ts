import {
  TasksIndexSchema,
  type TasksIndex,
  type TaskEntry,
  REQORD_DIR,
  ISSUES_DIR,
} from "@reqord/shared";
import * as fs from "./file-system.js";
import { getReqordRoot } from "./reqord-root.js";

export function getTasksFilePath(): string {
  return fs.joinPath(getReqordRoot(), REQORD_DIR, ISSUES_DIR, "tasks.yaml");
}

export async function loadTasksYaml(): Promise<TasksIndex> {
  const filePath = getTasksFilePath();
  try {
    const raw = await fs.readYAML<unknown>(filePath);
    const parsed = TasksIndexSchema.safeParse(raw);
    if (!parsed.success) {
      return { title: "", tasks: [] };
    }
    return parsed.data;
  } catch {
    return { title: "", tasks: [] };
  }
}

export async function getAllTasks(): Promise<TaskEntry[]> {
  const index = await loadTasksYaml();
  return index.tasks;
}
