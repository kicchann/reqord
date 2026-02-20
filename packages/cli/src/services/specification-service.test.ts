import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Requirement, Specification } from "@reqord/shared";

// Mock repositories (shared dependencies)
vi.mock("../repositories/specification.js", () => ({
  save: vi.fn(),
  findById: vi.fn(),
  findByIdOrThrow: vi.fn(),
  findAll: vi.fn(),
  deleteById: vi.fn(),
  saveFile: vi.fn(),
  loadFile: vi.fn(),
  ensureSpecDir: vi.fn(),
}));

vi.mock("../repositories/requirement.js", () => ({
  findById: vi.fn(),
  findByIdOrThrow: vi.fn(),
}));

vi.mock("../utils/id-generator.js", () => ({
  generateNextSpecId: vi.fn(),
}));

vi.mock("../utils/templates.js", () => ({
  loadProjectTemplate: vi.fn(),
  DEFAULT_SPECIFICATION_DESIGN_TEMPLATE: "# {{id}} - Design\n\n## 対象要件: {{requirementId}}\n",
}));

import * as specRepo from "../repositories/specification.js";
import * as reqRepo from "../repositories/requirement.js";
import { generateNextSpecId } from "../utils/id-generator.js";
import { loadProjectTemplate } from "../utils/templates.js";
import {
  createSpecification,
  listSpecifications,
  showSpecification,
  updateSpecDesign,
  checkSpecApprovalPrerequisites,
  updateSpecificationStatus,
  updateSpecification,
  hasSpecMetadataChanges,
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
    version: "1.0",
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
    const mockReq = makeRequirement();
    mockReqRepo.findByIdOrThrow.mockResolvedValue(mockReq);
    mockGenerateNextSpecId.mockResolvedValue("spec-000010");
    mockLoadProjectTemplate.mockResolvedValue(null);

    const result = await createSpecification("/cwd", { requirementId: "req-000001" });

    expect(result.specification.id).toBe("spec-000010");
    expect(result.specification.requirementId).toBe("req-000001");
    expect(result.specification.status).toBe("draft");
    expect(result.specification.version).toBe("1.0");
    expect(mockSpecRepo.save).toHaveBeenCalled();
    expect(mockSpecRepo.saveFile).toHaveBeenCalledWith(
      "/cwd",
      "spec-000010",
      "design.md",
      expect.stringContaining("spec-000010")
    );
  });

  it("title未指定時はRequirementのtitleをデフォルト値として使用する", async () => {
    const mockReq = makeRequirement({ title: "要件タイトル" });
    mockReqRepo.findByIdOrThrow.mockResolvedValue(mockReq);
    mockGenerateNextSpecId.mockResolvedValue("spec-000010");
    mockLoadProjectTemplate.mockResolvedValue(null);

    const result = await createSpecification("/cwd", { requirementId: "req-000001" });

    expect(result.specification.title).toBe("要件タイトル");
  });

  it("title指定時はその値を使用する", async () => {
    const mockReq = makeRequirement({ title: "要件タイトル" });
    mockReqRepo.findByIdOrThrow.mockResolvedValue(mockReq);
    mockGenerateNextSpecId.mockResolvedValue("spec-000010");
    mockLoadProjectTemplate.mockResolvedValue(null);

    const result = await createSpecification("/cwd", {
      requirementId: "req-000001",
      title: "カスタムタイトル",
    });

    expect(result.specification.title).toBe("カスタムタイトル");
  });

  it("Requirementの現行versionがrequirementVersionに自動設定される", async () => {
    const mockReq = makeRequirement({ version: "2.1" });
    mockReqRepo.findByIdOrThrow.mockResolvedValue(mockReq);
    mockGenerateNextSpecId.mockResolvedValue("spec-000010");
    mockLoadProjectTemplate.mockResolvedValue(null);

    const result = await createSpecification("/cwd", { requirementId: "req-000001" });

    expect(result.specification.requirementVersion).toBe("2.1");
  });

  it("存在しない要件IDでエラーを投げる", async () => {
    mockReqRepo.findByIdOrThrow.mockRejectedValue(
      new Error("Requirement not found")
    );

    await expect(
      createSpecification("/cwd", { requirementId: "req-999999" })
    ).rejects.toThrow("Requirement not found");
  });

  it("テンプレートからdesign.mdを生成する", async () => {
    const mockReq = makeRequirement();
    mockReqRepo.findByIdOrThrow.mockResolvedValue(mockReq);
    mockGenerateNextSpecId.mockResolvedValue("spec-000010");
    mockLoadProjectTemplate.mockResolvedValue(
      "# {{id}}\n\n要件: {{requirementId}}\n"
    );

    await createSpecification("/cwd", { requirementId: "req-000001" });

    expect(mockSpecRepo.saveFile).toHaveBeenCalledWith(
      "/cwd",
      "spec-000010",
      "design.md",
      "# spec-000010\n\n要件: req-000001\n"
    );
  });
});

