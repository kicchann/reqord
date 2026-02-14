import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../services/impact-service.js", () => ({
  analyzeImpact: vi.fn(),
}));

import { analyzeImpact } from "../../services/impact-service.js";
import type { ImpactAnalysis } from "../../services/impact-service.js";
import { analyzeCommand } from "./analyze.js";

function makeAnalysis(overrides: Partial<ImpactAnalysis> = {}): ImpactAnalysis {
  return {
    sourceId: "req-000011",
    sourceType: "requirement",
    directImpacts: [],
    indirectImpacts: [],
    relatedSpecifications: [],
    relatedIssues: [],
    circularDependencies: [],
    analyzedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("analyzeCommand", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = 0;
    (analyzeCommand as any).args = [];
    delete (analyzeCommand as any)._optionValues.json;
    delete (analyzeCommand as any)._optionValues.depth;
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("has correct command name 'analyze'", () => {
    expect(analyzeCommand.name()).toBe("analyze");
  });

  it("has required argument 'id'", () => {
    const args = analyzeCommand.registeredArguments;
    expect(args).toHaveLength(1);
    expect(args[0].name()).toBe("id");
    expect(args[0].required).toBe(true);
  });

  it("has optional '--json' option", () => {
    const option = analyzeCommand.options.find(
      (opt) => opt.long === "--json",
    );
    expect(option).toBeDefined();
  });

  it("has optional '--depth' option", () => {
    const option = analyzeCommand.options.find(
      (opt) => opt.long === "--depth",
    );
    expect(option).toBeDefined();
  });

  it("calls analyzeImpact with correct parameters", async () => {
    vi.mocked(analyzeImpact).mockResolvedValue(makeAnalysis());

    await analyzeCommand.parseAsync(["node", "test", "req-000011"]);

    expect(analyzeImpact).toHaveBeenCalledWith(process.cwd(), "req-000011", {
      maxDepth: undefined,
    });
  });

  it("passes --depth option to analyzeImpact", async () => {
    vi.mocked(analyzeImpact).mockResolvedValue(makeAnalysis());

    await analyzeCommand.parseAsync([
      "node",
      "test",
      "req-000011",
      "--depth",
      "3",
    ]);

    expect(analyzeImpact).toHaveBeenCalledWith(process.cwd(), "req-000011", {
      maxDepth: 3,
    });
  });

  it("outputs JSON when --json option is provided", async () => {
    const analysis = makeAnalysis();
    vi.mocked(analyzeImpact).mockResolvedValue(analysis);

    await analyzeCommand.parseAsync([
      "node",
      "test",
      "req-000011",
      "--json",
    ]);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      JSON.stringify(analysis, null, 2),
    );
  });

  it("displays requirement table format with direct impacts", async () => {
    const analysis = makeAnalysis({
      directImpacts: [
        {
          id: "req-000012",
          relation: "blocks",
          depth: 1,
          path: ["req-000011", "req-000012"],
          title: "影響範囲分析",
        },
      ],
    });
    vi.mocked(analyzeImpact).mockResolvedValue(analysis);

    await analyzeCommand.parseAsync(["node", "test", "req-000011"]);

    const output = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("影響範囲分析: req-000011");
    expect(output).toContain("直接影響");
    expect(output).toContain("req-000012");
    expect(output).toContain("blocks");
  });

  it("displays indirect impacts section", async () => {
    const analysis = makeAnalysis({
      indirectImpacts: [
        {
          id: "req-000016",
          relation: "blocks",
          depth: 2,
          path: ["req-000011", "req-000015", "req-000016"],
          title: "GitHub Issue生成",
        },
      ],
    });
    vi.mocked(analyzeImpact).mockResolvedValue(analysis);

    await analyzeCommand.parseAsync(["node", "test", "req-000011"]);

    const output = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("間接影響");
    expect(output).toContain("req-000016");
    expect(output).toContain("req-000015");
  });

  it("displays related specifications section", async () => {
    const analysis = makeAnalysis({
      relatedSpecifications: [
        {
          id: "spec-000011",
          requirementId: "req-000011",
          status: "draft",
        },
      ],
    });
    vi.mocked(analyzeImpact).mockResolvedValue(analysis);

    await analyzeCommand.parseAsync(["node", "test", "req-000011"]);

    const output = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("関連Specification");
    expect(output).toContain("spec-000011");
    expect(output).toContain("draft");
  });

  it("displays related issues section", async () => {
    const analysis = makeAnalysis({
      relatedIssues: [
        {
          number: 123,
          title: "ログイン画面の実装",
          url: "https://github.com/owner/repo/issues/123",
          status: "open",
          specificationId: "spec-000011",
        },
      ],
    });
    vi.mocked(analyzeImpact).mockResolvedValue(analysis);

    await analyzeCommand.parseAsync(["node", "test", "req-000011"]);

    const output = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("関連Issue");
    expect(output).toContain("#123");
    expect(output).toContain("open");
    expect(output).toContain("ログイン画面の実装");
  });

  it("displays circular dependencies warning", async () => {
    const analysis = makeAnalysis({
      circularDependencies: [["req-000001", "req-000002", "req-000001"]],
    });
    vi.mocked(analyzeImpact).mockResolvedValue(analysis);

    await analyzeCommand.parseAsync(["node", "test", "req-000011"]);

    const output = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("循環依存");
    expect(output).toContain("req-000001");
    expect(output).toContain("req-000002");
  });

  it("displays specification source format", async () => {
    const analysis = makeAnalysis({
      sourceId: "spec-000011",
      sourceType: "specification",
      relatedSpecifications: [
        {
          id: "spec-000012",
          requirementId: "req-000011",
          status: "approved",
        },
      ],
    });
    vi.mocked(analyzeImpact).mockResolvedValue(analysis);

    await analyzeCommand.parseAsync(["node", "test", "spec-000011"]);

    const output = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("影響範囲分析: spec-000011");
    expect(output).toContain("関連Specification");
    expect(output).toContain("spec-000012");
  });

  it("shows 'なし' for empty sections", async () => {
    vi.mocked(analyzeImpact).mockResolvedValue(makeAnalysis());

    await analyzeCommand.parseAsync(["node", "test", "req-000011"]);

    const output = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("なし");
  });

  it("handles errors with error handler", async () => {
    vi.mocked(analyzeImpact).mockRejectedValue(
      new Error("Requirement req-999999 not found."),
    );

    await analyzeCommand.parseAsync(["node", "test", "req-999999"]);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("req-999999 not found"),
    );
    expect(process.exitCode).toBe(1);
  });
});
