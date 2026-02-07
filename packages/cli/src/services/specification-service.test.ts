import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Requirement, Specification } from "@reqord/shared";

// Mock repositories (shared dependencies)
vi.mock("../repositories/specification.js", () => ({
  save: vi.fn(),
  findById: vi.fn(),
  findAll: vi.fn(),
  deleteById: vi.fn(),
  saveFile: vi.fn(),
  loadFile: vi.fn(),
  ensureSpecDir: vi.fn(),
}));

vi.mock("../repositories/requirement.js", () => ({
  findById: vi.fn(),
}));

vi.mock("../utils/spec-id-generator.js", () => ({
  generateNextSpecId: vi.fn(),
}));

vi.mock("../utils/templates.js", () => ({
  loadProjectTemplate: vi.fn(),
  DEFAULT_SPECIFICATION_RESEARCH_TEMPLATE: "# {{id}} - Research\n\n## 対象要件: {{requirementId}}\n",
  DEFAULT_SPECIFICATION_DESIGN_TEMPLATE: "# {{id}} - Design\n\n## 対象要件: {{requirementId}}\n",
  DEFAULT_SPECIFICATION_ARCHITECTURE_TEMPLATE: "graph TD\n    A[{{id}}]\n",
}));

import * as specRepo from "../repositories/specification.js";
import * as reqRepo from "../repositories/requirement.js";
import { generateNextSpecId } from "../utils/spec-id-generator.js";
import { loadProjectTemplate } from "../utils/templates.js";
import {
  createSpecification,
  listSpecifications,
  showSpecification,
  updateSpecResearch,
  updateSpecDesign,
} from "./specification-service.js";

const mockSpecRepo = vi.mocked(specRepo);
const mockReqRepo = vi.mocked(reqRepo);
const mockGenerateNextSpecId = vi.mocked(generateNextSpecId);
const mockLoadProjectTemplate = vi.mocked(loadProjectTemplate);

function makeRequirement(overrides: Partial<Requirement> = {}): Requirement {
  return {
    id: "req-000001",
    version: "1.0.0",
    title: "Test Requirement",
    status: "draft",
    priority: "medium",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    versionHistory: [],
    files: { description: "requirements/req-000001/description.md" },
    successCriteria: [],
    format: { type: "free-form" },
    dependencies: { blockedBy: [], blocks: [], relatedTo: [] },
    ...overrides,
  };
}

