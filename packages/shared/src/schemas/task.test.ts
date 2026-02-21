import { describe, it, expect } from "vitest";
import { TaskDefinitionSchema, TaskDefinitionFileSchema } from "./task.js";

describe("TaskDefinitionSchema", () => {
  describe("正常系", () => {
    it("全フィールド指定で受け入れる", () => {
      const task = {
        title: "Implement feature X",
        description: "Add new feature X with tests",
        priority: "P1" as const,
        estimatedHours: 5,
        dependencies: ["req-000001"],
      };

      const result = TaskDefinitionSchema.parse(task);
      expect(result).toEqual(task);
    });

    it("priority省略時にP2をデフォルト値として設定する", () => {
      const task = {
        title: "Implement feature Y",
        description: "Add new feature Y",
        estimatedHours: 3,
        dependencies: ["req-000002"],
      };

      const result = TaskDefinitionSchema.parse(task);
      expect(result.priority).toBe("P2");
      expect(result.title).toBe("Implement feature Y");
    });

    it("dependencies省略時に空配列をデフォルト値として設定する", () => {
      const task = {
        title: "Implement feature Z",
        description: "Add new feature Z",
        priority: "P0" as const,
        estimatedHours: 8,
      };

      const result = TaskDefinitionSchema.parse(task);
      expect(result.dependencies).toEqual([]);
    });
  });

  describe("異常系", () => {
    it("title空文字で拒否する", () => {
      const task = {
        title: "",
        description: "Some description",
        estimatedHours: 5,
      };

      expect(() => TaskDefinitionSchema.parse(task)).toThrow();
    });

    it("description空文字で拒否する", () => {
      const task = {
        title: "Valid title",
        description: "",
        estimatedHours: 5,
      };

      expect(() => TaskDefinitionSchema.parse(task)).toThrow();
    });

    it("estimatedHours 0で拒否する", () => {
      const task = {
        title: "Valid title",
        description: "Valid description",
        estimatedHours: 0,
      };

      expect(() => TaskDefinitionSchema.parse(task)).toThrow();
    });

    it("estimatedHours負数で拒否する", () => {
      const task = {
        title: "Valid title",
        description: "Valid description",
        estimatedHours: -5,
      };

      expect(() => TaskDefinitionSchema.parse(task)).toThrow();
    });

    it("無効なpriorityで拒否する", () => {
      const task = {
        title: "Valid title",
        description: "Valid description",
        priority: "P4",
        estimatedHours: 5,
      };

      expect(() => TaskDefinitionSchema.parse(task)).toThrow();
    });
  });
});

describe("TaskDefinitionFileSchema", () => {
  describe("正常系", () => {
    it("複数タスクを受け入れる", () => {
      const file = {
        tasks: [
          {
            title: "Task 1",
            description: "First task",
            priority: "P0" as const,
            estimatedHours: 3,
            dependencies: [],
          },
          {
            title: "Task 2",
            description: "Second task",
            priority: "P2" as const,
            estimatedHours: 5,
            dependencies: ["req-000001"],
          },
        ],
      };

      const result = TaskDefinitionFileSchema.parse(file);
      expect(result.tasks).toHaveLength(2);
      expect(result.tasks[0].title).toBe("Task 1");
      expect(result.tasks[1].title).toBe("Task 2");
    });
  });

  describe("異常系", () => {
    it("空配列で拒否する", () => {
      const file = {
        tasks: [],
      };

      expect(() => TaskDefinitionFileSchema.parse(file)).toThrow();
    });

    it("tasksフィールド欠落で拒否する", () => {
      const file = {};

      expect(() => TaskDefinitionFileSchema.parse(file)).toThrow();
    });
  });
});
