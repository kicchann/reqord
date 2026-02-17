import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  parseDesignPaths,
  determineOverallStatus,
  validateImplementation,
} from "./impl-validation-service.js";
import type {
  IssueCheckResult,
  ComponentCheckResult,
  TestCheckResult,
} from "./impl-validation-service.js";

vi.mock("../repositories/specification.js", () => ({
  findByIdOrThrow: vi.fn(),
  loadFile: vi.fn(),
}));

vi.mock("../repositories/file-system.js", () => ({
  joinPath: vi.fn((...parts: string[]) => parts.join("/")),
  exists: vi.fn(),
}));

import * as specRepo from "../repositories/specification.js";
import * as fs from "../repositories/file-system.js";

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
    const content = `## アーキテクチャ
\`\`\`
    services/foo-service.ts    (新規)
    repositories/bar-repo.ts   (既存)
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
  });

  it("returns validation with issue, component, and test checks", async () => {
    vi.mocked(specRepo.findByIdOrThrow).mockResolvedValue({
      id: "spec-000001",
      requirementId: "req-000001",
      version: "1.0.0",
      status: "approved",
      createdAt: "2024-01-01",
      updatedAt: "2024-01-01",
      versionHistory: [],
      files: { design: "design.md", supplementary: [] },
      flags: [],
      implementation: {
        issues: [
          { number: 1, title: "Task 1", url: "http://x", priority: "P1" as const, status: "closed" as const },
          { number: 2, title: "Task 2", url: "http://x", priority: "P2" as const, status: "open" as const },
        ],
        totalEstimatedHours: 10,
        createdAt: "2024-01-01",
      },
    });

    vi.mocked(specRepo.loadFile).mockResolvedValue(
      `### 3.1 Service (\`packages/cli/src/services/foo.ts\`)`,
    );

    vi.mocked(fs.exists)
      .mockResolvedValueOnce(true)   // component exists
      .mockResolvedValueOnce(false); // test missing

    const result = await validateImplementation("/project", "spec-000001");

    expect(result.specId).toBe("spec-000001");
    expect(result.requirementId).toBe("req-000001");
    expect(result.issueCheck.total).toBe(2);
    expect(result.issueCheck.completed).toBe(1);
    expect(result.componentCheck.total).toBe(1);
    expect(result.componentCheck.exists).toBe(1);
    expect(result.testCheck.total).toBe(1);
    expect(result.testCheck.exists).toBe(0);
    expect(result.overallStatus).toBe("partial");
  });

  it("handles spec without implementation field", async () => {
    vi.mocked(specRepo.findByIdOrThrow).mockResolvedValue({
      id: "spec-000002",
      requirementId: "req-000002",
      version: "1.0.0",
      status: "draft",
      createdAt: "2024-01-01",
      updatedAt: "2024-01-01",
      versionHistory: [],
      files: { design: "design.md", supplementary: [] },
      flags: [],
    });

    vi.mocked(specRepo.loadFile).mockResolvedValue(null);

    const result = await validateImplementation("/project", "spec-000002");

    expect(result.issueCheck.total).toBe(0);
    expect(result.componentCheck.total).toBe(0);
    expect(result.testCheck.total).toBe(0);
    expect(result.overallStatus).toBe("complete");
  });
});
