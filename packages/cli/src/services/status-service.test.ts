import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Requirement, Specification, TaskEntry } from "@reqord/shared";
import {
  buildStatusSummary,
  buildIssueSummary,
  detectWarnings,
  renderProgressBar,
  getSpecificationStatus,
  getProjectStatus,
  getRequirementStatus,
} from "./status-service.js";

vi.mock("../repositories/requirement.js", () => ({
  findAll: vi.fn(),
  findById: vi.fn(),
  findByIdOrThrow: vi.fn(),
}));
vi.mock("../repositories/specification.js", () => ({
  findAll: vi.fn(),
  findById: vi.fn(),
  findByIdOrThrow: vi.fn(),
}));
vi.mock("../repositories/file-system.js", () => ({
  joinPath: vi.fn((...args: string[]) => args.join("/")),
  exists: vi.fn(),
  readYAML: vi.fn(),
}));
vi.mock("../repositories/feedback.js", () => ({
  loadIndex: vi.fn(),
}));

import * as reqRepo from "../repositories/requirement.js";
import * as specRepo from "../repositories/specification.js";
import * as fs from "../repositories/file-system.js";
import * as feedbackRepo from "../repositories/feedback.js";

function makeRequirement(overrides: Partial<Requirement> = {}): Requirement {
  return {
    id: "req-000001",
    version: "1.0",
    title: "test requirement",
    status: "draft",
    priority: "medium",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    versionHistory: [],
    files: {
      description: "requirements/req-000001/description.md",
      supplementary: [],
    },
    successCriteria: [],
    format: { type: "free-form" },
    dependencies: { blockedBy: [], blocks: [], relatedTo: [] },
    ...overrides,
  };
}

function makeSpecification(
  overrides: Partial<Specification> = {},
): Specification {
  return {
    id: "spec-000001",
    requirementId: "req-000001",
    version: "1.0",
    status: "draft",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    versionHistory: [],
    files: {
      design: "specifications/spec-000001/design.md",
      supplementary: [],
    },
    ...overrides,
  };
}

