import { describe, it, expect, vi, beforeEach } from "vitest";
import { ISSUES_DIR } from "@reqord/shared";

vi.mock("../repositories/specification.js", () => ({
  findByIdOrThrow: vi.fn(),
  loadFile: vi.fn(),
  findAll: vi.fn(),
}));

vi.mock("../repositories/requirement.js", () => ({}));

vi.mock("../repositories/file-system.js", () => ({
  joinPath: vi.fn((...parts: string[]) => parts.join("/")),
  exists: vi.fn(),
  readYAML: vi.fn(),
}));

import {
  parseDesignPaths,
  determineOverallStatus,
  validateImplementation,
  checkImplementConsistency,
} from "./impl-validation-service.js";
import type {
  IssueCheckResult,
  ComponentCheckResult,
  TestCheckResult,
} from "./impl-validation-service.js";
import * as specRepo from "../repositories/specification.js";
import * as fs from "../repositories/file-system.js";

function makeTasksYaml(
  tasks: Array<{
    number: number;
    title: string;
    url: string;
    status: "open" | "closed";
    priority?: string;
    specIds?: string[];
  }>,
) {
  return {
    title: "Tasks Index",
    tasks: tasks.map((t) => ({
      number: t.number,
      title: t.title,
      url: t.url,
      status: t.status,
      priority: t.priority ?? "P2",
      estimatedHours: 4,
      syncedAt: "2026-01-01T00:00:00Z",
      linkedTo: { specifications: t.specIds ?? [] },
    })),
  };
}

function setupTasksYaml(
  tasks: Array<{
    number: number;
    title: string;
    url: string;
    status: "open" | "closed";
    priority?: string;
    specIds?: string[];
  }>,
) {
  vi.mocked(fs.exists).mockImplementation(async (path: string) => {
    if (path.includes(ISSUES_DIR)) return true;
    return true;
  });
  vi.mocked(fs.readYAML).mockResolvedValue(makeTasksYaml(tasks));
}

function setupNoTasksYaml() {
  vi.mocked(fs.exists).mockImplementation(async (path: string) => {
    if (path.includes(ISSUES_DIR)) return false;
    return true;
  });
}

describe("parseDesignPaths", () => {
  it("extracts paths from section headings", () => {
    const content = `### 3.1 StatusService (\`packages/cli/src/services/status-service.ts\`)`;
    const result = parseDesignPaths(content);
    expect(result.components).toEqual([
      { path: "packages/cli/src/services/status-service.ts", description: "StatusService" },
    ]);
  });

  it("extracts inline backtick paths", () => {
    const content = "Use `packages/cli/src/commands/status.ts` for the command.";
    const result = parseDesignPaths(content);
    expect(result.components).toEqual([
      { path: "packages/cli/src/commands/status.ts", description: "" },
    ]);
  });

  it("separates test files from components", () => {
    const content = `
### 3.1 Service (\`packages/cli/src/services/foo.ts\`)
### 3.2 Test (\`packages/cli/src/services/foo.test.ts\`)
`;
    const result = parseDesignPaths(content);
    expect(result.components).toHaveLength(1);
    expect(result.components[0].path).toBe("packages/cli/src/services/foo.ts");
    expect(result.tests.some((t) => t.path === "packages/cli/src/services/foo.test.ts")).toBe(true);
  });

  it("generates test paths for components without explicit tests", () => {
    const content = `### 3.1 Service (\`packages/cli/src/services/bar.ts\`)`;
    const result = parseDesignPaths(content);
    expect(result.tests).toEqual([
      { path: "packages/cli/src/services/bar.test.ts", type: "unit" },
    ]);
  });

  it("deduplicates paths", () => {
    const content = `
### 3.1 Service (\`packages/cli/src/services/foo.ts\`)
Also see \`packages/cli/src/services/foo.ts\` for details.
`;
    const result = parseDesignPaths(content);
    expect(result.components).toHaveLength(1);
  });

  it("marks integration tests correctly", () => {
    const content = `### Test (\`packages/cli/src/services/foo.integration.test.ts\`)`;
    const result = parseDesignPaths(content);
    expect(result.tests.some((t) => t.type === "integration")).toBe(true);
  });

  it("strips leading slash from paths", () => {
    const content = `### 3.1 Service (\`/packages/cli/src/services/foo.ts\`)`;
    const result = parseDesignPaths(content);
    expect(result.components[0].path).toBe("packages/cli/src/services/foo.ts");
  });

  it("generates .test.tsx for .tsx components", () => {
    const content = `### 3.1 Button (\`packages/web/src/components/Button.tsx\`)`;
    const result = parseDesignPaths(content);
    expect(result.tests).toEqual([
      { path: "packages/web/src/components/Button.test.tsx", type: "unit" },
    ]);
  });

  it("extracts paths from architecture diagrams", () => {
    const content = `## Architecture
\`\`\`
    services/foo-service.ts    (new)
    repositories/bar-repo.ts   (existing)
\`\`\``;
    const result = parseDesignPaths(content);
    expect(result.components.some((c) => c.path === "services/foo-service.ts")).toBe(true);
    expect(result.components.some((c) => c.path === "repositories/bar-repo.ts")).toBe(true);
  });

  it("returns empty when no paths found", () => {
    const result = parseDesignPaths("No paths here, just text.");
    expect(result.components).toEqual([]);
    expect(result.tests).toEqual([]);
  });

  it("returns empty for template design.md content", () => {
    const content = `# Title - Technical Design Document

## 1. Design Overview

(Describe design overview here)

## 2. Architecture

(Describe architecture diagram here)

## 3. Component Design

(Describe component design here)

## 4. Data Flow

(Describe data flow here)

## 5. Test Plan

(Describe test plan here)
`;
    const result = parseDesignPaths(content);
    expect(result.components).toEqual([]);
    expect(result.tests).toEqual([]);
  });

  it("returns empty for empty string", () => {
    const result = parseDesignPaths("");
    expect(result.components).toEqual([]);
    expect(result.tests).toEqual([]);
  });
});

