import { describe, it, expect } from "vitest";
import { validateSpecTasks, taskValidateCommand } from "./validate.js";
import type { TaskEntry } from "@reqord/shared";

function makeTask(overrides: Partial<TaskEntry> = {}): TaskEntry {
  return {
    number: 1,
    title: "Task 1",
    url: "https://github.com/owner/repo/issues/1",
    linkedTo: { specifications: ["spec-000001"] },
    priority: "P1",
    status: "open",
    syncedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("validateSpecTasks", () => {
  it("returns warning when no tasks found for spec", () => {
    const result = validateSpecTasks("spec-000001", []);

    expect(result.specId).toBe("spec-000001");
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].type).toBe("warning");
    expect(result.issues[0].message).toBe(
      "No tasks found in tasks.yaml for this specification"
    );
  });

  it("returns info when tasks exist but none have been synced", () => {
    const tasks = [makeTask({ syncedAt: undefined as unknown as string })];
    const result = validateSpecTasks("spec-000001", tasks);

    expect(result.specId).toBe("spec-000001");
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].type).toBe("info");
    expect(result.issues[0].message).toBe(
      "No progress data. Run `reqord task sync` to calculate progress"
    );
  });

  it("returns no issues when all tasks are closed", () => {
    const tasks = [
      makeTask({ status: "closed", syncedAt: "2026-01-02T00:00:00Z" }),
    ];
    const result = validateSpecTasks("spec-000001", tasks);

    expect(result.specId).toBe("spec-000001");
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("returns no issues when some tasks are open and some closed", () => {
    const tasks = [
      makeTask({ number: 1, status: "closed", syncedAt: "2026-01-02T00:00:00Z" }),
      makeTask({ number: 2, status: "open", syncedAt: "2026-01-02T00:00:00Z" }),
    ];
    const result = validateSpecTasks("spec-000001", tasks);

    expect(result.specId).toBe("spec-000001");
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("returns no issues when all tasks are open and synced", () => {
    const tasks = [
      makeTask({ status: "open", syncedAt: "2026-01-02T00:00:00Z" }),
    ];
    const result = validateSpecTasks("spec-000001", tasks);

    expect(result.specId).toBe("spec-000001");
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });
});

describe("taskValidateCommand", () => {
  it("has correct command name 'validate'", () => {
    expect(taskValidateCommand.name()).toBe("validate");
  });

  it("has optional argument 'spec-id'", () => {
    const args = taskValidateCommand.registeredArguments;
    expect(args).toHaveLength(1);
    expect(args[0].name()).toBe("spec-id");
    expect(args[0].required).toBe(false);
  });

  it("has optional '--all' option", () => {
    const option = taskValidateCommand.options.find(
      (opt) => opt.long === "--all"
    );
    expect(option).toBeDefined();
    expect(option?.required).toBe(false);
  });

  it("has optional '--json' option", () => {
    const option = taskValidateCommand.options.find(
      (opt) => opt.long === "--json"
    );
    expect(option).toBeDefined();
    expect(option?.required).toBe(false);
  });
});
