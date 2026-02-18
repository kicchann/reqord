import { describe, it, expect } from "vitest";
import { checkConsistency } from "./consistency.js";
import type { Requirement } from "../schemas/requirement.js";
import type { Specification } from "../schemas/specification.js";

function createReq(overrides: Partial<Requirement> = {}): Requirement {
  return {
    id: "req-000001",
    version: "1.0.0",
    title: "Test requirement",
    status: "draft",
    priority: "medium",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    versionHistory: [],
    files: { description: "description.md", supplementary: [] },
    successCriteria: [],
    format: { type: "free-form" },
    dependencies: { blockedBy: [], blocks: [], relatedTo: [] },
    flags: [],
    ...overrides,
  };
}

function createSpec(overrides: Partial<Specification> = {}): Specification {
  return {
    id: "spec-000001",
    requirementId: "req-000001",
    version: "1.0.0",
    status: "draft",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    versionHistory: [],
    files: { design: "design.md", supplementary: [] },
    flags: [],
    ...overrides,
  };
}

describe("checkConsistency", () => {
  it("全SpecがimplementedだがReqがapprovedの場合、警告を返す", () => {
    const req = createReq({ status: "approved" });
    const specs = [
      createSpec({ id: "spec-000001", status: "implemented" }),
      createSpec({ id: "spec-000002", status: "implemented" }),
    ];

    const warnings = checkConsistency(req, specs);

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toEqual({
      type: "all-specs-implemented",
      requirementId: "req-000001",
      specificationIds: ["spec-000001", "spec-000002"],
      message: expect.stringContaining("implemented"),
      severity: "warning",
    });
  });

  it("ReqがdeprecatedだがSpecがdraft/approvedの場合、警告を返す", () => {
    const req = createReq({ status: "deprecated" });
    const specs = [
      createSpec({ id: "spec-000001", status: "draft" }),
      createSpec({ id: "spec-000002", status: "approved" }),
      createSpec({ id: "spec-000003", status: "deprecated" }),
    ];

    const warnings = checkConsistency(req, specs);

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toEqual({
      type: "deprecated-with-active-specs",
      requirementId: "req-000001",
      specificationIds: ["spec-000001", "spec-000002"],
      message: expect.stringContaining("deprecated"),
      severity: "warning",
    });
  });

  it("正常状態の場合、空配列を返す", () => {
    const req = createReq({ status: "approved" });
    const specs = [
      createSpec({ status: "draft" }),
      createSpec({ id: "spec-000002", status: "approved" }),
    ];

    const warnings = checkConsistency(req, specs);

    expect(warnings).toEqual([]);
  });

  it("Specが0件の場合、空配列を返す", () => {
    const req = createReq({ status: "approved" });

    const warnings = checkConsistency(req, []);

    expect(warnings).toEqual([]);
  });

  it("ReqがimplementedでSpecもimplementedの場合、警告なし", () => {
    const req = createReq({ status: "implemented" });
    const specs = [createSpec({ status: "implemented" })];

    const warnings = checkConsistency(req, specs);

    expect(warnings).toEqual([]);
  });

  it("Reqがdeprecatedで全Specもdeprecatedの場合、警告なし", () => {
    const req = createReq({ status: "deprecated" });
    const specs = [
      createSpec({ status: "deprecated" }),
      createSpec({ id: "spec-000002", status: "deprecated" }),
    ];

    const warnings = checkConsistency(req, specs);

    expect(warnings).toEqual([]);
  });
});
