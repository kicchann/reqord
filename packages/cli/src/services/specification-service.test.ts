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
  DEFAULT_SPECIFICATION_DESIGN_TEMPLATE: "# {{id}} - Design\n\n## 対象要件: {{requirementId}}\n",
}));

import * as specRepo from "../repositories/specification.js";
import * as reqRepo from "../repositories/requirement.js";
import { generateNextSpecId } from "../utils/spec-id-generator.js";
import { loadProjectTemplate } from "../utils/templates.js";
import {
  createSpecification,
  listSpecifications,
  showSpecification,
  updateSpecDesign,
  checkSpecApprovalPrerequisites,
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
    files: { description: "requirements/req-000001/description.md", supplementary: [] },
    successCriteria: [],
    format: { type: "free-form" },
    dependencies: { blockedBy: [], blocks: [], relatedTo: [] },
    flags: [],
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
      design: "specifications/spec-000001/design.md",
      supplementary: [],
    },
    flags: [],
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
    expect(result.specification.files.design).toBe(
      "specifications/spec-000001/design.md",
    );
    expect(result.specification.files.supplementary).toEqual([]);
  });

  it("存在しない要件IDでエラーを投げる", async () => {
    mockReqRepo.findById.mockResolvedValue(null);

    await expect(
      createSpecification("/cwd", { requirementId: "req-999999" }),
    ).rejects.toThrow("Requirement req-999999 not found.");
  });

  it("テンプレートからdesign.mdを生成する", async () => {
    mockReqRepo.findById.mockResolvedValue(makeRequirement());
    mockGenerateNextSpecId.mockResolvedValue("spec-000001");
    mockLoadProjectTemplate.mockResolvedValue(null);

    await createSpecification("/cwd", { requirementId: "req-000001" });

    // Communication-based: saveFile is a Command (external write)
    expect(mockSpecRepo.saveFile).toHaveBeenCalledWith(
      "/cwd",
      "spec-000001",
      "design.md",
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
        if (filename === "design.md") return "# Design content";
        return null;
      },
    );

    const result = await showSpecification("/cwd", "spec-000001");

    expect(result.specification.id).toBe("spec-000001");
    expect(result.design).toBe("# Design content");
  });

  it("存在しない仕様でエラーを投げる", async () => {
    mockSpecRepo.findById.mockResolvedValue(null);

    await expect(
      showSpecification("/cwd", "spec-999999"),
    ).rejects.toThrow("Specification spec-999999 not found.");
  });
});

// --- Cycle 4: updateSpecDesign ---

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

// --- Cycle 5: checkSpecApprovalPrerequisites ---

describe("checkSpecApprovalPrerequisites", () => {
  it("Specificationがdraftで関連Requirementがapprovedで設計済みの場合は成功", async () => {
    mockSpecRepo.findById.mockResolvedValue(makeSpecification({ status: "draft" }));
    mockReqRepo.findById.mockResolvedValue(makeRequirement({ status: "approved" }));
    mockSpecRepo.loadFile.mockResolvedValue("# 実際の設計内容\n\n設計の詳細...");

    const result = await checkSpecApprovalPrerequisites("/cwd", "spec-000001");
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("Specificationがdraft以外の場合はエラー", async () => {
    mockSpecRepo.findById.mockResolvedValue(makeSpecification({ status: "approved" }));
    mockReqRepo.findById.mockResolvedValue(makeRequirement({ status: "approved" }));
    mockSpecRepo.loadFile.mockResolvedValue("# 設計内容");

    const result = await checkSpecApprovalPrerequisites("/cwd", "spec-000001");
    expect(result.ok).toBe(false);
    expect(result.errors).toContainEqual(expect.stringContaining("draft ではありません"));
  });

  it("関連Requirementがapprovedの場合は成功", async () => {
    // same as first test but explicit about requirement being approved
    mockSpecRepo.findById.mockResolvedValue(makeSpecification({ status: "draft" }));
    mockReqRepo.findById.mockResolvedValue(makeRequirement({ status: "approved" }));
    mockSpecRepo.loadFile.mockResolvedValue("# 設計内容");

    const result = await checkSpecApprovalPrerequisites("/cwd", "spec-000001");
    expect(result.ok).toBe(true);
  });

  it("関連Requirementがpending_approvalの場合は成功", async () => {
    mockSpecRepo.findById.mockResolvedValue(makeSpecification({ status: "draft" }));
    mockReqRepo.findById.mockResolvedValue(makeRequirement({ status: "pending_approval" }));
    mockSpecRepo.loadFile.mockResolvedValue("# 設計内容");

    const result = await checkSpecApprovalPrerequisites("/cwd", "spec-000001");
    expect(result.ok).toBe(true);
  });

  it("関連Requirementがdraftの場合はエラー", async () => {
    mockSpecRepo.findById.mockResolvedValue(makeSpecification({ status: "draft" }));
    mockReqRepo.findById.mockResolvedValue(makeRequirement({ status: "draft" }));
    mockSpecRepo.loadFile.mockResolvedValue("# 設計内容");

    const result = await checkSpecApprovalPrerequisites("/cwd", "spec-000001");
    expect(result.ok).toBe(false);
    expect(result.errors).toContainEqual(expect.stringContaining("未承認"));
  });

  it("design.mdがテンプレートのままの場合はエラー", async () => {
    mockSpecRepo.findById.mockResolvedValue(makeSpecification({ status: "draft" }));
    mockReqRepo.findById.mockResolvedValue(makeRequirement({ status: "approved" }));
    mockSpecRepo.loadFile.mockResolvedValue("# {{id}} - Design\n\n## 対象要件: {{requirementId}}\n\n## 設計概要\n\n{{設計の目的とスコープを記述}}");

    const result = await checkSpecApprovalPrerequisites("/cwd", "spec-000001");
    expect(result.ok).toBe(false);
    expect(result.errors).toContainEqual(expect.stringContaining("テンプレートのまま"));
  });

  it("design.mdがnullの場合はエラー", async () => {
    mockSpecRepo.findById.mockResolvedValue(makeSpecification({ status: "draft" }));
    mockReqRepo.findById.mockResolvedValue(makeRequirement({ status: "approved" }));
    mockSpecRepo.loadFile.mockResolvedValue(null);

    const result = await checkSpecApprovalPrerequisites("/cwd", "spec-000001");
    expect(result.ok).toBe(false);
    expect(result.errors).toContainEqual(expect.stringContaining("テンプレートのまま"));
  });

  it("Specificationが存在しない場合はエラーをthrow", async () => {
    mockSpecRepo.findById.mockResolvedValue(null);

    await expect(
      checkSpecApprovalPrerequisites("/cwd", "spec-999999")
    ).rejects.toThrow("Specification spec-999999 not found.");
  });
});
