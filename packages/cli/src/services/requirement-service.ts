import type { Requirement, Priority, FormatType, Status } from "@reqord/shared";
import { REQUIREMENTS_DIR, RequirementSchema } from "@reqord/shared";
import * as reqRepo from "../repositories/requirement.js";
import { generateNextId } from "../utils/id-generator.js";
import {
  loadProjectTemplate,
  DEFAULT_REQUIREMENT_DESCRIPTION_TEMPLATE,
} from "../utils/templates.js";
import * as versionService from "./version-service.js";

export interface CreateOptions {
  title: string;
  priority?: Priority;
  format?: FormatType;
}

export interface CreateResult {
  requirement: Requirement;
  descriptionPath: string;
}

export async function createRequirement(
  cwd: string,
  options: CreateOptions,
): Promise<CreateResult> {
  const id = await generateNextId(cwd);
  const now = new Date().toISOString();
  const priority = options.priority ?? "medium";
  const formatType = options.format ?? "user-story";

  const format = buildFormat(formatType);

  const requirement: Requirement = {
    id,
    version: "1.0.0",
    title: options.title,
    status: "draft",
    priority,
    createdAt: now,
    updatedAt: now,
    versionHistory: [],
    files: {
      description: `${REQUIREMENTS_DIR}/${id}/description.md`,
      supplementary: [],
    },
    successCriteria: [],
    format,
    dependencies: {
      blockedBy: [],
      blocks: [],
      relatedTo: [],
    },
    flags: [],
  };

  await reqRepo.save(cwd, requirement);

  // Generate description.md from template
  const template =
    (await loadProjectTemplate(cwd, "requirement-description.md")) ??
    DEFAULT_REQUIREMENT_DESCRIPTION_TEMPLATE;
  const description = template.replace(/\{\{title\}\}/g, options.title);
  await reqRepo.saveDescription(cwd, id, description);

  return {
    requirement,
    descriptionPath: requirement.files.description,
  };
}

function buildFormat(type: FormatType): Requirement["format"] {
  switch (type) {
    case "user-story":
      return {
        type: "user-story",
        userStory: { as: "", iWant: "", soThat: "" },
      };
    case "ears":
      return {
        type: "ears",
        ears: { type: "event-driven", action: "" },
      };
    case "free-form":
      return { type: "free-form" };
  }
}

// --- Show ---
export interface ShowResult {
  requirement: Requirement;
  description: string | null;
}

export async function showRequirement(
  cwd: string,
  id: string,
): Promise<ShowResult> {
  const requirement = await reqRepo.findByIdOrThrow(cwd, id);
  const description = await reqRepo.loadDescription(cwd, id);
  return { requirement, description };
}

// --- Update ---
export interface UpdateOptions {
  title?: string;
  status?: Status;
  priority?: Priority;
  patchData?: Record<string, unknown>;
  descriptionContent?: string;
  versionBump?: "major" | "minor" | "patch";
}

export interface UpdateResult {
  before: Requirement;
  after: Requirement;
  descriptionUpdated?: boolean;
  versionChanged?: boolean;
}