// --- Cycle 2: listSpecifications ---

describe("listSpecifications", () => {
  it("全仕様を一覧できる", async () => {
    const specs = [
      makeSpecification({ id: "spec-000001" }),
      makeSpecification({ id: "spec-000002" }),
    ];
    mockSpecRepo.findAll.mockResolvedValue(specs);

    const result = await listSpecifications("/cwd");

    expect(result).toEqual(specs);
    expect(mockSpecRepo.findAll).toHaveBeenCalledWith("/cwd");
  });

  it("statusでフィルタできる", async () => {
    const specs = [
      makeSpecification({ id: "spec-000001", status: "draft" }),
      makeSpecification({ id: "spec-000002", status: "approved" }),
    ];
    mockSpecRepo.findAll.mockResolvedValue(specs);

    const result = await listSpecifications("/cwd", { status: "draft" });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("spec-000001");
  });

  it("requirementIdでフィルタできる", async () => {
    const specs = [
      makeSpecification({ id: "spec-000001", requirementId: "req-000001" }),
      makeSpecification({ id: "spec-000002", requirementId: "req-000002" }),
      makeSpecification({ id: "spec-000003", requirementId: "req-000001" }),
    ];
    mockSpecRepo.findAll.mockResolvedValue(specs);

    const result = await listSpecifications("/cwd", { requirementId: "req-000001" });

    expect(result).toHaveLength(2);
    expect(result.map((s) => s.id)).toEqual(["spec-000001", "spec-000003"]);
  });

  it("仕様がない場合空配列を返す", async () => {
    mockSpecRepo.findAll.mockResolvedValue([]);

    const result = await listSpecifications("/cwd");

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });
});

// --- Cycle 3: showSpecification ---

describe("showSpecification", () => {
  it("仕様とファイル内容を返す", async () => {
    const spec = makeSpecification({ id: "spec-000001" });
    const design = "# Design content";
    mockSpecRepo.findByIdOrThrow.mockResolvedValue(spec);
    mockSpecRepo.loadFile.mockResolvedValue(design);

    const result = await showSpecification("/cwd", "spec-000001");

    expect(result.specification).toEqual(spec);
    expect(result.design).toBe(design);
    expect(mockSpecRepo.loadFile).toHaveBeenCalledWith(
      "/cwd",
      "spec-000001",
      "design.md"
    );
  });

  it("存在しない仕様でエラーを投げる", async () => {
    mockSpecRepo.findByIdOrThrow.mockRejectedValue(
      new Error("Specification not found")
    );

    await expect(
      showSpecification("/cwd", "spec-999999")
    ).rejects.toThrow("Specification not found");
  });
});

// --- Cycle 4: updateSpecDesign ---

