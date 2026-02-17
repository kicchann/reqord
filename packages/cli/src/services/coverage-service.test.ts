import { describe, it, expect } from "vitest";
import type { Status } from "@reqord/shared";
import { determineCoverage, buildCoverageReport } from "./coverage-service.js";
import type { Requirement, Specification } from "@reqord/shared";

function makeReq(overrides: Partial<Requirement> = {}): Requirement {
  return {
    id: "req-000001",
    version: "1.0",
    title: "テスト要件",
    status: "approved",
    priority: "medium",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    versionHistory: [],
    files: { description: "requirements/req-000001/description.md", supplementary: [] },
    successCriteria: [],
    format: { type: "free-form" },
    dependencies: { blockedBy: [], blocks: [], relatedTo: [] },
    flags: [],
    ...overrides,
  };
}

function makeSpec(overrides: Partial<Specification> = {}): Specification {
  return {
    id: "spec-000001",
    requirementId: "req-000001",
    version: "1.0",
    status: "draft",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    versionHistory: [],
    files: { design: "specifications/spec-000001/design.md", supplementary: [] },
    flags: [],
    ...overrides,
  };
}

describe("determineCoverage", () => {
  it("Specificationが0件でnot-covered", () => {
    expect(determineCoverage([])).toBe("not-covered");
  });

  it("approved Specificationがあればcovered", () => {
    expect(determineCoverage([{ status: "approved" as Status }])).toBe("covered");
  });

  it("implemented Specificationがあればcovered", () => {
    expect(determineCoverage([{ status: "implemented" as Status }])).toBe("covered");
  });

  it("draftのみならpartial", () => {
    expect(determineCoverage([{ status: "draft" as Status }])).toBe("partial");
  });

  it("draftとapprovedがあればcovered", () => {
    expect(
      determineCoverage([
        { status: "draft" as Status },
        { status: "approved" as Status },
      ]),
    ).toBe("covered");
  });
});

describe("buildCoverageReport", () => {
  it("空の要件リストで空レポート", () => {
    const report = buildCoverageReport([], []);
    expect(report.requirements).toEqual([]);
    expect(report.summary).toEqual({
      covered: 0,
      partial: 0,
      notCovered: 0,
      total: 0,
    });
  });

  it("deprecated要件は除外", () => {
    const reqs = [makeReq({ id: "req-000001", status: "deprecated" })];
    const report = buildCoverageReport(reqs, []);
    expect(report.requirements).toEqual([]);
    expect(report.summary.total).toBe(0);
  });

  it("正しいカバレッジ集計", () => {
    const reqs = [
      makeReq({ id: "req-000001", status: "approved" }),
      makeReq({ id: "req-000002", status: "approved", title: "要件2" }),
      makeReq({ id: "req-000003", status: "draft", title: "要件3" }),
    ];
    const specs = [
      makeSpec({ id: "spec-000001", requirementId: "req-000001", status: "approved" }),
      makeSpec({ id: "spec-000002", requirementId: "req-000002", status: "draft" }),
    ];
    const report = buildCoverageReport(reqs, specs);

    expect(report.summary).toEqual({
      covered: 1,
      partial: 1,
      notCovered: 1,
      total: 3,
    });

    expect(report.requirements[0].status).toBe("covered");
    expect(report.requirements[1].status).toBe("partial");
    expect(report.requirements[2].status).toBe("not-covered");
  });

  it("deprecated Specificationは無視", () => {
    const reqs = [makeReq({ id: "req-000001", status: "approved" })];
    const specs = [
      makeSpec({ id: "spec-000001", requirementId: "req-000001", status: "deprecated" }),
    ];
    const report = buildCoverageReport(reqs, specs);
    expect(report.requirements[0].status).toBe("not-covered");
  });
});