function makeTaskEntry(overrides: Partial<TaskEntry> = {}): TaskEntry {
  return {
    number: 1,
    title: "Task 1",
    url: "https://example.com/issues/1",
    linkedTo: { specifications: ["spec-000001"] },
    priority: "P2",
    status: "open",
    syncedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function mockReadYAML(tasks: TaskEntry[]): void {
  vi.mocked(fs.exists).mockResolvedValue(true);
  vi.mocked(fs.readYAML).mockResolvedValue({ title: "Tasks", tasks });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(feedbackRepo.loadIndex).mockResolvedValue({ feedbacks: [] });
});

describe("buildStatusSummary", () => {
  it("empty array returns total=0", () => {
    const result = buildStatusSummary([]);
    expect(result).toEqual({
      total: 0,
      byStatus: {},
      implementedPercentage: 0,
      approvedPercentage: 0,
    });
  });

  it("all draft: implementedPercentage=0, approvedPercentage=0", () => {
    const items = [{ status: "draft" }, { status: "draft" }, { status: "draft" }];
    const result = buildStatusSummary(items);
    expect(result.total).toBe(3);
    expect(result.byStatus).toEqual({ draft: 3 });
    expect(result.implementedPercentage).toBe(0);
    expect(result.approvedPercentage).toBe(0);
  });

  it("all implemented: implementedPercentage=100, approvedPercentage=100", () => {
    const items = [{ status: "implemented" }, { status: "implemented" }];
    const result = buildStatusSummary(items);
    expect(result.total).toBe(2);
    expect(result.implementedPercentage).toBe(100);
    expect(result.approvedPercentage).toBe(100);
  });

  it("all approved: approvedPercentage=100", () => {
    const items = [{ status: "approved" }, { status: "approved" }];
    const result = buildStatusSummary(items);
    expect(result.approvedPercentage).toBe(100);
    expect(result.implementedPercentage).toBe(0);
  });

  it("mixed statuses aggregate correctly", () => {
    const items = [
      { status: "draft" },
      { status: "approved" },
      { status: "implemented" },
      { status: "implemented" },
      { status: "deprecated" },
    ];
    const result = buildStatusSummary(items);
    expect(result.total).toBe(5);
    expect(result.byStatus).toEqual({
      draft: 1,
      approved: 1,
      implemented: 2,
      deprecated: 1,
    });
    expect(result.implementedPercentage).toBe(40);
    expect(result.approvedPercentage).toBe(60);
  });
});

describe("buildIssueSummary", () => {
  it("empty array returns total=0", () => {
    const result = buildIssueSummary([]);
    expect(result).toEqual({
      total: 0,
      closed: 0,
      open: 0,
      closedPercentage: 0,
    });
  });

  it("task aggregation is accurate", () => {
    const tasks = [
      makeTaskEntry({ number: 1, status: "closed" }),
      makeTaskEntry({ number: 2, status: "open" }),
      makeTaskEntry({ number: 3, status: "closed" }),
    ];
    const result = buildIssueSummary(tasks);
    expect(result.total).toBe(3);
    expect(result.closed).toBe(2);
    expect(result.open).toBe(1);
    expect(result.closedPercentage).toBe(67);
  });

  it("all closed: closedPercentage=100", () => {
    const tasks = [
      makeTaskEntry({ number: 1, status: "closed" }),
      makeTaskEntry({ number: 2, status: "closed" }),
    ];
    const result = buildIssueSummary(tasks);
    expect(result.total).toBe(2);
    expect(result.closed).toBe(2);
    expect(result.open).toBe(0);
    expect(result.closedPercentage).toBe(100);
  });
});

describe("detectWarnings", () => {
  const cwd = "/test";

  it("non-draft requirement with no specification gets warning", async () => {
    const reqs = [makeRequirement({ id: "req-000001", status: "approved" })];
    const specs: Specification[] = [];
    const warnings = await detectWarnings(cwd, reqs, specs);
    expect(warnings).toContainEqual(
      expect.objectContaining({ id: "req-000001", type: "no-specification", severity: "warning" }),
    );
  });

  it("draft requirement does not get no-specification warning", async () => {
    const reqs = [makeRequirement({ id: "req-000001", status: "draft" })];
    const specs: Specification[] = [];
    const warnings = await detectWarnings(cwd, reqs, specs);
    expect(warnings.find((w) => w.id === "req-000001" && w.type === "no-specification")).toBeUndefined();
  });

  it("deprecated requirement is excluded from warnings", async () => {
    const reqs = [makeRequirement({ id: "req-000001", status: "deprecated" })];
    const specs: Specification[] = [];
    const warnings = await detectWarnings(cwd, reqs, specs);
    expect(warnings.find((w) => w.id === "req-000001")).toBeUndefined();
  });

  it("requirement with unapproved dependency gets warning", async () => {
    const reqs = [
      makeRequirement({ id: "req-000001", status: "approved", dependencies: { blockedBy: ["req-000002"], blocks: [], relatedTo: [] } }),
      makeRequirement({ id: "req-000002", status: "draft" }),
    ];
    const specs = [
      makeSpecification({ requirementId: "req-000001" }),
      makeSpecification({ id: "spec-000002", requirementId: "req-000002" }),
    ];
    const warnings = await detectWarnings(cwd, reqs, specs);
    expect(warnings).toContainEqual(
      expect.objectContaining({ id: "req-000001", type: "blocked-dependency", severity: "warning" }),
    );
  });

  it("approved dependency does not generate warning", async () => {
    const reqs = [
      makeRequirement({ id: "req-000001", status: "approved", dependencies: { blockedBy: ["req-000002"], blocks: [], relatedTo: [] } }),
      makeRequirement({ id: "req-000002", status: "approved" }),
    ];
    const specs = [
      makeSpecification({ requirementId: "req-000001" }),
      makeSpecification({ id: "spec-000002", requirementId: "req-000002" }),
    ];
    const warnings = await detectWarnings(cwd, reqs, specs);
    expect(warnings.find((w) => w.id === "req-000001" && w.type === "blocked-dependency")).toBeUndefined();
  });

  it("status inconsistency: spec implemented but req is draft", async () => {
    const reqs = [makeRequirement({ id: "req-000001", status: "draft" })];
    const specs = [makeSpecification({ id: "spec-000001", requirementId: "req-000001", status: "implemented" })];
    const warnings = await detectWarnings(cwd, reqs, specs);
    expect(warnings).toContainEqual(
      expect.objectContaining({ id: "spec-000001", type: "status-inconsistency", severity: "warning" }),
    );
  });

  it("design validation error generates warning", async () => {
    const reqs = [makeRequirement({ id: "req-000001", status: "approved" })];
    const specs = [
      makeSpecification({
        id: "spec-000001", requirementId: "req-000001",
        designValidation: { passed: 3, warnings: 1, errors: 2, rules: [], validatedAt: "2026-01-01T00:00:00Z" },
      }),
    ];
    const warnings = await detectWarnings(cwd, reqs, specs);
    expect(warnings).toContainEqual(
      expect.objectContaining({ id: "spec-000001", type: "validation-failed", severity: "warning" }),
    );
  });

  it("checkConsistency: all specs implemented but req is approved", async () => {
    const reqs = [makeRequirement({ id: "req-000001", status: "approved" })];
    const specs = [makeSpecification({ id: "spec-000001", requirementId: "req-000001", status: "implemented" })];
    const warnings = await detectWarnings(cwd, reqs, specs);
    expect(warnings).toContainEqual(
      expect.objectContaining({ id: "req-000001", type: "all-specs-implemented", severity: "warning" }),
    );
  });

  it("checkConsistency: req is deprecated but related spec is active", async () => {
    const reqs = [makeRequirement({ id: "req-000001", status: "deprecated" })];
    const specs = [makeSpecification({ id: "spec-000001", requirementId: "req-000001", status: "draft" })];
    const warnings = await detectWarnings(cwd, reqs, specs);
    expect(warnings).toContainEqual(
      expect.objectContaining({ id: "req-000001", type: "deprecated-with-active-specs" }),
    );
  });

  it("unresolved feedback on requirement generates info warning", async () => {
    vi.mocked(feedbackRepo.loadIndex).mockResolvedValue({
      feedbacks: [
        {
          githubIssue: 42,
          type: "bug",
          severity: "high",
          linkedTo: { requirements: ["req-000001"], createdRequirements: [], specifications: [], createdSpecifications: [] },
          syncedAt: "2026-01-01T00:00:00Z",
          status: "open",
        },
      ],
    });
    const reqs = [makeRequirement({ id: "req-000001", status: "approved" })];
    const specs = [makeSpecification({ requirementId: "req-000001" })];
    const warnings = await detectWarnings(cwd, reqs, specs);
    const fw = warnings.find((w) => w.id === "req-000001" && w.type === "feedback-review");
    expect(fw).toBeDefined();
    expect(fw?.severity).toBe("info");
    expect(fw?.message).toContain("#42");
  });

  it("no unresolved feedbacks means no feedback-review warning", async () => {
    const reqs = [makeRequirement({ id: "req-000001", status: "approved" })];
    const specs = [makeSpecification({ requirementId: "req-000001" })];
    const warnings = await detectWarnings(cwd, reqs, specs);
    expect(warnings.find((w) => w.id === "req-000001" && w.type === "feedback-review")).toBeUndefined();
  });

  it("unresolved feedback on specification generates info warning", async () => {
    vi.mocked(feedbackRepo.loadIndex).mockResolvedValue({
      feedbacks: [
        {
          githubIssue: 50,
          type: "improvement",
          severity: "medium",
          linkedTo: { requirements: [], createdRequirements: [], specifications: ["spec-000001"], createdSpecifications: [] },
          syncedAt: "2026-01-01T00:00:00Z",
          status: "open",
        },
      ],
    });
    const reqs = [makeRequirement({ id: "req-000001", status: "approved" })];
    const specs = [makeSpecification({ id: "spec-000001", requirementId: "req-000001" })];
    const warnings = await detectWarnings(cwd, reqs, specs);
    const fw = warnings.find((w) => w.id === "spec-000001" && w.type === "feedback-review");
    expect(fw).toBeDefined();
    expect(fw?.severity).toBe("info");
  });

  it("zero specs: no consistency warnings", async () => {
    const reqs = [makeRequirement({ id: "req-000001", status: "approved" })];
    const specs: Specification[] = [];
    const warnings = await detectWarnings(cwd, reqs, specs);
    expect(warnings.find((w) => w.type === "all-specs-implemented" || w.type === "deprecated-with-active-specs")).toBeUndefined();
  });
});

describe("renderProgressBar", () => {
  it("0% renders all empty", () => {
    expect(renderProgressBar(0)).toBe("\u2591".repeat(20));
  });
  it("100% renders all filled", () => {
    expect(renderProgressBar(100)).toBe("\u2588".repeat(20));
  });
  it("50% renders half filled", () => {
    expect(renderProgressBar(50)).toBe("\u2588".repeat(10) + "\u2591".repeat(10));
  });
  it("custom width", () => {
    const bar = renderProgressBar(50, 10);
    expect(bar).toBe("\u2588".repeat(5) + "\u2591".repeat(5));
    expect(bar.length).toBe(10);
  });
});

describe("getProjectStatus", () => {
  it("no tasks.yaml: issues.total=0", async () => {
    vi.mocked(reqRepo.findAll).mockResolvedValue([]);
    vi.mocked(specRepo.findAll).mockResolvedValue([]);
    vi.mocked(fs.exists).mockResolvedValue(false);
    const result = await getProjectStatus("/cwd");
    expect(result.issues).toEqual({ total: 0, closed: 0, open: 0, closedPercentage: 0 });
  });

  it("tasks.yaml with tasks: aggregates correctly", async () => {
    vi.mocked(reqRepo.findAll).mockResolvedValue([]);
    vi.mocked(specRepo.findAll).mockResolvedValue([]);
    mockReadYAML([
      makeTaskEntry({ number: 1, status: "closed" }),
      makeTaskEntry({ number: 2, status: "open" }),
      makeTaskEntry({ number: 3, status: "closed" }),
    ]);
    const result = await getProjectStatus("/cwd");
    expect(result.issues.total).toBe(3);
    expect(result.issues.closed).toBe(2);
    expect(result.issues.open).toBe(1);
    expect(result.issues.closedPercentage).toBe(67);
  });

  it("requirements and specifications summaries are accurate", async () => {
    vi.mocked(reqRepo.findAll).mockResolvedValue([
      makeRequirement({ id: "req-000001", status: "approved" }),
      makeRequirement({ id: "req-000002", status: "draft" }),
    ]);
    vi.mocked(specRepo.findAll).mockResolvedValue([
      makeSpecification({ id: "spec-000001", requirementId: "req-000001", status: "implemented" }),
    ]);
    vi.mocked(fs.exists).mockResolvedValue(false);
    const result = await getProjectStatus("/cwd");
    expect(result.requirements.total).toBe(2);
    expect(result.specifications.total).toBe(1);
    expect(result.generatedAt).toBeDefined();
  });
});

describe("getRequirementStatus", () => {
  it("aggregates issue progress from tasks.yaml for related specs", async () => {
    vi.mocked(reqRepo.findByIdOrThrow).mockResolvedValue(makeRequirement({ id: "req-000001", status: "approved" }));
    vi.mocked(specRepo.findAll).mockResolvedValue([makeSpecification({ id: "spec-000001", requirementId: "req-000001" })]);
    vi.mocked(reqRepo.findAll).mockResolvedValue([makeRequirement({ id: "req-000001", status: "approved" })]);
    mockReadYAML([
      makeTaskEntry({ number: 1, status: "closed", linkedTo: { specifications: ["spec-000001"] } }),
      makeTaskEntry({ number: 2, status: "open", linkedTo: { specifications: ["spec-000001"] } }),
    ]);
    const result = await getRequirementStatus("/cwd", "req-000001");
    expect(result.issueProgress.total).toBe(2);
    expect(result.issueProgress.completed).toBe(1);
  });

  it("no tasks.yaml: issueProgress.total=0", async () => {
    vi.mocked(reqRepo.findByIdOrThrow).mockResolvedValue(makeRequirement({ id: "req-000001", status: "approved" }));
    vi.mocked(specRepo.findAll).mockResolvedValue([makeSpecification({ id: "spec-000001", requirementId: "req-000001" })]);
    vi.mocked(reqRepo.findAll).mockResolvedValue([makeRequirement({ id: "req-000001", status: "approved" })]);
    vi.mocked(fs.exists).mockResolvedValue(false);
    const result = await getRequirementStatus("/cwd", "req-000001");
    expect(result.issueProgress.total).toBe(0);
    expect(result.issueProgress.completed).toBe(0);
  });

  it("tasks linked to other specs are not counted", async () => {
    vi.mocked(reqRepo.findByIdOrThrow).mockResolvedValue(makeRequirement({ id: "req-000001", status: "approved" }));
    vi.mocked(specRepo.findAll).mockResolvedValue([makeSpecification({ id: "spec-000001", requirementId: "req-000001" })]);
    vi.mocked(reqRepo.findAll).mockResolvedValue([makeRequirement({ id: "req-000001", status: "approved" })]);
    mockReadYAML([
      makeTaskEntry({ number: 1, status: "closed", linkedTo: { specifications: ["spec-000001"] } }),
      makeTaskEntry({ number: 2, status: "open", linkedTo: { specifications: ["spec-000099"] } }),
    ]);
    const result = await getRequirementStatus("/cwd", "req-000001");
    expect(result.issueProgress.total).toBe(1);
    expect(result.issueProgress.completed).toBe(1);
  });
});

describe("getSpecificationStatus", () => {
  it("returns design validation summary when present", async () => {
    vi.mocked(specRepo.findByIdOrThrow).mockResolvedValue(
      makeSpecification({ id: "spec-000001", requirementId: "req-000001", status: "approved",
        designValidation: { passed: 5, warnings: 2, errors: 1, rules: [], validatedAt: "2026-01-01T00:00:00Z" } }),
    );
    vi.mocked(reqRepo.findById).mockResolvedValue(makeRequirement({ id: "req-000001", status: "approved" }));
    vi.mocked(fs.exists).mockResolvedValue(false);
    const result = await getSpecificationStatus("/tmp", "spec-000001");
    expect(result.designValidation).toEqual({ passed: 5, warnings: 2, errors: 1 });
  });

  it("returns undefined when no design validation", async () => {
    vi.mocked(specRepo.findByIdOrThrow).mockResolvedValue(makeSpecification({ id: "spec-000001", requirementId: "req-000001" }));
    vi.mocked(reqRepo.findById).mockResolvedValue(makeRequirement({ id: "req-000001", status: "approved" }));
    vi.mocked(fs.exists).mockResolvedValue(false);
    const result = await getSpecificationStatus("/tmp", "spec-000001");
    expect(result.designValidation).toBeUndefined();
  });

  it("no tasks: coverageStatus is not-covered", async () => {
    vi.mocked(specRepo.findByIdOrThrow).mockResolvedValue(makeSpecification({ id: "spec-000001", requirementId: "req-000001" }));
    vi.mocked(reqRepo.findById).mockResolvedValue(makeRequirement({ id: "req-000001", status: "approved" }));
    vi.mocked(fs.exists).mockResolvedValue(false);
    const result = await getSpecificationStatus("/tmp", "spec-000001");
    expect(result.coverageStatus).toBe("not-covered");
    expect(result.issueProgress).toEqual({ total: 0, completed: 0 });
  });

  it("all tasks closed: coverageStatus is covered", async () => {
    vi.mocked(specRepo.findByIdOrThrow).mockResolvedValue(makeSpecification({ id: "spec-000001", requirementId: "req-000001" }));
    vi.mocked(reqRepo.findById).mockResolvedValue(makeRequirement({ id: "req-000001", status: "approved" }));
    mockReadYAML([
      makeTaskEntry({ number: 1, status: "closed", linkedTo: { specifications: ["spec-000001"] } }),
      makeTaskEntry({ number: 2, status: "closed", linkedTo: { specifications: ["spec-000001"] } }),
    ]);
    const result = await getSpecificationStatus("/tmp", "spec-000001");
    expect(result.coverageStatus).toBe("covered");
    expect(result.issueProgress).toEqual({ total: 2, completed: 2 });
  });

  it("some tasks open: coverageStatus is partial", async () => {
    vi.mocked(specRepo.findByIdOrThrow).mockResolvedValue(makeSpecification({ id: "spec-000001", requirementId: "req-000001" }));
    vi.mocked(reqRepo.findById).mockResolvedValue(makeRequirement({ id: "req-000001", status: "approved" }));
    mockReadYAML([
      makeTaskEntry({ number: 1, status: "closed", linkedTo: { specifications: ["spec-000001"] } }),
      makeTaskEntry({ number: 2, status: "open", linkedTo: { specifications: ["spec-000001"] } }),
    ]);
    const result = await getSpecificationStatus("/tmp", "spec-000001");
    expect(result.coverageStatus).toBe("partial");
    expect(result.issueProgress).toEqual({ total: 2, completed: 1 });
  });

  it("parent requirement not found returns null", async () => {
    vi.mocked(specRepo.findByIdOrThrow).mockResolvedValue(makeSpecification({ id: "spec-000001", requirementId: "req-999999" }));
    vi.mocked(reqRepo.findById).mockResolvedValue(null);
    vi.mocked(fs.exists).mockResolvedValue(false);
    const result = await getSpecificationStatus("/tmp", "spec-000001");
    expect(result.requirement).toBeNull();
  });

  it("tasks linked to other specs are not counted", async () => {
    vi.mocked(specRepo.findByIdOrThrow).mockResolvedValue(makeSpecification({ id: "spec-000001", requirementId: "req-000001" }));
    vi.mocked(reqRepo.findById).mockResolvedValue(makeRequirement({ id: "req-000001", status: "approved" }));
    mockReadYAML([
      makeTaskEntry({ number: 1, status: "closed", linkedTo: { specifications: ["spec-000001"] } }),
      makeTaskEntry({ number: 2, status: "open", linkedTo: { specifications: ["spec-000099"] } }),
    ]);
    const result = await getSpecificationStatus("/tmp", "spec-000001");
    expect(result.issueProgress.total).toBe(1);
    expect(result.issueProgress.completed).toBe(1);
    expect(result.coverageStatus).toBe("covered");
  });
});
