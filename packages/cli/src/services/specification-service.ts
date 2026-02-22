import type { Specification, Status } from "@reqord/shared";
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
  title?: string;
}

export interface CreateSpecResult {
  specification: Specification;
}

export async function createSpecification(
  cwd: string,
  options: CreateSpecOptions,
): Promise<CreateSpecResult> {
  const requirement = await reqRepo.findByIdOrThrow(cwd, options.requirementId);

  const id = await generateNextSpecId(cwd);
  const now = new Date().toISOString();
  const title = options.title ?? requirement.title;

  const specification: Specification = {
    id,
    requirementId: options.requirementId,
    title,
    requirementVersion: requirement.version,
    version: "1.0",
    status: "draft",
    createdAt: now,
    updatedAt: now,
    versionHistory: [],
    files: {
      design: `${SPECIFICATIONS_DIR}/${id}/design.md`,
      supplementary: [],
    },
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
      .replace(/\{\{title\}\}/g, title)
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
    errors.push(`Specification status is not "draft" (current: ${spec.status})`);
  }

  // 2. Related requirement status check
  const req = await reqRepo.findById(cwd, spec.requirementId);
  if (!req) {
    errors.push(`Related requirement ${spec.requirementId} not found`);
  } else if (req.status !== "approved" && req.status !== "implemented") {
    errors.push(`Related requirement ${spec.requirementId} is not approved (current: ${req.status})`);
  }

  // 3. design.md content check
  const design = await specRepo.loadFile(cwd, specId, "design.md");
  if (design == null) {
    errors.push("design.md does not exist or could not be read. Create design.md and write the design content.");
  } else if (design.trim().length === 0) {
    errors.push("design.md is empty. Please write the design content.");
  } else if (design.includes("{{")) {
    errors.push("design.md still contains template placeholders. Please edit and write the design content.");
  }

  return { ok: errors.length === 0, errors };
}

// --- Helper: Metadata Change Detection ---

/**
 * Check if specification has metadata changes (file paths, not file content).
 *
 * This function checks for changes in specification metadata fields such as:
 * - files.design path
 * - files.supplementary array
 *
 * Note: This does NOT check actual file content. Design file content changes
 * should be detected separately via the designContent option.
 *
 * Excludes: status, updatedAt, versionHistory
 */
export function hasSpecMetadataChanges(before: Specification, after: Specification): boolean {
  // Extract metadata fields only (file paths, not content)
  const metadataBefore = {
    id: before.id,
    requirementId: before.requirementId,
    version: before.version,
    createdAt: before.createdAt,
    files: before.files,
  };

  const metadataAfter = {
    id: after.id,
    requirementId: after.requirementId,
    version: after.version,
    createdAt: after.createdAt,
    files: after.files,
  };

  return JSON.stringify(metadataBefore) !== JSON.stringify(metadataAfter);
}

// --- Update Specification ---

export interface UpdateSpecOptions {
  status?: Status;
  patchData?: Partial<Specification>;
  designContent?: string;
  versionBump?: "major" | "patch";
}

export interface UpdateSpecResult {
  before: Specification;
  after: Specification;
  versionChanged?: boolean;
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

  // Detect content changes (for summary generation)
  const hasContentChanges = hasSpecMetadataChanges(before, merged);

  // Determine next version
  // Version changes only via explicit versionBump option (no auto-versioning)
  const nextVersion = options.versionBump
    ? versionService.applyVersionBump(before.version, options.versionBump)
    : before.version;
  const versionChanged = nextVersion !== before.version;

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

  const now = new Date().toISOString();

  // Build final specification
  let after: Specification = {
    ...merged,
    version: nextVersion,
    updatedAt: now,
    versionHistory: before.versionHistory,
  };

  // Append history entry only when version changed
  if (versionChanged) {
    const historyEntry = versionService.createHistoryEntry(
      { version: nextVersion, status: merged.status },
      { summary },
    );
    after = {
      ...after,
      versionHistory: [...after.versionHistory, historyEntry],
    };
  }

  // Save design file if provided
  if (options.designContent !== undefined) {
    await specRepo.saveFile(cwd, id, "design.md", options.designContent);
  }

  // Save specification
  await specRepo.save(cwd, after);

  return { before, after, versionChanged };
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
