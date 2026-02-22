import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TaskEntry, TasksIndex } from "@reqord/shared";

// Mock the file-system module
vi.mock("../../lib/file-system.js", () => ({
  joinPath: vi.fn((...args: string[]) => args.join("/")),
  readYAML: vi.fn(),
}));

// Mock reqord-root
vi.mock("../../lib/reqord-root.js", () => ({
  getReqordRoot: vi.fn(() => "/mock/root"),
}));

const mockTaskEntry: TaskEntry = {
  number: 1,
  title: "Test Task",
  url: "https://github.com/owner/repo/issues/1",
  status: "open",
  linkedTo: { specifications: ["spec-000001"] },
  syncedAt: "2026-02-22T00:00:00.000Z",
};

describe("tasks-data", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe("loadTasksYaml", () => {
    it("returns tasks index from loaded tasks.yaml", async () => {
      const { readYAML } = await import("../../lib/file-system.js");

      const mockIndex: TasksIndex = {
        title: "Tasks",
        tasks: [mockTaskEntry],
      };

      vi.mocked(readYAML).mockResolvedValue(mockIndex);

      const { loadTasksYaml } = await import("../../lib/tasks-data.js");
      const result = await loadTasksYaml();

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0]).toEqual(mockTaskEntry);
    });

    it("returns empty tasks index when tasks.yaml is missing or invalid", async () => {
      const { readYAML } = await import("../../lib/file-system.js");

      vi.mocked(readYAML).mockRejectedValue(new Error("File not found"));

      const { loadTasksYaml } = await import("../../lib/tasks-data.js");
      const result = await loadTasksYaml();

      expect(result.tasks).toEqual([]);
    });
  });

  describe("getAllTasks", () => {
    it("returns tasks array from loaded TasksIndex", async () => {
      const { readYAML } = await import("../../lib/file-system.js");

      const mockIndex: TasksIndex = {
        title: "Tasks",
        tasks: [mockTaskEntry],
      };

      vi.mocked(readYAML).mockResolvedValue(mockIndex);

      const { getAllTasks } = await import("../../lib/tasks-data.js");
      const result = await getAllTasks();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockTaskEntry);
    });

    it("returns empty array when tasks.yaml has no tasks", async () => {
      const { readYAML } = await import("../../lib/file-system.js");

      const mockIndex: TasksIndex = {
        title: "Tasks",
        tasks: [],
      };

      vi.mocked(readYAML).mockResolvedValue(mockIndex);

      const { getAllTasks } = await import("../../lib/tasks-data.js");
      const result = await getAllTasks();

      expect(result).toEqual([]);
    });

    it("returns empty array when tasks.yaml is missing or invalid", async () => {
      const { readYAML } = await import("../../lib/file-system.js");

      vi.mocked(readYAML).mockRejectedValue(new Error("File not found"));

      const { getAllTasks } = await import("../../lib/tasks-data.js");
      const result = await getAllTasks();

      expect(result).toEqual([]);
    });
  });
});