describe("updateSpecDesign", () => {
  it("コンテンツ未指定時はファイルパスを返す", async () => {
    const spec = makeSpecification({ id: "spec-000001" });
    mockSpecRepo.findByIdOrThrow.mockResolvedValue(spec);

    const result = await updateSpecDesign("/cwd", "spec-000001", {});

    expect(result.updated).toBe(false);
    expect(result.filePath).toBe("specifications/spec-000001/design.md");
    expect(mockSpecRepo.saveFile).not.toHaveBeenCalled();
  });

  it("contentFileで内容を更新できる", async () => {
    const spec = makeSpecification({
      id: "spec-000001",
      updatedAt: "2025-01-01T00:00:00.000Z",
    });
    mockSpecRepo.findByIdOrThrow.mockResolvedValue(spec);

    const result = await updateSpecDesign("/cwd", "spec-000001", {
      content: "# New design",
    });

    expect(result.updated).toBe(true);
    expect(mockSpecRepo.saveFile).toHaveBeenCalledWith(
      "/cwd",
      "spec-000001",
      "design.md",
      "# New design"
    );
    expect(mockSpecRepo.save).toHaveBeenCalledWith(
      "/cwd",
      expect.objectContaining({
        id: "spec-000001",
        updatedAt: expect.not.stringContaining("2025-01-01T00:00:00.000Z"),
      })
    );
  });

  it("存在しない仕様でエラーを投げる", async () => {
    mockSpecRepo.findByIdOrThrow.mockRejectedValue(
      new Error("Specification not found")
    );

    await expect(
      updateSpecDesign("/cwd", "spec-999999", { content: "new" })
    ).rejects.toThrow("Specification not found");
  });
});

// --- Cycle 5: checkSpecApprovalPrerequisites ---