describe("determineOverallStatus", () => {
  it("returns complete when all checks pass", () => {
    const issue: IssueCheckResult = { total: 2, completed: 2, issues: [] };
    const comp: ComponentCheckResult = { total: 3, exists: 3, components: [] };
    const test: TestCheckResult = { total: 2, exists: 2, tests: [] };
    expect(determineOverallStatus(issue, comp, test)).toBe("complete");
  });

  it("returns complete when all totals are zero", () => {
    const issue: IssueCheckResult = { total: 0, completed: 0, issues: [] };
    const comp: ComponentCheckResult = { total: 0, exists: 0, components: [] };
    const test: TestCheckResult = { total: 0, exists: 0, tests: [] };
    expect(determineOverallStatus(issue, comp, test)).toBe("complete");
  });

  it("returns not-started when nothing exists", () => {
    const issue: IssueCheckResult = { total: 2, completed: 0, issues: [] };
    const comp: ComponentCheckResult = { total: 3, exists: 0, components: [] };
    const test: TestCheckResult = { total: 2, exists: 0, tests: [] };
    expect(determineOverallStatus(issue, comp, test)).toBe("not-started");
  });

  it("returns partial when some exist", () => {
    const issue: IssueCheckResult = { total: 2, completed: 1, issues: [] };
    const comp: ComponentCheckResult = { total: 3, exists: 2, components: [] };
    const test: TestCheckResult = { total: 2, exists: 1, tests: [] };
    expect(determineOverallStatus(issue, comp, test)).toBe("partial");
  });

  it("returns partial when only issues are incomplete", () => {
    const issue: IssueCheckResult = { total: 2, completed: 1, issues: [] };
    const comp: ComponentCheckResult = { total: 3, exists: 3, components: [] };
    const test: TestCheckResult = { total: 2, exists: 2, tests: [] };
    expect(determineOverallStatus(issue, comp, test)).toBe("partial");
  });
});

