import { describe, it, expect } from "vitest";
import { TaskDefinitionSchema, TaskDefinitionFileSchema, TaskEntrySchema, TasksIndexSchema } from "./task.js";

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
describe("TaskEntrySchema", () => {
  const validTask = {
    number: 42,
    title: "Implement feature",
    url: "https://github.com/org/repo/issues/42",
    linkedTo: { specifications: ["spec-000001"] },
    status: "open" as const,
    syncedAt: "2026-01-01T00:00:00Z",
  };

  describe("正常系", () => {
    it("全必須フィールドで受け入れる", () => {
      const result = TaskEntrySchema.parse(validTask);
      expect(result.number).toBe(42);
      expect(result.title).toBe("Implement feature");
      expect(result.status).toBe("open");
    });

    it("statusがclosedでも受け入れる", () => {
      const task = { ...validTask, status: "closed" as const };
      const result = TaskEntrySchema.parse(task);
      expect(result.status).toBe("closed");
    });

    it("linkedTo.specificationsが空配列でも受け入れる", () => {
      const task = { ...validTask, linkedTo: { specifications: [] } };
      const result = TaskEntrySchema.parse(task);
      expect(result.linkedTo.specifications).toEqual([]);
    });

    it("optionalフィールド(priority, estimatedHours)省略時に受け入れる", () => {
      const result = TaskEntrySchema.parse(validTask);
      expect(result.priority).toBeUndefined();
      expect(result.estimatedHours).toBeUndefined();
    });
  });

  describe("異常系", () => {
    it("number が非整数で拒否する", () => {
      const task = { ...validTask, number: 1.5 };
      expect(() => TaskEntrySchema.parse(task)).toThrow();
    });

    it("number が0で拒否する", () => {
      const task = { ...validTask, number: 0 };
      expect(() => TaskEntrySchema.parse(task)).toThrow();
    });

    it("title空文字で拒否する", () => {
      const task = { ...validTask, title: "" };
      expect(() => TaskEntrySchema.parse(task)).toThrow();
    });

    it("無効なURLで拒否する", () => {
      const task = { ...validTask, url: "not-a-url" };
      expect(() => TaskEntrySchema.parse(task)).toThrow();
    });

    it("無効なstatusで拒否する", () => {
      const task = { ...validTask, status: "in_progress" };
      expect(() => TaskEntrySchema.parse(task)).toThrow();
    });
  });
});

describe("TasksIndexSchema", () => {
  describe("正常系", () => {
    it("title と tasks 配列で受け入れる", () => {
      const index = {
        title: "Sprint 1",
        tasks: [
          {
            number: 1,
            title: "Task 1",
            url: "https://github.com/org/repo/issues/1",
            linkedTo: { specifications: ["spec-000001"] },
            status: "open" as const,
            syncedAt: "2026-01-01T00:00:00Z",
          },
        ],
      };

      const result = TasksIndexSchema.parse(index);
      expect(result.title).toBe("Sprint 1");
      expect(result.tasks).toHaveLength(1);
    });

    it("tasks が空配列でも受け入れる", () => {
      const index = { title: "Empty Sprint", tasks: [] };
      const result = TasksIndexSchema.parse(index);
      expect(result.tasks).toEqual([]);
    });
  });

  describe("異常系", () => {
    it("title欠落で拒否する", () => {
      const index = { tasks: [] };
      expect(() => TasksIndexSchema.parse(index)).toThrow();
    });
  });
});
