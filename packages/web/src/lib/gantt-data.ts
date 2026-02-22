import type { TaskEntry } from "@reqord/shared";

export const DEFAULT_HOURS = 4;

export type GanttTask = {
  id: string;
  title: string;
  issueNumber: number;
  issueUrl: string;
  priority: string;
  state: string;
  estimatedHours: number;
  startOffset: number;
  dependencies: number[];
  isCriticalPath: boolean;
};

export type GanttGroup = {
  priority: string;
  label: string;
  tasks: GanttTask[];
};

export type GanttData = {
  specId: string;
  groups: GanttGroup[];
  totalEstimatedHours: number;
  timelineStart: number;
  timelineEnd: number;
};

type PriorityConfig = {
  priority: string;
  label: string;
  isSerial: boolean;
};

const PRIORITY_CONFIGS: Record<string, PriorityConfig> = {
  P0: { priority: "P0", label: "P0: Sequential", isSerial: true },
  P1: { priority: "P1", label: "P1: Parallel", isSerial: false },
  P2: { priority: "P2", label: "P2: Parallel", isSerial: false },
  P3: { priority: "P3", label: "P3: Parallel", isSerial: false },
};

function getEstimatedHours(task: TaskEntry): number {
  return task.estimatedHours ?? DEFAULT_HOURS;
}

function createGanttTask(
  task: TaskEntry,
  startOffset: number,
  isCriticalPath: boolean,
): GanttTask {
  return {
    id: String(task.number),
    title: task.title,
    issueNumber: task.number,
    issueUrl: task.url,
    priority: task.priority ?? "",
    state: task.status,
    estimatedHours: getEstimatedHours(task),
    startOffset,
    dependencies: [],
    isCriticalPath,
  };
}

function groupTasksByPriority(
  tasks: TaskEntry[],
): Map<string, TaskEntry[]> {
  const groups = new Map<string, TaskEntry[]>();

  for (const task of tasks) {
    if (!task.priority) continue;
    const existing = groups.get(task.priority) || [];
    groups.set(task.priority, [...existing, task]);
  }

  return groups;
}

function calculateStartOffsets(taskGroups: Map<string, TaskEntry[]>): Map<string, number> {
  const startOffsets = new Map<string, number>();

  const p0Tasks = taskGroups.get("P0") || [];
  const p1Tasks = taskGroups.get("P1") || [];
  const p2Tasks = taskGroups.get("P2") || [];

  const p0TotalTime = p0Tasks.reduce((sum, t) => sum + getEstimatedHours(t), 0);
  const p1StartTime = p0TotalTime;
  const p1MaxHours = p1Tasks.length > 0
    ? Math.max(...p1Tasks.map(getEstimatedHours))
    : 0;
  const p2StartTime = p1Tasks.length > 0 ? p1StartTime + p1MaxHours : p1StartTime;
  const p2MaxHours = p2Tasks.length > 0
    ? Math.max(...p2Tasks.map(getEstimatedHours))
    : 0;
  const p3StartTime = p2Tasks.length > 0 ? p2StartTime + p2MaxHours : p2StartTime;

  startOffsets.set("P0", 0);
  startOffsets.set("P1", p1StartTime);
  startOffsets.set("P2", p2StartTime);
  startOffsets.set("P3", p3StartTime);

  return startOffsets;
}

function createPriorityGroup(
  priority: string,
  tasks: TaskEntry[],
  startOffset: number,
  config: PriorityConfig,
): GanttGroup {
  let currentOffset = startOffset;
  const ganttTasks = config.isSerial
    ? tasks.map((task) => {
        const ganttTask = createGanttTask(task, currentOffset, true);
        currentOffset += getEstimatedHours(task);
        return ganttTask;
      })
    : tasks.map((task) => createGanttTask(task, startOffset, false));

  return {
    priority,
    label: config.label,
    tasks: ganttTasks,
  };
}

function calculateTimelineEnd(groups: GanttGroup[]): number {
  const allTasks = groups.flatMap((g) => g.tasks);

  if (allTasks.length === 0) {
    return 0;
  }

  return Math.max(...allTasks.map((task) => task.startOffset + task.estimatedHours));
}

export function transformToGanttData(
  specId: string,
  tasks: TaskEntry[],
): GanttData {
  const taskGroups = groupTasksByPriority(tasks);
  const startOffsets = calculateStartOffsets(taskGroups);

  const groups: GanttGroup[] = [];

  for (const [priority, config] of Object.entries(PRIORITY_CONFIGS)) {
    const priorityTasks = taskGroups.get(priority);
    if (priorityTasks && priorityTasks.length > 0) {
      const startOffset = startOffsets.get(priority) || 0;
      groups.push(createPriorityGroup(priority, priorityTasks, startOffset, config));
    }
  }

  const totalEstimatedHours = groups
    .flatMap((g) => g.tasks)
    .reduce((sum, t) => sum + t.estimatedHours, 0);

  return {
    specId,
    groups,
    totalEstimatedHours,
    timelineStart: 0,
    timelineEnd: calculateTimelineEnd(groups),
  };
}
