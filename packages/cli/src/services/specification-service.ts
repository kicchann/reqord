import type { Specification, Status, VersionHistoryEntry } from "@reqord/shared";
import { SPECIFICATIONS_DIR } from "@reqord/shared";
import * as specRepo from "../repositories/specification.js";
import * as reqRepo from "../repositories/requirement.js";
import { generateNextSpecId } from "../utils/id-generator.js";
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
  await reqRepo.findByIdOrThrow(cwd, options.requirementId);

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
  const specification = await specRepo.findByIdOrThrow(cwd, id);
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
  const spec = await specRepo.findByIdOrThrow(cwd, id);
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
  const spec = await specRepo.findByIdOrThrow(cwd, specId);
  const errors: string[] = [];

  // 1. Status check
  if (spec.status !== "draft") {
    errors.push(`Specificationのステータスが draft ではありません（現在: ${spec.status}）`);
  }

  // 2. Related requirement status check
  const req = await reqRepo.findById(cwd, spec.requirementId);
  if (!req) {
    errors.push(`関連要件 ${spec.requirementId} が見つかりません`);
  } else if (req.status !== "approved") {
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

// --- Helper: Content Change Detection ---

/**
 * Check if specification has content changes (excluding status, flags, metadata)
 */
export function hasSpecContentChanges(before: Specification, after: Specification): boolean {
  // Extract content fields only (exclude status, flags, updatedAt, versionHistory, currentApproval, implementation)
  const contentBefore = {
    id: before.id,
    requirementId: before.requirementId,
    version: before.version,
    createdAt: before.createdAt,
    files: before.files,
  };

  const contentAfter = {
    id: after.id,
    requirementId: after.requirementId,
    version: after.version,
    createdAt: after.createdAt,
    files: after.files,
  };

  return JSON.stringify(contentBefore) !== JSON.stringify(contentAfter);
}

// --- Update Specification ---

export interface UpdateSpecOptions {
  status?: Status;
  patchData?: Partial<Specification>;
  designContent?: string;
  versionBump?: "major" | "minor" | "patch";
}

export interface UpdateSpecResult {
  before: Specification;
  after: Specification;
}

export async function updateSpecification(
  cwd: string,
  id: string,
  options: UpdateSpecOptions = {},
): Promise<UpdateSpecResult> {
  const before = await specRepo.findByIdOrThrow(cwd, id);

  // Apply patch data
  let merged: Specification = { ...before };
  if (options.patchData) {
    merged = { ...merged, ...options.patchData };
  }

  // Update status if specified
  if (options.status !== undefined) {
    // Validate status transition
    if (!versionService.isValidTransition(before.status, options.status)) {
      const transitions = versionService.getStateTransitions();
      const allowed = (transitions.get(before.status) ?? []).join(", ");
      throw new Error(
        `Invalid status transition: ${before.status} → ${options.status}. Allowed: ${allowed}`
      );
    }
    merged.status = options.status;
  }

  // Detect content changes (for auto-versioning)
  const hasContentChanges = hasSpecContentChanges(before, merged);

  // Determine next version
  let nextVersion = before.version;

  if (options.versionBump) {
    // Explicit version bump takes priority
    const { major, minor, patch } = versionService.parseVersion(before.version);
    if (options.versionBump === "major") {
      nextVersion = versionService.formatVersion(major + 1, 0, 0);
    } else if (options.versionBump === "minor") {
      nextVersion = versionService.formatVersion(major, minor + 1, 0);
    } else if (options.versionBump === "patch") {
      nextVersion = versionService.formatVersion(major, minor, patch + 1);
    }
  } else {
    // Auto-versioning based on content changes
    // Priority: supplementary changes > design content changes
    if (hasContentChanges) {
      // Supplementary or other content changes (may trigger major/minor/patch)
      nextVersion = versionService.determineNextVersionForSpec(before, merged);
    } else if (options.designContent !== undefined) {
      // Design content-only change (patch bump)
      const { major, minor, patch } = versionService.parseVersion(before.version);
      nextVersion = versionService.formatVersion(major, minor, patch + 1);
    }
    // Status-only changes keep version unchanged
  }

  // Generate summary
  const changes: string[] = [];
  if (before.status !== merged.status) {
    changes.push(`status: ${before.status} → ${merged.status}`);
  }
  if (options.designContent !== undefined) {
    changes.push("design.md updated");
  }
  if (hasContentChanges) {
    const summary = versionService.generateSpecChangeSummary(before, merged);
    if (summary && !changes.includes(summary)) {
      changes.push(summary);
    }
  }
  const summary = changes.length > 0 ? changes.join(", ") : "Specification updated";

  // Create version history entry
  const now = new Date().toISOString();
  const historyEntry: VersionHistoryEntry = {
    version: nextVersion,
    status: merged.status,
    gitCommit: versionService.getCurrentGitCommit(),
    changedAt: now,
    summary,
  };

  // Build final specification
  const after: Specification = {
    ...merged,
    version: nextVersion,
    updatedAt: now,
    versionHistory: [...before.versionHistory, historyEntry],
  };

  // Save design file if provided
  if (options.designContent !== undefined) {
    await specRepo.saveFile(cwd, id, "design.md", options.designContent);
  }

  // Save specification
  await specRepo.save(cwd, after);

  return { before, after };
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
  // Delegate to updateSpecification
  return updateSpecification(cwd, id, { status: newStatus });
}