describe("checkSpecApprovalPrerequisites", () => {
  it("Specificationがdraftで関連Requirementがapprovedで設計済みの場合は成功", async () => {
    const spec = makeSpecification({ status: "draft" });
    const req = makeRequirement({ id: "req-000001", status: "approved" });
    mockSpecRepo.findByIdOrThrow.mockResolvedValue(spec);
    mockReqRepo.findById.mockResolvedValue(req);
    mockSpecRepo.loadFile.mockResolvedValue("# Design content");

    const result = await checkSpecApprovalPrerequisites("/cwd", "spec-000001");

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("Specificationがdraft以外の場合はエラー", async () => {
    const spec = makeSpecification({ status: "approved" });
    const req = makeRequirement({ status: "approved" });
    mockSpecRepo.findByIdOrThrow.mockResolvedValue(spec);
    mockReqRepo.findById.mockResolvedValue(req);
    mockSpecRepo.loadFile.mockResolvedValue("# Design");

    const result = await checkSpecApprovalPrerequisites("/cwd", "spec-000001");

    expect(result.ok).toBe(false);
    expect(result.errors).toContain(`Specification status is not "draft" (current: approved)`);
  });

  it("関連Requirementがapprovedの場合は成功", async () => {
    const spec = makeSpecification({ status: "draft" });
    const req = makeRequirement({ status: "approved" });
    mockSpecRepo.findByIdOrThrow.mockResolvedValue(spec);
    mockReqRepo.findById.mockResolvedValue(req);
    mockSpecRepo.loadFile.mockResolvedValue("# Design");

    const result = await checkSpecApprovalPrerequisites("/cwd", "spec-000001");

    expect(result.ok).toBe(true);
  });

  it("関連Requirementがimplementedの場合は成功", async () => {
    const spec = makeSpecification({ status: "draft" });
    const req = makeRequirement({ status: "implemented" });
    mockSpecRepo.findByIdOrThrow.mockResolvedValue(spec);
    mockReqRepo.findById.mockResolvedValue(req);
    mockSpecRepo.loadFile.mockResolvedValue("# Design");

    const result = await checkSpecApprovalPrerequisites("/cwd", "spec-000001");

    expect(result.ok).toBe(true);
  });

  it("関連Requirementがdraftの場合はエラー", async () => {
    const spec = makeSpecification({ status: "draft" });
    const req = makeRequirement({ status: "draft" });
    mockSpecRepo.findByIdOrThrow.mockResolvedValue(spec);
    mockReqRepo.findById.mockResolvedValue(req);
    mockSpecRepo.loadFile.mockResolvedValue("# Design");

    const result = await checkSpecApprovalPrerequisites("/cwd", "spec-000001");

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("Related requirement req-000001 is not approved (current: draft)");
  });

  it("design.mdがテンプレートのままの場合はエラー", async () => {
    const spec = makeSpecification({ status: "draft" });
    const req = makeRequirement({ status: "approved" });
    mockSpecRepo.findByIdOrThrow.mockResolvedValue(spec);
    mockReqRepo.findById.mockResolvedValue(req);
    mockSpecRepo.loadFile.mockResolvedValue("# {{id}} - Design");

    const result = await checkSpecApprovalPrerequisites("/cwd", "spec-000001");

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("design.md still contains template placeholders. Please edit and write the design content.");
  });

  it("design.mdがnullの場合はエラー", async () => {
    const spec = makeSpecification({ status: "draft" });
    const req = makeRequirement({ status: "approved" });
    mockSpecRepo.findByIdOrThrow.mockResolvedValue(spec);
    mockReqRepo.findById.mockResolvedValue(req);
    mockSpecRepo.loadFile.mockResolvedValue(null);

    const result = await checkSpecApprovalPrerequisites("/cwd", "spec-000001");

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("design.md does not exist or could not be read. Create design.md and write the design content.");
  });

  it("design.mdが空白のみの場合はエラー", async () => {
    const spec = makeSpecification({ status: "draft" });
    const req = makeRequirement({ status: "approved" });
    mockSpecRepo.findByIdOrThrow.mockResolvedValue(spec);
    mockReqRepo.findById.mockResolvedValue(req);
    mockSpecRepo.loadFile.mockResolvedValue("   \n  ");

    const result = await checkSpecApprovalPrerequisites("/cwd", "spec-000001");

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("design.md is empty. Please write the design content.");
  });

  it("関連Requirementが見つからない場合はエラー", async () => {
    const spec = makeSpecification({ status: "draft" });
    mockSpecRepo.findByIdOrThrow.mockResolvedValue(spec);
    mockReqRepo.findById.mockResolvedValue(null);
    mockSpecRepo.loadFile.mockResolvedValue("# Design");

    const result = await checkSpecApprovalPrerequisites("/cwd", "spec-000001");

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("Related requirement req-000001 not found");
  });

  it("Specificationが存在しない場合はエラーをthrow", async () => {
    mockSpecRepo.findByIdOrThrow.mockRejectedValue(new Error("Specification not found"));

    await expect(
      checkSpecApprovalPrerequisites("/cwd", "spec-999999")
    ).rejects.toThrow("Specification not found");
  });
});

// --- Cycle 6: updateSpecificationStatus ---

describe("updateSpecificationStatus", () => {
  it("ステータスのみ変更でバージョン据え置き", async () => {
    const before = makeSpecification({
      status: "draft",
      version: "1.2",
    });
    mockSpecRepo.findByIdOrThrow.mockResolvedValue(before);

    const result = await updateSpecificationStatus("/cwd", "spec-000001", "approved");

    expect(result.before.version).toBe("1.2");
    expect(result.after.version).toBe("1.2");
    expect(result.after.status).toBe("approved");
    expect(result.after.versionHistory).toHaveLength(0); // no version change = no history entry
  });

  it("バージョンがすでに高い場合でもステータス変更のみならバージョン据え置き", async () => {
    const before = makeSpecification({ status: "draft", version: "5.0" });
    mockSpecRepo.findByIdOrThrow.mockResolvedValue(before);

    const result = await updateSpecificationStatus("/cwd", "spec-000001", "approved");

    expect(result.after.version).toBe("5.0");
  });

  it("invalid transition: draft → implemented でエラー", async () => {
    const before = makeSpecification({ status: "draft" });
    mockSpecRepo.findByIdOrThrow.mockResolvedValue(before);

    await expect(
      updateSpecificationStatus("/cwd", "spec-000001", "implemented")
    ).rejects.toThrow(/Invalid status transition/);
  });

  it("invalid transition: implemented → approved でエラー", async () => {
    const before = makeSpecification({ status: "implemented" });
    mockSpecRepo.findByIdOrThrow.mockResolvedValue(before);

    await expect(
      updateSpecificationStatus("/cwd", "spec-000001", "approved")
    ).rejects.toThrow(/Invalid status transition/);
  });

  it("Specificationが存在しない場合はエラー", async () => {
    mockSpecRepo.findByIdOrThrow.mockRejectedValue(new Error("Specification not found"));

    await expect(
      updateSpecificationStatus("/cwd", "spec-999999", "approved")
    ).rejects.toThrow("Specification not found");
  });

  it("saveが呼ばれる", async () => {
    const before = makeSpecification({ status: "draft" });
    mockSpecRepo.findByIdOrThrow.mockResolvedValue(before);

    await updateSpecificationStatus("/cwd", "spec-000001", "approved");

    expect(mockSpecRepo.save).toHaveBeenCalledWith(
      "/cwd",
      expect.objectContaining({ status: "approved" })
    );
  });

  it("updatedAtが更新される", async () => {
    const before = makeSpecification({
      status: "draft",
      version: "1.0",
      updatedAt: "2025-01-01T00:00:00.000Z",
    });
    mockSpecRepo.findByIdOrThrow.mockResolvedValue(before);

    const result = await updateSpecificationStatus("/cwd", "spec-000001", "approved");

    expect(result.after.updatedAt).not.toBe(before.updatedAt);
  });
});

// --- Cycle 7: hasSpecMetadataChanges ---

describe("hasSpecMetadataChanges", () => {
  it("supplementary追加を検出", () => {
    const before = makeSpecification({ files: { design: "d.md", supplementary: [] } });
    const after = makeSpecification({ files: { design: "d.md", supplementary: ["new.md"] } });
    expect(hasSpecMetadataChanges(before, after)).toBe(true);
  });

  it("supplementary削除を検出", () => {
    const before = makeSpecification({ files: { design: "d.md", supplementary: ["old.md"] } });
    const after = makeSpecification({ files: { design: "d.md", supplementary: [] } });
    expect(hasSpecMetadataChanges(before, after)).toBe(true);
  });

  it("designパス変更を検出", () => {
    const before = makeSpecification({ files: { design: "old.md", supplementary: [] } });
    const after = makeSpecification({ files: { design: "new.md", supplementary: [] } });
    expect(hasSpecMetadataChanges(before, after)).toBe(true);
  });

  it("status変更は検出しない（内容変更ではない）", () => {
    const before = makeSpecification({ status: "draft" });
    const after = makeSpecification({ status: "approved" });
    expect(hasSpecMetadataChanges(before, after)).toBe(false);
  });

  it("flags変更は検出しない", () => {
    const before = makeSpecification({ flags: [] });
    const after = makeSpecification({
      flags: [
        {
          type: "feedback-review",
          reason: "test",
          createdAt: "2026-01-01T00:00:00Z",
          relatedIssues: [],
          severity: "medium",
        },
      ],
    });
    expect(hasSpecMetadataChanges(before, after)).toBe(false);
  });

  it("currentApproval変更は検出しない", () => {
    const before = makeSpecification({ currentApproval: undefined });
    const after = makeSpecification({
      currentApproval: {
        version: "1.0",
        phase: "specification",
        prNumber: 123,
        prUrl: "https://github.com/user/repo/pull/123",
        approvedBy: ["user1"],
      },
    });
    expect(hasSpecMetadataChanges(before, after)).toBe(false);
  });

  it("updatedAt変更は検出しない", () => {
    const before = makeSpecification({ updatedAt: "2025-01-01T00:00:00.000Z" });
    const after = makeSpecification({ updatedAt: "2025-01-02T00:00:00.000Z" });
    expect(hasSpecMetadataChanges(before, after)).toBe(false);
  });

  it("versionHistory変更は検出しない", () => {
    const before = makeSpecification({ versionHistory: [] });
    const after = makeSpecification({
      versionHistory: [
        {
          version: "1.0",
          status: "draft",
          gitCommit: "abc123",
          changedAt: "2025-01-01T00:00:00.000Z",
          summary: "test",
        },
      ],
    });
    expect(hasSpecMetadataChanges(before, after)).toBe(false);
  });

  it("変更なしの場合はfalse", () => {
    const spec = makeSpecification();
    expect(hasSpecMetadataChanges(spec, spec)).toBe(false);
  });
});

// --- Cycle 8: updateSpecification ---

describe("updateSpecification", () => {
  it("パッチデータでsupplementaryを更新（バージョン据え置き）", async () => {
    const before = makeSpecification({
      version: "1.0",
      files: { design: "d.md", supplementary: ["old.md"] },
    });
    mockSpecRepo.findByIdOrThrow.mockResolvedValue(before);

    const result = await updateSpecification("/cwd", "spec-000001", {
      patchData: { files: { design: "d.md", supplementary: ["old.md", "new.md"] } },
    });

    expect(result.after.files.supplementary).toEqual(["old.md", "new.md"]);
    expect(result.after.version).toBe("1.0"); // no auto-bump
  });

  it("ステータスのみ変更でバージョン据え置き", async () => {
    const before = makeSpecification({ status: "draft", version: "1.2" });
    mockSpecRepo.findByIdOrThrow.mockResolvedValue(before);

    const result = await updateSpecification("/cwd", "spec-000001", {
      status: "approved",
    });

    expect(result.after.status).toBe("approved");
    expect(result.after.version).toBe("1.2");
  });

  it("不正な状態遷移でエラー", async () => {
    const before = makeSpecification({ status: "draft" });
    mockSpecRepo.findByIdOrThrow.mockResolvedValue(before);

    await expect(
      updateSpecification("/cwd", "spec-000001", { status: "implemented" })
    ).rejects.toThrow(/Invalid status transition/);
  });

  it("明示的majorバンプ指定", async () => {
    const before = makeSpecification({ version: "1.2" });
    mockSpecRepo.findByIdOrThrow.mockResolvedValue(before);

    const result = await updateSpecification("/cwd", "spec-000001", {
      versionBump: "major",
    });

    expect(result.after.version).toBe("2.0");
  });

  it("明示的patchバンプ指定", async () => {
    const before = makeSpecification({ version: "1.2" });
    mockSpecRepo.findByIdOrThrow.mockResolvedValue(before);

    const result = await updateSpecification("/cwd", "spec-000001", {
      versionBump: "patch",
    });

    expect(result.after.version).toBe("1.3");
  });

  it("design.md更新でもバージョン据え置き（自動バンプ廃止）", async () => {
    const before = makeSpecification({
      version: "1.0",
      files: { design: "d.md", supplementary: [] },
    });
    mockSpecRepo.findByIdOrThrow.mockResolvedValue(before);

    const result = await updateSpecification("/cwd", "spec-000001", {
      designContent: "# New design",
    });

    expect(mockSpecRepo.saveFile).toHaveBeenCalledWith(
      "/cwd",
      "spec-000001",
      "design.md",
      "# New design"
    );
    expect(result.after.version).toBe("1.0");
  });

  it("versionBumpなしではversionHistoryに追加しない", async () => {
    const before = makeSpecification({ version: "1.0", versionHistory: [] });
    mockSpecRepo.findByIdOrThrow.mockResolvedValue(before);

    const result = await updateSpecification("/cwd", "spec-000001", {
      patchData: { files: { design: "specifications/spec-000001/design.md", supplementary: ["new.md"] } },
    });

    expect(result.after.versionHistory).toHaveLength(0); // no version change = no history entry
  });

  it("ステータス+内容変更でバージョン据え置き（自動判定廃止）", async () => {
    const before = makeSpecification({
      status: "draft",
      version: "1.0",
      files: { design: "d.md", supplementary: [] },
    });
    mockSpecRepo.findByIdOrThrow.mockResolvedValue(before);

    const result = await updateSpecification("/cwd", "spec-000001", {
      status: "approved",
      patchData: { files: { design: "d.md", supplementary: ["new.md"] } },
    });

    expect(result.after.status).toBe("approved");
    expect(result.after.version).toBe("1.0");
  });

  it("明示的バージョン指定でバージョンアップ", async () => {
    const before = makeSpecification({
      version: "1.0",
      files: { design: "d.md", supplementary: [] },
    });
    mockSpecRepo.findByIdOrThrow.mockResolvedValue(before);

    const result = await updateSpecification("/cwd", "spec-000001", {
      patchData: { files: { design: "d.md", supplementary: ["new.md"] } },
      versionBump: "major",
    });

    expect(result.after.version).toBe("2.0");
  });

  it("updatedAtが更新される", async () => {
    const before = makeSpecification({ updatedAt: "2025-01-01T00:00:00.000Z" });
    mockSpecRepo.findByIdOrThrow.mockResolvedValue(before);

    const result = await updateSpecification("/cwd", "spec-000001", {
      status: "approved",
    });

    expect(result.after.updatedAt).not.toBe(before.updatedAt);
  });

  it("saveが呼ばれる", async () => {
    const before = makeSpecification();
    mockSpecRepo.findByIdOrThrow.mockResolvedValue(before);

    await updateSpecification("/cwd", "spec-000001", { status: "approved" });

    expect(mockSpecRepo.save).toHaveBeenCalledWith(
      "/cwd",
      expect.objectContaining({ status: "approved" })
    );
  });

  it("無効なステータス遷移の場合はエラー", async () => {
    const before = makeSpecification({ status: "draft" });
    mockSpecRepo.findByIdOrThrow.mockResolvedValue(before);

    await expect(
      updateSpecification("/cwd", "spec-000001", { status: "implemented" })
    ).rejects.toThrow(/Invalid status transition: draft → implemented/);
  });

  it("ステータスのみ変更（versionBumpなし）ではversionHistoryに追加しない", async () => {
    const existingHistory = [
      {
        version: "1.0",
        status: "draft" as const,
        gitCommit: "abc123",
        changedAt: "2025-01-01T00:00:00.000Z",
        summary: "initial",
      },
    ];
    const before = makeSpecification({
      status: "draft",
      version: "1.0",
      versionHistory: existingHistory,
    });
    mockSpecRepo.findByIdOrThrow.mockResolvedValue(before);

    const result = await updateSpecification("/cwd", "spec-000001", {
      status: "approved",
    });

    expect(result.after.versionHistory).toHaveLength(1);
    expect(result.after.version).toBe("1.0");
    expect(result.versionChanged).toBe(false);
  });

  it("versionBump指定時はversionHistoryにエントリを追加する", async () => {
    const before = makeSpecification({
      version: "1.0",
      versionHistory: [],
    });
    mockSpecRepo.findByIdOrThrow.mockResolvedValue(before);

    const result = await updateSpecification("/cwd", "spec-000001", {
      versionBump: "major",
    });

    expect(result.after.versionHistory).toHaveLength(1);
    expect(result.after.versionHistory[0].version).toBe("2.0");
    expect(result.after.version).toBe("2.0");
    expect(result.versionChanged).toBe(true);
  });
});
