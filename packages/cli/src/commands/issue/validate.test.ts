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
  it("returns valid with info message about tasks.yaml migration", () => {
    const spec = createMockSpec();
    const result = validateSpecification(spec);

    expect(result.specId).toBe("spec-000001");
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].type).toBe("info");
    expect(result.issues[0].message).toContain("tasks.yaml");
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