describe("validateImplementation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(fs.joinPath).mockImplementation((...parts: string[]) => parts.join("/"));
  });

  it("reads issues from tasks.yaml linked to the spec", async () => {
    vi.mocked(specRepo.findByIdOrThrow).mockResolvedValue({
      id: "spec-000001",
      requirementId: "req-000001",
      version: "1.0.0",
      status: "approved",
      createdAt: "2024-01-01",
      updatedAt: "2024-01-01",
      versionHistory: [],
      files: { design: "design.md", supplementary: [] },
    });

    vi.mocked(specRepo.loadFile).mockResolvedValue(
      `### 3.1 Service (\`packages/cli/src/services/foo.ts\`)`,
    );

    setupTasksYaml([
      { number: 1, title: "Task 1", url: "http://x/1", status: "closed", priority: "P1", specIds: ["spec-000001"] },
      { number: 2, title: "Task 2", url: "http://x/2", status: "open", priority: "P2", specIds: ["spec-000001"] },
    ]);

    const result = await validateImplementation("/project", "spec-000001");

    expect(result.specId).toBe("spec-000001");
    expect(result.requirementId).toBe("req-000001");
    expect(result.issueCheck.total).toBe(2);
    expect(result.issueCheck.completed).toBe(1);
    expect(result.issueCheck.issues[0].state).toBe("closed");
    expect(result.issueCheck.issues[1].state).toBe("open");
  });

  it("only includes issues linked to the given spec (not others)", async () => {
    vi.mocked(specRepo.findByIdOrThrow).mockResolvedValue({
      id: "spec-000001",
      requirementId: "req-000001",
      version: "1.0.0",
      status: "approved",
      createdAt: "2024-01-01",
      updatedAt: "2024-01-01",
      versionHistory: [],
      files: { design: "design.md", supplementary: [] },
    });

    vi.mocked(specRepo.loadFile).mockResolvedValue(
      `### 3.1 Service (\`packages/cli/src/services/foo.ts\`)`,
    );

    setupTasksYaml([
      { number: 1, title: "Task for spec-000001", url: "http://x/1", status: "closed", specIds: ["spec-000001"] },
      { number: 2, title: "Task for spec-000099", url: "http://x/2", status: "open", specIds: ["spec-000099"] },
    ]);

    const result = await validateImplementation("/project", "spec-000001");

    expect(result.issueCheck.total).toBe(1);
    expect(result.issueCheck.issues[0].number).toBe(1);
  });

  it("skips issue check when tasks.yaml does not exist", async () => {
    vi.mocked(specRepo.findByIdOrThrow).mockResolvedValue({
      id: "spec-000002",
      requirementId: "req-000002",
      version: "1.0.0",
      status: "draft",
      createdAt: "2024-01-01",
      updatedAt: "2024-01-01",
      versionHistory: [],
      files: { design: "design.md", supplementary: [] },
    });

    vi.mocked(specRepo.loadFile).mockResolvedValue(null);
    setupNoTasksYaml();

    const result = await validateImplementation("/project", "spec-000002");

    expect(result.issueCheck.total).toBe(0);
    expect(result.componentCheck.total).toBe(0);
    expect(result.testCheck.total).toBe(0);
    expect(result.overallStatus).toBe("not-started");
  });

  it("returns complete status when all issues closed and all files exist", async () => {
    vi.mocked(specRepo.findByIdOrThrow).mockResolvedValue({
      id: "spec-000003",
      requirementId: "req-000003",
      version: "1.0.0",
      status: "approved",
      createdAt: "2024-01-01",
      updatedAt: "2024-01-01",
      versionHistory: [],
      files: { design: "design.md", supplementary: [] },
    });

    vi.mocked(specRepo.loadFile).mockResolvedValue(
      `### 3.1 Service (\`packages/cli/src/services/foo.ts\`)`,
    );

    setupTasksYaml([
      { number: 1, title: "Task 1", url: "http://x/1", status: "closed", specIds: ["spec-000003"] },
    ]);

    const result = await validateImplementation("/project", "spec-000003");

    expect(result.issueCheck.completed).toBe(1);
    expect(result.componentCheck.exists).toBe(1);
    expect(result.testCheck.exists).toBe(1);
    expect(result.overallStatus).toBe("complete");
  });

  it("returns not-started when component file and test missing", async () => {
    vi.mocked(specRepo.findByIdOrThrow).mockResolvedValue({
      id: "spec-000004",
      requirementId: "req-000004",
      version: "1.0.0",
      status: "approved",
      createdAt: "2024-01-01",
      updatedAt: "2024-01-01",
      versionHistory: [],
      files: { design: "design.md", supplementary: [] },
    });

    vi.mocked(specRepo.loadFile).mockResolvedValue(
      `### 3.1 Service (\`packages/cli/src/services/foo.ts\`)`,
    );

    vi.mocked(fs.readYAML).mockResolvedValue(makeTasksYaml([]));
    vi.mocked(fs.exists).mockImplementation(async (path: string) => {
      if (path.includes(ISSUES_DIR)) return true;
      return false;
    });

    const result = await validateImplementation("/project", "spec-000004");

    expect(result.componentCheck.exists).toBe(0);
    expect(result.overallStatus).toBe("not-started");
  });
});