function makeSpecification(overrides: Partial<Specification> = {}): Specification {
  return {
    id: "spec-000001",
    requirementId: "req-000001",
    version: "1.0.0",
    status: "draft",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    versionHistory: [],
    files: {
      research: "specifications/spec-000001/research.md",
      design: "specifications/spec-000001/design.md",
      architecture: "specifications/spec-000001/architecture.mmd",
      examples: [],
    },
    requirementCoverage: {
      "req-000001": { status: "not-covered" },
    },
    technicalDecisions: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// --- Cycle 1: createSpecification ---

describe("createSpecification", () => {
  it("要件に紐づくSpecificationを生成する", async () => {
    mockReqRepo.findById.mockResolvedValue(makeRequirement());
    mockGenerateNextSpecId.mockResolvedValue("spec-000001");
    mockLoadProjectTemplate.mockResolvedValue(null);

    const result = await createSpecification("/cwd", {
      requirementId: "req-000001",
    });

    expect(result.specification.requirementId).toBe("req-000001");
    expect(result.specification.status).toBe("draft");
    expect(result.specification.version).toBe("1.0.0");
    expect(result.specification.files.research).toBe(
      "specifications/spec-000001/research.md",
    );
    expect(result.specification.files.design).toBe(
      "specifications/spec-000001/design.md",
    );
    expect(result.specification.files.architecture).toBe(
      "specifications/spec-000001/architecture.mmd",
    );
    expect(result.specification.requirementCoverage).toEqual({
      "req-000001": { status: "not-covered" },
    });
  });

  it("存在しない要件IDでエラーを投げる", async () => {
    mockReqRepo.findById.mockResolvedValue(null);

    await expect(
      createSpecification("/cwd", { requirementId: "req-999999" }),
    ).rejects.toThrow("Requirement req-999999 not found.");
  });

  it("complexityとestimatedHoursを指定して作成できる", async () => {
    mockReqRepo.findById.mockResolvedValue(makeRequirement());
    mockGenerateNextSpecId.mockResolvedValue("spec-000001");
    mockLoadProjectTemplate.mockResolvedValue(null);

    const result = await createSpecification("/cwd", {
      requirementId: "req-000001",
      complexity: "M",
      estimatedHours: 8,
    });

    expect(result.specification.complexity).toBe("M");
    expect(result.specification.estimatedHours).toBe(8);
  });

  it("テンプレートからresearch.md/design.md/architecture.mmdを生成する", async () => {
    mockReqRepo.findById.mockResolvedValue(makeRequirement());
    mockGenerateNextSpecId.mockResolvedValue("spec-000001");
    mockLoadProjectTemplate.mockResolvedValue(null);

    await createSpecification("/cwd", { requirementId: "req-000001" });

    // Communication-based: saveFile is a Command (external write)
    expect(mockSpecRepo.saveFile).toHaveBeenCalledWith(
      "/cwd",
      "spec-000001",
      "research.md",
      expect.stringContaining("spec-000001"),
    );
    expect(mockSpecRepo.saveFile).toHaveBeenCalledWith(
      "/cwd",
      "spec-000001",
      "design.md",
      expect.stringContaining("spec-000001"),
    );
    expect(mockSpecRepo.saveFile).toHaveBeenCalledWith(
      "/cwd",
      "spec-000001",
      "architecture.mmd",
      expect.stringContaining("spec-000001"),
    );
  });
});

// --- Cycle 2: listSpecifications ---

describe("listSpecifications", () => {
  it("全仕様を一覧できる", async () => {
    const specs = [
      makeSpecification({ id: "spec-000001" }),
      makeSpecification({ id: "spec-000002", requirementId: "req-000002" }),
    ];
    mockSpecRepo.findAll.mockResolvedValue(specs);

    const result = await listSpecifications("/cwd");

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("spec-000001");
    expect(result[1].id).toBe("spec-000002");
  });

  it("statusでフィルタできる", async () => {
    const specs = [
      makeSpecification({ id: "spec-000001", status: "draft" }),
      makeSpecification({ id: "spec-000002", status: "approved" }),
    ];
    mockSpecRepo.findAll.mockResolvedValue(specs);

    const result = await listSpecifications("/cwd", { status: "draft" });

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("draft");
  });

  it("requirementIdでフィルタできる", async () => {
    const specs = [
      makeSpecification({ id: "spec-000001", requirementId: "req-000001" }),
      makeSpecification({ id: "spec-000002", requirementId: "req-000002" }),
    ];
    mockSpecRepo.findAll.mockResolvedValue(specs);

    const result = await listSpecifications("/cwd", {
      requirementId: "req-000001",
    });

    expect(result).toHaveLength(1);
    expect(result[0].requirementId).toBe("req-000001");
  });

  it("仕様がない場合空配列を返す", async () => {
    mockSpecRepo.findAll.mockResolvedValue([]);

    const result = await listSpecifications("/cwd");

    expect(result).toEqual([]);
  });
});

// --- Cycle 3: showSpecification ---

describe("showSpecification", () => {
  it("仕様とファイル内容を返す", async () => {
    const spec = makeSpecification();
    mockSpecRepo.findById.mockResolvedValue(spec);
    mockSpecRepo.loadFile.mockImplementation(
      async (_cwd: string, _id: string, filename: string) => {
        if (filename === "research.md") return "# Research content";
        if (filename === "design.md") return "# Design content";
        if (filename === "architecture.mmd") return "graph TD";
        return null;
      },
    );

    const result = await showSpecification("/cwd", "spec-000001");

    expect(result.specification.id).toBe("spec-000001");
    expect(result.research).toBe("# Research content");
    expect(result.design).toBe("# Design content");
    expect(result.architecture).toBe("graph TD");
  });

  it("存在しない仕様でエラーを投げる", async () => {
    mockSpecRepo.findById.mockResolvedValue(null);

    await expect(
      showSpecification("/cwd", "spec-999999"),
    ).rejects.toThrow("Specification spec-999999 not found.");
  });
});

// --- Cycle 4: updateSpecResearch ---

describe("updateSpecResearch", () => {
  it("コンテンツ未指定時はファイルパスを返す", async () => {
    const spec = makeSpecification();
    mockSpecRepo.findById.mockResolvedValue(spec);

    const result = await updateSpecResearch("/cwd", "spec-000001");

    expect(result.filePath).toBe("specifications/spec-000001/research.md");
    expect(result.updated).toBe(false);
  });

  it("contentFileで内容を更新できる", async () => {
    const spec = makeSpecification();
    mockSpecRepo.findById.mockResolvedValue(spec);

    const result = await updateSpecResearch("/cwd", "spec-000001", {
      content: "# Updated research",
    });

    expect(result.updated).toBe(true);
    // Communication-based: saveFile is a Command (external write)
    expect(mockSpecRepo.saveFile).toHaveBeenCalledWith(
      "/cwd",
      "spec-000001",
      "research.md",
      "# Updated research",
    );
    // updatedAt should be updated
    expect(mockSpecRepo.save).toHaveBeenCalledWith(
      "/cwd",
      expect.objectContaining({
        id: "spec-000001",
        updatedAt: expect.any(String),
      }),
    );
  });

  it("存在しない仕様でエラーを投げる", async () => {
    mockSpecRepo.findById.mockResolvedValue(null);

    await expect(
      updateSpecResearch("/cwd", "spec-999999"),
    ).rejects.toThrow("Specification spec-999999 not found.");
  });
});

// --- Cycle 5: updateSpecDesign ---

describe("updateSpecDesign", () => {
  it("コンテンツ未指定時はファイルパスを返す", async () => {
    const spec = makeSpecification();
    mockSpecRepo.findById.mockResolvedValue(spec);

    const result = await updateSpecDesign("/cwd", "spec-000001");

    expect(result.filePath).toBe("specifications/spec-000001/design.md");
    expect(result.updated).toBe(false);
  });

  it("contentFileで内容を更新できる", async () => {
    const spec = makeSpecification();
    mockSpecRepo.findById.mockResolvedValue(spec);

    const result = await updateSpecDesign("/cwd", "spec-000001", {
      content: "# Updated design",
    });

    expect(result.updated).toBe(true);
    expect(mockSpecRepo.saveFile).toHaveBeenCalledWith(
      "/cwd",
      "spec-000001",
      "design.md",
      "# Updated design",
    );
    expect(mockSpecRepo.save).toHaveBeenCalledWith(
      "/cwd",
      expect.objectContaining({
        id: "spec-000001",
        updatedAt: expect.any(String),
      }),
    );
  });

  it("存在しない仕様でエラーを投げる", async () => {
    mockSpecRepo.findById.mockResolvedValue(null);

    await expect(
      updateSpecDesign("/cwd", "spec-999999"),
    ).rejects.toThrow("Specification spec-999999 not found.");
  });
});
