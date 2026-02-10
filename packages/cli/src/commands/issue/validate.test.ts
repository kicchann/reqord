import { describe, it, expect } from "vitest";
import { validateSpecification, issueValidateCommand } from "./validate.js";
import type { Specification } from "@reqord/shared";

function createMockSpec(overrides: Partial<Specification> = {}): Specification {
  return {
    id: "spec-000001",
    requirementId: "req-000001",
    version: "1.0.0",
    status: "approved",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    versionHistory: [],
    files: { design: "design.md", supplementary: [] },
    flags: [],
    ...overrides,
  } as Specification;
}

describe("validateSpecification", () => {
  it("returns error when spec has no implementation field", () => {
    const spec = createMockSpec();
    const result = validateSpecification(spec);

    expect(result.specId).toBe("spec-000001");
    expect(result.valid).toBe(false);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].type).toBe("error");
    expect(result.issues[0].message).toBe("No implementation field found");
  });

  it("returns warning when spec has implementation but empty issues", () => {
    const spec = createMockSpec({
      implementation: {
        issues: [],
        totalEstimatedHours: 0,
        createdAt: "2026-01-01T00:00:00Z",
      },
    });
    const result = validateSpecification(spec);

    expect(result.specId).toBe("spec-000001");
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].type).toBe("warning");
    expect(result.issues[0].message).toBe("No issues found in implementation");
  });

  it("returns info when spec has implementation but no progress", () => {
    const spec = createMockSpec({
      implementation: {
        issues: [
          {
            number: 1,
            title: "Task 1",
            url: "https://github.com/owner/repo/issues/1",
            priority: "P1",
            status: "open",
          },
        ],
        totalEstimatedHours: 8,
        createdAt: "2026-01-01T00:00:00Z",
      },
    });
    const result = validateSpecification(spec);

    expect(result.specId).toBe("spec-000001");
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].type).toBe("info");
    expect(result.issues[0].message).toBe(
      "No progress data. Run `reqord issue sync` to calculate progress"
    );
  });

  it("returns no issues when spec has all issues closed and progress is 100%", () => {
    const spec = createMockSpec({
      implementation: {
        issues: [
          {
            number: 1,
            title: "Task 1",
            url: "https://github.com/owner/repo/issues/1",
            priority: "P1",
            status: "closed",
          },
        ],
        totalEstimatedHours: 8,
        createdAt: "2026-01-01T00:00:00Z",
        progress: {
          total: 1,
          completed: 1,
          percentage: 100,
          lastSyncedAt: "2026-01-02T00:00:00Z",
        },
      },
    });
    const result = validateSpecification(spec);

    expect(result.specId).toBe("spec-000001");
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("returns warning when all issues are closed but progress is not 100%", () => {
    const spec = createMockSpec({
      implementation: {
        issues: [
          {
            number: 1,
            title: "Task 1",
            url: "https://github.com/owner/repo/issues/1",
            priority: "P1",
            status: "closed",
          },
        ],
        totalEstimatedHours: 8,
        createdAt: "2026-01-01T00:00:00Z",
        progress: {
          total: 1,
          completed: 0,
          percentage: 0,
          lastSyncedAt: "2026-01-02T00:00:00Z",
        },
      },
    });
    const result = validateSpecification(spec);

    expect(result.specId).toBe("spec-000001");
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].type).toBe("warning");
    expect(result.issues[0].message).toBe(
      "All issues are closed but progress is not 100%"
    );
  });

  it("returns no warnings when spec has some open issues and progress", () => {
    const spec = createMockSpec({
      implementation: {
        issues: [
          {
            number: 1,
            title: "Task 1",
            url: "https://github.com/owner/repo/issues/1",
            priority: "P1",
            status: "closed",
          },
          {
            number: 2,
            title: "Task 2",
            url: "https://github.com/owner/repo/issues/2",
            priority: "P2",
            status: "open",
          },
        ],
        totalEstimatedHours: 16,
        createdAt: "2026-01-01T00:00:00Z",
        progress: {
          total: 2,
          completed: 1,
          percentage: 50,
          lastSyncedAt: "2026-01-02T00:00:00Z",
        },
      },
    });
    const result = validateSpecification(spec);

    expect(result.specId).toBe("spec-000001");
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });
});

describe("issueValidateCommand", () => {
  it("has correct command name 'validate'", () => {
    expect(issueValidateCommand.name()).toBe("validate");
  });

  it("has optional argument 'spec-id'", () => {
    const args = issueValidateCommand.registeredArguments;
    expect(args).toHaveLength(1);
    expect(args[0].name()).toBe("spec-id");
    expect(args[0].required).toBe(false);
  });

  it("has optional '--all' option", () => {
    const option = issueValidateCommand.options.find(
      (opt) => opt.long === "--all"
    );
    expect(option).toBeDefined();
    expect(option?.required).toBe(false);
  });

  it("has optional '--json' option", () => {
    const option = issueValidateCommand.options.find(
      (opt) => opt.long === "--json"
    );
    expect(option).toBeDefined();
    expect(option?.required).toBe(false);
  });
});