describe("checkImplementConsistency", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(fs.joinPath).mockImplementation((...parts: string[]) => parts.join("/"));
  });

  it("全Spec implemented + 全Issue closed → warnings空", async () => {
    vi.mocked(specRepo.findAll).mockResolvedValue([
      {
        id: "spec-000001", requirementId: "req-000001", version: "1.0.0", status: "implemented",
        createdAt: "2024-01-01", updatedAt: "2024-01-01", versionHistory: [],
        files: { design: "design.md", supplementary: [] },
      },
    ]);

    setupTasksYaml([
      { number: 1, title: "Task 1", url: "http://x/1", status: "closed", specIds: ["spec-000001"] },
    ]);

    const result = await checkImplementConsistency("/project", "req-000001");
    expect(result.warnings).toEqual([]);
  });

  it("一部Spec draft/approved → spec-not-implemented警告", async () => {
    vi.mocked(specRepo.findAll).mockResolvedValue([
      {
        id: "spec-000001", requirementId: "req-000001", version: "1.0.0", status: "approved",
        createdAt: "2024-01-01", updatedAt: "2024-01-01", versionHistory: [],
        files: { design: "design.md", supplementary: [] },
      },
    ]);

    setupTasksYaml([]);

    const result = await checkImplementConsistency("/project", "req-000001");
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        type: "spec-not-implemented",
        details: expect.objectContaining({ id: "spec-000001", currentStatus: "approved" }),
      }),
    );
  });

  it("一部Issue open → issue-not-closed警告", async () => {
    vi.mocked(specRepo.findAll).mockResolvedValue([
      {
        id: "spec-000001", requirementId: "req-000001", version: "1.0.0", status: "implemented",
        createdAt: "2024-01-01", updatedAt: "2024-01-01", versionHistory: [],
        files: { design: "design.md", supplementary: [] },
      },
    ]);

    setupTasksYaml([
      { number: 42, title: "Open task", url: "http://x/42", status: "open", priority: "P1", specIds: ["spec-000001"] },
    ]);

    const result = await checkImplementConsistency("/project", "req-000001");
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        type: "issue-not-closed",
        details: expect.objectContaining({ id: "42", currentStatus: "open" }),
      }),
    );
  });

  it("Spec 0件 → warnings空", async () => {
    vi.mocked(specRepo.findAll).mockResolvedValue([]);

    const result = await checkImplementConsistency("/project", "req-000001");
    expect(result.warnings).toEqual([]);
  });

  it("deprecated Spec → spec-not-implemented警告が出る（意図的な動作）", async () => {
    vi.mocked(specRepo.findAll).mockResolvedValue([
      {
        id: "spec-000001", requirementId: "req-000001", version: "1.0.0", status: "deprecated",
        createdAt: "2024-01-01", updatedAt: "2024-01-01", versionHistory: [],
        files: { design: "design.md", supplementary: [] },
      },
    ]);

    setupTasksYaml([]);

    const result = await checkImplementConsistency("/project", "req-000001");
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        type: "spec-not-implemented",
        details: expect.objectContaining({ id: "spec-000001", currentStatus: "deprecated" }),
      }),
    );
  });

  it("tasks.yamlなし → Issueチェックスキップ", async () => {
    vi.mocked(specRepo.findAll).mockResolvedValue([
      {
        id: "spec-000001", requirementId: "req-000001", version: "1.0.0", status: "implemented",
        createdAt: "2024-01-01", updatedAt: "2024-01-01", versionHistory: [],
        files: { design: "design.md", supplementary: [] },
      },
    ]);

    setupNoTasksYaml();

    const result = await checkImplementConsistency("/project", "req-000001");
    expect(result.warnings.filter((w) => w.type === "issue-not-closed")).toEqual([]);
  });

  it("tasks in tasks.yaml for other specs are not reported", async () => {
    vi.mocked(specRepo.findAll).mockResolvedValue([
      {
        id: "spec-000001", requirementId: "req-000001", version: "1.0.0", status: "implemented",
        createdAt: "2024-01-01", updatedAt: "2024-01-01", versionHistory: [],
        files: { design: "design.md", supplementary: [] },
      },
    ]);

    setupTasksYaml([
      { number: 1, title: "Task for spec-000001", url: "http://x/1", status: "closed", specIds: ["spec-000001"] },
      { number: 2, title: "Open task for other spec", url: "http://x/2", status: "open", specIds: ["spec-000099"] },
    ]);

    const result = await checkImplementConsistency("/project", "req-000001");
    expect(result.warnings.filter((w) => w.type === "issue-not-closed")).toEqual([]);
  });
});

describe("parseDesignPaths security", () => {
  it("rejects path traversal attempts", () => {
    const content = `### 3.1 Evil (\`packages/../../../etc/passwd.ts\`)`;
    const result = parseDesignPaths(content);
    expect(result.components).toEqual([]);
  });

  it("rejects Windows absolute paths", () => {
    const content = `### 3.1 Evil (\`C:/Windows/system32/evil.ts\`)`;
    const result = parseDesignPaths(content);
    expect(result.components).toEqual([]);
  });
});
