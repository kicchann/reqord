import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { dump as yamlDump, JSON_SCHEMA } from "js-yaml";

describe("tasks-data", () => {
  let tmpDir: string;
  let tasksDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "reqord-tasks-test-"));
    tasksDir = join(tmpDir, ".reqord", "issues");
    await mkdir(tasksDir, { recursive: true });
    process.env.REQORD_ROOT = tmpDir;
    vi.resetModules();
  });

  afterEach(async () => {
    delete process.env.REQORD_ROOT;
    await rm(tmpDir, { recursive: true, force: true });
  });

  async function getLoadTasksYaml() {
    const { loadTasksYaml } = await import("../../lib/tasks-data.js");
    return loadTasksYaml;
  }

  describe("loadTasksYaml", () => {
    it("ファイルが存在しない場合にタイトル'Tasks'で空のタスク一覧を返す", async () => {
      const loadTasksYaml = await getLoadTasksYaml();
      const result = await loadTasksYaml();
      expect(result.title).toBe("Tasks");
      expect(result.tasks).toEqual([]);
    });

    it("バリデーション失敗の場合にタイトル'Tasks'で空のタスク一覧を返す", async () => {
      const tasksPath = join(tasksDir, "tasks.yaml");
      const invalidData = { tasks: [] }; // title missing
      await writeFile(
        tasksPath,
        yamlDump(invalidData, { schema: JSON_SCHEMA }),
        "utf-8",
      );

      const loadTasksYaml = await getLoadTasksYaml();
      const result = await loadTasksYaml();
      expect(result.title).toBe("Tasks");
      expect(result.tasks).toEqual([]);
    });

    it("有効なtasks.yamlを正常に読み込む", async () => {
      const tasksPath = join(tasksDir, "tasks.yaml");
      const validData = {
        title: "My Project Tasks",
        tasks: [],
      };
      await writeFile(
        tasksPath,
        yamlDump(validData, { schema: JSON_SCHEMA }),
        "utf-8",
      );

      const loadTasksYaml = await getLoadTasksYaml();
      const result = await loadTasksYaml();
      expect(result.title).toBe("My Project Tasks");
      expect(result.tasks).toEqual([]);
    });
  });
});
