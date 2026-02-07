import type { Requirement, Priority, FormatType, Status } from "@reqord/shared";
import { REQUIREMENTS_DIR, RequirementSchema } from "@reqord/shared";
import * as reqRepo from "../repositories/requirement.js";
import { generateNextId } from "../utils/id-generator.js";
import {
  loadProjectTemplate,
  DEFAULT_REQUIREMENT_DESCRIPTION_TEMPLATE,
} from "../utils/templates.js";

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
    },
    successCriteria: [],
    format,
    dependencies: {
      blockedBy: [],
      blocks: [],
      relatedTo: [],
    },
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
  const requirement = await reqRepo.findById(cwd, id);
  if (!requirement) {
    throw new Error(`Requirement ${id} not found.`);
  }

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
}

export interface UpdateResult {
  before: Requirement;
  after: Requirement;
  descriptionUpdated?: boolean;
}

export async function updateRequirement(
  cwd: string,
  id: string,
  options: UpdateOptions,
): Promise<UpdateResult> {
  const before = await reqRepo.findById(cwd, id);
  if (!before) {
    throw new Error(`Requirement ${id} not found.`);
  }

  // Start with existing data
  let merged: Record<string, unknown> = { ...before };

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

  // Preserve immutable fields
  merged.id = before.id;
  merged.createdAt = before.createdAt;
  merged.files = before.files;

  // Validate merged result through Zod
  const parseResult = RequirementSchema.safeParse(merged);
  if (!parseResult.success) {
    throw new Error(`Validation failed: ${parseResult.error.message}`);
  }

  const after = parseResult.data;
  await reqRepo.save(cwd, after);

  // Update description.md if provided
  let descriptionUpdated = false;
  if (options.descriptionContent !== undefined) {
    await reqRepo.saveDescription(cwd, id, options.descriptionContent);
    descriptionUpdated = true;
  }

  return { before, after, descriptionUpdated };
}

// --- Delete ---
export async function deleteRequirement(
  cwd: string,
  id: string,
): Promise<void> {
  const requirement = await reqRepo.findById(cwd, id);
  if (!requirement) {
    throw new Error(`Requirement ${id} not found.`);
  }

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
