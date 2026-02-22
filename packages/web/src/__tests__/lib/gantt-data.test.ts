import { describe, it, expect } from "vitest";
import type { IssueItem, ImplementationData } from "../../lib/gantt-data.js";
import {
  transformToGanttData,
  DEFAULT_HOURS,
} from "../../lib/gantt-data.js";

function makeIssue(
  overrides: Partial<IssueItem> = {},
): IssueItem {
  return {
    number: 1,
    title: "Test task",
    url: "https://github.com/test/1",
    priority: "P0",
    status: "open",
    ...overrides,
  };
}

function makeImplementation(issues: IssueItem[]): ImplementationData {
  return {
    issues,
    totalEstimatedHours: issues.length * DEFAULT_HOURS,
    createdAt: "2026-01-01T00:00:00Z",
  };
}

describe("transformToGanttData", () => {
  describe("P0 tasks: serial placement", () => {
    it("places P0 tasks sequentially with cumulative startOffset", () => {
      const issues = [
        makeIssue({ number: 1, title: "P0 Task 1", priority: "P0" }),
        makeIssue({ number: 2, title: "P0 Task 2", priority: "P0" }),
        makeIssue({ number: 3, title: "P0 Task 3", priority: "P0" }),
      ];
      const impl = makeImplementation(issues);

      const result = transformToGanttData("spec-000001", impl);

      const p0Group = result.groups.find((g) => g.priority === "P0");
      expect(p0Group).toBeDefined();
      expect(p0Group!.tasks).toHaveLength(3);
      expect(p0Group!.tasks[0].startOffset).toBe(0);
      expect(p0Group!.tasks[1].startOffset).toBe(4);
      expect(p0Group!.tasks[2].startOffset).toBe(8);
    });

    it("marks all P0 tasks as critical path", () => {
      const issues = [
        makeIssue({ number: 1, priority: "P0" }),
        makeIssue({ number: 2, priority: "P0" }),
      ];
      const impl = makeImplementation(issues);

      const result = transformToGanttData("spec-000001", impl);

      const p0Group = result.groups.find((g) => g.priority === "P0");
      expect(p0Group!.tasks.every((task) => task.isCriticalPath)).toBe(true);
    });
  });

  describe("P1 tasks: parallel placement after P0", () => {
    it("places all P1 tasks at P0 total time", () => {
      const issues = [
        makeIssue({ number: 1, priority: "P0" }),
        makeIssue({ number: 2, priority: "P0" }),
        makeIssue({ number: 3, title: "P1 Task 1", priority: "P1" }),
        makeIssue({ number: 4, title: "P1 Task 2", priority: "P1" }),
      ];
      const impl = makeImplementation(issues);

      const result = transformToGanttData("spec-000001", impl);

      const p1Group = result.groups.find((g) => g.priority === "P1");
      expect(p1Group).toBeDefined();
      expect(p1Group!.tasks).toHaveLength(2);
      // P0 total: 2 * 4 = 8 hours
      expect(p1Group!.tasks[0].startOffset).toBe(8);
      expect(p1Group!.tasks[1].startOffset).toBe(8);
    });

    it("marks P1 tasks as not on critical path", () => {
      const issues = [
        makeIssue({ number: 1, priority: "P0" }),
        makeIssue({ number: 2, priority: "P1" }),
      ];
      const impl = makeImplementation(issues);

      const result = transformToGanttData("spec-000001", impl);

      const p1Group = result.groups.find((g) => g.priority === "P1");
      expect(p1Group!.tasks.every((task) => !task.isCriticalPath)).toBe(true);
    });
  });

  describe("P2 tasks: parallel placement after P1", () => {
    it("places all P2 tasks at P1 start + max P1 hours", () => {
      const issues = [
        makeIssue({ number: 1, priority: "P0" }),
        makeIssue({ number: 2, priority: "P0" }),
        makeIssue({ number: 3, priority: "P1" }),
        makeIssue({ number: 4, priority: "P1" }),
        makeIssue({ number: 5, title: "P2 Task 1", priority: "P2" }),
        makeIssue({ number: 6, title: "P2 Task 2", priority: "P2" }),
      ];
      const impl = makeImplementation(issues);

      const result = transformToGanttData("spec-000001", impl);

      const p2Group = result.groups.find((g) => g.priority === "P2");
      expect(p2Group).toBeDefined();
      expect(p2Group!.tasks).toHaveLength(2);
      // P0 total: 2 * 4 = 8, P1 start: 8, P1 max hours: 4
      // P2 start: 8 + 4 = 12
      expect(p2Group!.tasks[0].startOffset).toBe(12);
      expect(p2Group!.tasks[1].startOffset).toBe(12);
    });

    it("marks P2 tasks as not on critical path", () => {
      const issues = [
        makeIssue({ number: 1, priority: "P0" }),
        makeIssue({ number: 2, priority: "P2" }),
      ];
      const impl = makeImplementation(issues);

      const result = transformToGanttData("spec-000001", impl);

      const p2Group = result.groups.find((g) => g.priority === "P2");
      expect(p2Group!.tasks.every((task) => !task.isCriticalPath)).toBe(true);
    });
  });

  describe("P1 only (no P0): parallel placement at zero", () => {
    it("places P1 tasks at startOffset 0 when no P0 tasks exist", () => {
      const issues = [
        makeIssue({ number: 1, priority: "P1" }),
        makeIssue({ number: 2, priority: "P1" }),
      ];
      const impl = makeImplementation(issues);

      const result = transformToGanttData("spec-000001", impl);

      const p1Group = result.groups.find((g) => g.priority === "P1");
      expect(p1Group).toBeDefined();
      expect(p1Group!.tasks).toHaveLength(2);
      expect(p1Group!.tasks[0].startOffset).toBe(0);
      expect(p1Group!.tasks[1].startOffset).toBe(0);
    });
  });

  describe("timelineEnd calculation", () => {
    it("calculates timelineEnd as max(startOffset + estimatedHours)", () => {
      const issues = [
        makeIssue({ number: 1, priority: "P0" }),
        makeIssue({ number: 2, priority: "P0" }),
        makeIssue({ number: 3, priority: "P1" }),
      ];
      const impl = makeImplementation(issues);

      const result = transformToGanttData("spec-000001", impl);

      // P0: [0-4], [4-8]
      // P1: [8-12]
      // timelineEnd should be 12
      expect(result.timelineEnd).toBe(12);
    });

    it("handles P2 tasks in timelineEnd calculation", () => {
      const issues = [
        makeIssue({ number: 1, priority: "P0" }),
        makeIssue({ number: 2, priority: "P1" }),
        makeIssue({ number: 3, priority: "P2" }),
      ];
      const impl = makeImplementation(issues);

      const result = transformToGanttData("spec-000001", impl);

      // P0: [0-4]
      // P1: [4-8]
      // P2: [8-12]
      // timelineEnd should be 12
      expect(result.timelineEnd).toBe(12);
    });
  });

  describe("empty cases", () => {
    it("returns empty groups and timelineEnd=0 for zero tasks", () => {
      const impl = makeImplementation([]);

      const result = transformToGanttData("spec-000001", impl);

      expect(result.groups).toEqual([]);
      expect(result.timelineEnd).toBe(0);
      expect(result.timelineStart).toBe(0);
    });
  });

  describe("estimatedHours", () => {
    it("uses DEFAULT_HOURS for all tasks", () => {
      const issues = [
        makeIssue({ number: 1, priority: "P0" }),
        makeIssue({ number: 2, priority: "P1" }),
      ];
      const impl = makeImplementation(issues);

      const result = transformToGanttData("spec-000001", impl);

      const allTasks = result.groups.flatMap((g) => g.tasks);
      expect(allTasks.every((task) => task.estimatedHours === DEFAULT_HOURS)).toBe(
        true,
      );
    });
  });

  describe("group labels", () => {
    it("assigns correct labels to priority groups", () => {
      const issues = [
        makeIssue({ number: 1, priority: "P0" }),
        makeIssue({ number: 2, priority: "P1" }),
        makeIssue({ number: 3, priority: "P2" }),
      ];
      const impl = makeImplementation(issues);

      const result = transformToGanttData("spec-000001", impl);

      expect(result.groups.find((g) => g.priority === "P0")?.label).toBe(
        "P0: Sequential",
      );
      expect(result.groups.find((g) => g.priority === "P1")?.label).toBe(
        "P1: Parallel",
      );
      expect(result.groups.find((g) => g.priority === "P2")?.label).toBe(
        "P2: Parallel",
      );
    });
  });

  describe("specId preservation", () => {
    it("preserves specId in output", () => {
      const issues = [makeIssue({ number: 1, priority: "P0" })];
      const impl = makeImplementation(issues);

      const result = transformToGanttData("spec-000042", impl);

      expect(result.specId).toBe("spec-000042");
    });
  });

  describe("task properties", () => {
    it("maps all issue properties to GanttTask", () => {
      const issues = [
        makeIssue({
          number: 123,
          title: "Test Feature",
          url: "https://github.com/test/123",
          priority: "P0",
          status: "in_progress",
        }),
      ];
      const impl = makeImplementation(issues);

      const result = transformToGanttData("spec-000001", impl);

      const task = result.groups[0].tasks[0];
      expect(task.id).toBe("123");
      expect(task.title).toBe("Test Feature");
      expect(task.issueNumber).toBe(123);
      expect(task.issueUrl).toBe("https://github.com/test/123");
      expect(task.priority).toBe("P0");
      expect(task.state).toBe("in_progress");
      expect(task.dependencies).toEqual([]);
    });
  });
});
