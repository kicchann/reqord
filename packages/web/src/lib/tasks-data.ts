import {
  TasksIndexSchema,
  type TasksIndex,
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
      return { title: "Tasks", tasks: [] };
    }
    return parsed.data;
  } catch {
    return { title: "Tasks", tasks: [] };
  }
}
