import type { Specification, Status } from "@reqord/shared";
import { SPECIFICATIONS_DIR } from "@reqord/shared";
import * as specRepo from "../repositories/specification.js";
import * as reqRepo from "../repositories/requirement.js";
import { generateNextSpecId } from "../utils/spec-id-generator.js";
import {
  loadProjectTemplate,
  DEFAULT_SPECIFICATION_DESIGN_TEMPLATE,
} from "../utils/templates.js";

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