export async function updateRequirement(
  cwd: string,
  id: string,
  options: UpdateOptions,
): Promise<UpdateResult> {
  const before = await reqRepo.findByIdOrThrow(cwd, id);

  // Start with existing data
  const merged: Record<string, unknown> = { ...before };

  // Apply patch-file data (replace semantics for top-level fields)
  if (options.patchData) {
    const patch = options.patchData;
    // Only allow known updatable fields
    const allowedPatchFields = [
      "title", "status", "priority", "successCriteria", "format",
      "dependencies", "estimatedComplexity", "estimatedHours",
    ];
    for (const key of allowedPatchFields) {
      if (key in patch) {
        merged[key] = patch[key];
      }
    }
  }

  // Individual flags override patch-file (explicit flags win)
  if (options.title !== undefined) merged.title = options.title;
  if (options.status !== undefined) merged.status = options.status;
  if (options.priority !== undefined) merged.priority = options.priority;

  merged.updatedAt = new Date().toISOString();

  // 4. Detect content changes
  const hasDescriptionChange = options.descriptionContent !== undefined;
  const hasContentChanges =
    merged.title !== before.title ||
    JSON.stringify(merged.format) !== JSON.stringify(before.format) ||
    JSON.stringify(merged.dependencies) !== JSON.stringify(before.dependencies) ||
    JSON.stringify(merged.successCriteria) !== JSON.stringify(before.successCriteria) ||
    hasDescriptionChange;

  // 5. Auto-revert (only when status is NOT explicitly changed by user)
  const statusExplicitlyChanged =
    options.status !== undefined || (options.patchData != null && "status" in options.patchData);
  if (!statusExplicitlyChanged) {
    const shouldRevert = versionService.shouldRevertToPendingApproval(
      before.status as Status,
      hasContentChanges,
    );
    if (shouldRevert) {
      merged.status = "pending_approval";
    }
  }

  // 6. Validate status transition (after auto-revert applied)
  if (merged.status !== before.status) {
    const isValid = versionService.isValidTransition(before.status, merged.status as Status);
    if (!isValid) {
      const transitions = versionService.getStateTransitions();
      const allowedList = (transitions.get(before.status) ?? []).join(", ");
      throw new Error(
        `Invalid status transition: ${before.status} → ${merged.status}. Allowed transitions from ${before.status}: ${allowedList}`,
      );
    }
  }

  // 7. Determine version
  let nextVersion = versionService.determineNextVersion(before, merged as Requirement);

  // Ensure at least patch bump for description-only changes (outside draft)
  if (hasDescriptionChange && nextVersion === before.version && before.status !== "draft") {
    const { major, minor, patch } = versionService.parseVersion(before.version);
    nextVersion = versionService.formatVersion(major, minor, patch + 1);
  }

  // Override with explicit version bump if specified
  if (options.versionBump) {
    const { major, minor, patch } = versionService.parseVersion(before.version);
    switch (options.versionBump) {
      case "major":
        nextVersion = versionService.formatVersion(major + 1, 0, 0);
        break;
      case "minor":
        nextVersion = versionService.formatVersion(major, minor + 1, 0);
        break;
      case "patch":
        nextVersion = versionService.formatVersion(major, minor, patch + 1);
        break;
    }
  }

  merged.version = nextVersion;
  const versionChanged = nextVersion !== before.version;

  // 8. Preserve immutable fields
  merged.id = before.id;
  merged.createdAt = before.createdAt;
  merged.files = before.files;
  merged.versionHistory = before.versionHistory;

  // 9. Validate merged result through Zod
  const parseResult = RequirementSchema.safeParse(merged);
  if (!parseResult.success) {
    throw new Error(`Validation failed: ${parseResult.error.message}`);
  }

  let after = parseResult.data;

  // 10. Append history entry
  if (versionChanged) {
    const summary = versionService.generateChangeSummary(before, after);
    const historyEntry = versionService.createHistoryEntry(after, { summary });
    after = {
      ...after,
      versionHistory: [...after.versionHistory, historyEntry],
    };
  }

  // 11. Save
  await reqRepo.save(cwd, after);

  // Update description.md if provided
  let descriptionUpdated = false;
  if (options.descriptionContent !== undefined) {
    await reqRepo.saveDescription(cwd, id, options.descriptionContent);
    descriptionUpdated = true;
  }

  return { before, after, descriptionUpdated, versionChanged };
}

// --- Delete ---
export async function deleteRequirement(
  cwd: string,
  id: string,
): Promise<void> {
  await reqRepo.findByIdOrThrow(cwd, id);
  await reqRepo.deleteById(cwd, id);
}

// --- List ---
export interface ListOptions {
  status?: Status;
  priority?: Priority;
}

export async function listRequirements(
  cwd: string,
  options: ListOptions = {},
): Promise<Requirement[]> {
  let requirements = await reqRepo.findAll(cwd);

  if (options.status) {
    requirements = requirements.filter((r) => r.status === options.status);
  }
  if (options.priority) {
    requirements = requirements.filter((r) => r.priority === options.priority);
  }

  return requirements;
}
