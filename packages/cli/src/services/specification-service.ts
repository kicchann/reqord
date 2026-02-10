import type { Specification, Status, VersionHistoryEntry } from "@reqord/shared";
import { SPECIFICATIONS_DIR } from "@reqord/shared";
import * as specRepo from "../repositories/specification.js";
import * as reqRepo from "../repositories/requirement.js";
import { generateNextSpecId } from "../utils/spec-id-generator.js";
import {
  loadProjectTemplate,
  DEFAULT_SPECIFICATION_DESIGN_TEMPLATE,
} from "../utils/templates.js";
import * as versionService from "./version-service.js";

// --- Create ---

export interface CreateSpecOptions {
  requirementId: string;
}

export interface CreateSpecResult {
  specification: Specification;
}

export async function createSpecification(
  cwd: string,
  options: CreateSpecOptions,
): Promise<CreateSpecResult> {
  const requirement = await reqRepo.findById(cwd, options.requirementId);
  if (!requirement) {
    throw new Error(`Requirement ${options.requirementId} not found.`);
  }

  const id = await generateNextSpecId(cwd);
  const now = new Date().toISOString();

  const specification: Specification = {
    id,
    requirementId: options.requirementId,
    version: "1.0.0",
    status: "draft",
    createdAt: now,
    updatedAt: now,
    versionHistory: [],
    files: {
      design: `${SPECIFICATIONS_DIR}/${id}/design.md`,
      supplementary: [],
    },
    flags: [],
  };

  await specRepo.ensureSpecDir(cwd, id);
  await specRepo.save(cwd, specification);

  // Generate template files
  const designTemplate =
    (await loadProjectTemplate(cwd, "specification-design.md")) ??
    DEFAULT_SPECIFICATION_DESIGN_TEMPLATE;

  const replace = (template: string) =>
    template
      .replace(/\{\{id\}\}/g, id)
      .replace(/\{\{requirementId\}\}/g, options.requirementId);

  await specRepo.saveFile(cwd, id, "design.md", replace(designTemplate));

  return { specification };
}

// --- List ---

export interface ListSpecOptions {
  status?: Status;
  requirementId?: string;
}

export async function listSpecifications(
  cwd: string,
  options: ListSpecOptions = {},
): Promise<Specification[]> {
  let specifications = await specRepo.findAll(cwd);

  if (options.status) {
    specifications = specifications.filter((s) => s.status === options.status);
  }
  if (options.requirementId) {
    specifications = specifications.filter(
      (s) => s.requirementId === options.requirementId,
    );
  }

  return specifications;
}

// --- Show ---

export interface ShowSpecResult {
  specification: Specification;
  design: string | null;
}

export async function showSpecification(
  cwd: string,
  id: string,
): Promise<ShowSpecResult> {
  const specification = await specRepo.findById(cwd, id);
  if (!specification) {
    throw new Error(`Specification ${id} not found.`);
  }

  const design = await specRepo.loadFile(cwd, id, "design.md");

  return { specification, design };
}

// --- Update Design ---

export interface UpdateFileOptions {
  content?: string;
}

export interface UpdateFileResult {
  filePath: string;
  updated: boolean;
}

export async function updateSpecDesign(
  cwd: string,
  id: string,
  options: UpdateFileOptions = {},
): Promise<UpdateFileResult> {
  const spec = await specRepo.findById(cwd, id);
  if (!spec) {
    throw new Error(`Specification ${id} not found.`);
  }

  const filePath = spec.files.design;

  if (options.content === undefined) {
    return { filePath, updated: false };
  }

  await specRepo.saveFile(cwd, id, "design.md", options.content);
  await specRepo.save(cwd, {
    ...spec,
    updatedAt: new Date().toISOString(),
  });

  return { filePath, updated: true };
}

// --- Approval Prerequisites ---

export interface PrerequisiteResult {
  ok: boolean;
  errors: string[];
}

export async function checkSpecApprovalPrerequisites(
  cwd: string,
  specId: string,
): Promise<PrerequisiteResult> {
  const spec = await specRepo.findById(cwd, specId);
  if (!spec) {
    throw new Error(`Specification ${specId} not found.`);
  }

  const errors: string[] = [];

  // 1. Status check
  if (spec.status !== "draft") {
    errors.push(`Specificationのステータスが draft ではありません（現在: ${spec.status}）`);
  }

  // 2. Related requirement status check
  const req = await reqRepo.findById(cwd, spec.requirementId);
  if (!req) {
    errors.push(`関連要件 ${spec.requirementId} が見つかりません`);
  } else if (req.status !== "approved" && req.status !== "pending_approval") {
    errors.push(`関連要件 ${spec.requirementId} が未承認です（現在: ${req.status}）`);
  }

  // 3. design.md content check
  const design = await specRepo.loadFile(cwd, specId, "design.md");
  if (design == null) {
    errors.push("design.mdが存在しないか読み込めません。design.mdを作成し、設計内容を記述してください。");
  } else if (design.trim().length === 0) {
    errors.push("design.mdが空です。設計内容を記述してください。");
  } else if (design.includes("{{")) {
    errors.push("design.mdがテンプレートのままです。プレースホルダを編集して設計内容を記述してください。");
  }

  return { ok: errors.length === 0, errors };
}

// --- Update Specification Status ---

export interface UpdateSpecStatusResult {
  before: Specification;
  after: Specification;
}

export async function updateSpecificationStatus(
  cwd: string,
  id: string,
  newStatus: Status,
): Promise<UpdateSpecStatusResult> {
  const before = await specRepo.findById(cwd, id);
  if (!before) {
    throw new Error(`Specification ${id} not found.`);
  }

  // Validate status transition
  if (!versionService.isValidTransition(before.status, newStatus)) {
    const transitions = versionService.getStateTransitions();
    const allowed = (transitions.get(before.status) ?? []).join(", ");
    throw new Error(
      `Invalid status transition: ${before.status} → ${newStatus}. Allowed: ${allowed}`
    );
  }

  // Version bump: status change = major bump
  const { major } = versionService.parseVersion(before.version);
  const nextVersion = versionService.formatVersion(major + 1, 0, 0);

  const now = new Date().toISOString();
  const summary = `Status changed from ${before.status} to ${newStatus}`;
  const historyEntry: VersionHistoryEntry = {
    version: nextVersion,
    status: newStatus,
    gitCommit: versionService.getCurrentGitCommit(),
    changedAt: now,
    summary,
  };

  const after: Specification = {
    ...before,
    status: newStatus,
    version: nextVersion,
    updatedAt: now,
    versionHistory: [...before.versionHistory, historyEntry],
  };

  await specRepo.save(cwd, after);
  return { before, after };
}
