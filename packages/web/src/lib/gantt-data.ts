import type { Implementation, ImplementationIssue } from "@reqord/shared";

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

function createGanttTask(
  issue: ImplementationIssue,
  startOffset: number,
  isCriticalPath: boolean,
): GanttTask {
  return {
    id: String(issue.number),
    title: issue.title,
    issueNumber: issue.number,
    issueUrl: issue.url,
    priority: issue.priority,
    state: issue.status,
    estimatedHours: DEFAULT_HOURS,
    startOffset,
    dependencies: [],
    isCriticalPath,
  };
}

function groupIssuesByPriority(
  issues: ImplementationIssue[],
): Map<string, ImplementationIssue[]> {
  const groups = new Map<string, ImplementationIssue[]>();

  for (const issue of issues) {
    const existing = groups.get(issue.priority) || [];
    groups.set(issue.priority, [...existing, issue]);
  }

  return groups;
}

function calculateStartOffsets(issueGroups: Map<string, ImplementationIssue[]>): Map<string, number> {
  const startOffsets = new Map<string, number>();

  const p0Issues = issueGroups.get("P0") || [];
  const p1Issues = issueGroups.get("P1") || [];
  const p2Issues = issueGroups.get("P2") || [];

  const p0TotalTime = p0Issues.length * DEFAULT_HOURS;
  const p1StartTime = p0TotalTime;
  const p2StartTime = p1Issues.length > 0 ? p1StartTime + DEFAULT_HOURS : p1StartTime;
  const p3StartTime = p2Issues.length > 0 ? p2StartTime + DEFAULT_HOURS : p2StartTime;

  startOffsets.set("P0", 0);
  startOffsets.set("P1", p1StartTime);
  startOffsets.set("P2", p2StartTime);
  startOffsets.set("P3", p3StartTime);

  return startOffsets;
}

function createPriorityGroup(
  priority: string,
  issues: ImplementationIssue[],
  startOffset: number,
  config: PriorityConfig,
): GanttGroup {
  const tasks = config.isSerial
    ? issues.map((issue, index) =>
        createGanttTask(issue, startOffset + index * DEFAULT_HOURS, true),
      )
    : issues.map((issue) => createGanttTask(issue, startOffset, false));

  return {
    priority,
    label: config.label,
    tasks,
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
  implementation: Implementation,
): GanttData {
  const issueGroups = groupIssuesByPriority(implementation.issues);
  const startOffsets = calculateStartOffsets(issueGroups);

  const groups: GanttGroup[] = [];

  for (const [priority, config] of Object.entries(PRIORITY_CONFIGS)) {
    const issues = issueGroups.get(priority);
    if (issues && issues.length > 0) {
      const startOffset = startOffsets.get(priority) || 0;
      groups.push(createPriorityGroup(priority, issues, startOffset, config));
    }
  }

  return {
    specId,
    groups,
    totalEstimatedHours: implementation.totalEstimatedHours,
    timelineStart: 0,
    timelineEnd: calculateTimelineEnd(groups),
  };
}
