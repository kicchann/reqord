import { describe, it, expect } from "vitest";
import {
  TaskDefinitionSchema,
  TaskDefinitionFileSchema,
  TaskLinkedToSchema,
  TaskEntrySchema,
  TasksIndexSchema,
} from "./task.js";

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
      expect(() =>
        TaskDefinitionSchema.parse({ title: "", description: "desc", estimatedHours: 5 })
      ).toThrow();
    });

    it("description空文字で拒否する", () => {
      expect(() =>
        TaskDefinitionSchema.parse({ title: "title", description: "", estimatedHours: 5 })
      ).toThrow();
    });

    it("estimatedHours 0で拒否する", () => {
      expect(() =>
        TaskDefinitionSchema.parse({ title: "t", description: "d", estimatedHours: 0 })
      ).toThrow();
    });

    it("estimatedHours負数で拒否する", () => {
      expect(() =>
        TaskDefinitionSchema.parse({ title: "t", description: "d", estimatedHours: -5 })
      ).toThrow();
    });

    it("無効なpriorityで拒否する", () => {
      expect(() =>
        TaskDefinitionSchema.parse({ title: "t", description: "d", priority: "P4", estimatedHours: 5 })
      ).toThrow();
    });
  });
});

describe("TaskDefinitionFileSchema", () => {
  describe("正常系", () => {
    it("複数タスクを受け入れる", () => {
      const file = {
        tasks: [
          { title: "Task 1", description: "First task", priority: "P0" as const, estimatedHours: 3, dependencies: [] },
          { title: "Task 2", description: "Second task", priority: "P2" as const, estimatedHours: 5, dependencies: ["req-000001"] },
        ],
      };

      const result = TaskDefinitionFileSchema.parse(file);
      expect(result.tasks).toHaveLength(2);
    });
  });

  describe("異常系", () => {
    it("空配列で拒否する", () => {
      expect(() => TaskDefinitionFileSchema.parse({ tasks: [] })).toThrow();
    });

    it("tasksフィールド欠落で拒否する", () => {
      expect(() => TaskDefinitionFileSchema.parse({})).toThrow();
    });
  });
});

describe("TaskLinkedToSchema", () => {
  it("specifications配列を受け入れる", () => {
    const result = TaskLinkedToSchema.parse({ specifications: ["spec-000001"] });
    expect(result.specifications).toEqual(["spec-000001"]);
  });

  it("specifications省略時に空配列をデフォルト値として設定する", () => {
    const result = TaskLinkedToSchema.parse({});
    expect(result.specifications).toEqual([]);
  });
});

describe("TaskEntrySchema", () => {
  const baseEntry = {
    number: 101,
    title: "Implement feature X",
    url: "https://github.com/owner/repo/issues/101",
    linkedTo: { specifications: ["spec-000001"] },
    priority: "P1" as const,
    status: "open" as const,
    estimatedHours: 5,
    syncedAt: "2026-02-10T10:00:00Z",
  };

  it("全フィールド指定で受け入れる", () => {
    const result = TaskEntrySchema.parse(baseEntry);
    expect(result.number).toBe(101);
    expect(result.status).toBe("open");
  });

  it("priority・estimatedHoursはオプション", () => {
    const { priority: _priority, estimatedHours: _estimatedHours, ...minimal } = baseEntry;
    const result = TaskEntrySchema.parse(minimal);
    expect(result.priority).toBeUndefined();
    expect(result.estimatedHours).toBeUndefined();
  });

  it("numberが0以下で拒否する", () => {
    expect(() => TaskEntrySchema.parse({ ...baseEntry, number: 0 })).toThrow();
  });

  it("不正なURLで拒否する", () => {
    expect(() => TaskEntrySchema.parse({ ...baseEntry, url: "not-a-url" })).toThrow();
  });

  it("不正なstatusで拒否する", () => {
    expect(() => TaskEntrySchema.parse({ ...baseEntry, status: "in_progress" })).toThrow();
  });
});

describe("TasksIndexSchema", () => {
  it("タスク一覧を受け入れる", () => {
    const index = {
      title: "Project Tasks",
      tasks: [
        {
          number: 101,
          title: "Task 1",
          url: "https://github.com/owner/repo/issues/101",
          linkedTo: { specifications: ["spec-000001"] },
          status: "open" as const,
          syncedAt: "2026-02-10T10:00:00Z",
        },
      ],
    };

    const result = TasksIndexSchema.parse(index);
    expect(result.title).toBe("Project Tasks");
    expect(result.tasks).toHaveLength(1);
  });

  it("空のタスク配列を受け入れる", () => {
    const result = TasksIndexSchema.parse({ title: "Empty", tasks: [] });
    expect(result.tasks).toEqual([]);
  });

  it("titleが欠けている場合は拒否する", () => {
    expect(() => TasksIndexSchema.parse({ tasks: [] })).toThrow();
  });
});
