import type { ProjectContext } from "@reqord/shared";
import { REQORD_DIR, CONTEXT_DIR, DOMAIN_DIR } from "@reqord/shared";
import * as contextRepo from "../repositories/project-context.js";
import * as fs from "../repositories/file-system.js";

const CONTEXT_NOT_FOUND = "context.json not found. Run 'reqord context init' first.";

export interface InitContextOptions {
  id: string;
  name: string;
  language?: string;
}

export async function initContext(
  cwd: string,
  options: InitContextOptions,
): Promise<ProjectContext> {
  if (await contextRepo.contextExists(cwd)) {
    throw new Error("context.json already exists.");
  }

  const now = new Date().toISOString();
  const context: ProjectContext = {
    id: options.id,
    name: options.name,
    version: "0.1.0",
    language: options.language ?? "ja",
    createdAt: now,
    updatedAt: now,
    files: {
      product: { path: `${CONTEXT_DIR}/product.json`, format: "json" },
      technical: { structured: `${CONTEXT_DIR}/technical.json` },
      structure: { structured: `${CONTEXT_DIR}/structure.json` },
      domain: [],
    },
  };

  await contextRepo.save(cwd, context);

  // Generate template files (skip if they already exist)
  const contextDir = fs.joinPath(cwd, REQORD_DIR, CONTEXT_DIR);

  const templateFiles: Array<[string, unknown]> = [
    ["product.json", { name: options.name, vision: "", goals: [], targetUsers: [] }],
    ["technical.json", { stack: {}, constraints: [], decisions: [] }],
    ["structure.json", { modules: [], layers: [] }],
  ];

  for (const [filename, defaultContent] of templateFiles) {
    const filePath = fs.joinPath(contextDir, filename);
    if (!(await fs.exists(filePath))) {
      await fs.writeJSON(filePath, defaultContent);
    }
  }

  await fs.mkdirp(fs.joinPath(contextDir, DOMAIN_DIR));

  return context;
}

export interface ShowContextResult {
  context: ProjectContext;
  productExists: boolean;
  technicalExists: boolean;
  structureExists: boolean;
  domainFiles: string[];
  product?: unknown;
  technical?: unknown;
  structure?: unknown;
}

export async function showContext(cwd: string): Promise<ShowContextResult> {
  const context = await contextRepo.load(cwd);
  if (!context) {
    throw new Error(CONTEXT_NOT_FOUND);
  }

  const contextDir = fs.joinPath(cwd, REQORD_DIR, CONTEXT_DIR);

  async function resolveFileStatus(fileRef: unknown): Promise<{ exists: boolean; content?: unknown }> {
    const fullPath = fs.joinPath(cwd, REQORD_DIR, resolveFilePath(fileRef));
    const fileExists = await fs.exists(fullPath);
    const content = fileExists ? await safeReadJSON(fullPath) : undefined;
    return { exists: fileExists, content };
  }

  const product = await resolveFileStatus(context.files.product);
  const technical = await resolveFileStatus(context.files.technical);
  const structure = await resolveFileStatus(context.files.structure);

  const domainDir = fs.joinPath(contextDir, DOMAIN_DIR);
  const domainFiles = await fs.readdirFiles(domainDir);

  return {
    context,
    productExists: product.exists,
    technicalExists: technical.exists,
    structureExists: structure.exists,
    domainFiles,
    product: product.content,
    technical: technical.content,
    structure: structure.content,
  };
}

export interface UpdateContextOptions {
  name?: string;
  version?: string;
  productPatch?: Record<string, unknown>;
  technicalPatch?: Record<string, unknown>;
  structurePatch?: Record<string, unknown>;
}

export interface UpdateContextResult {
  before: ProjectContext;
  after: ProjectContext;
  updatedFiles: string[];
}

export async function updateContext(
  cwd: string,
  options: UpdateContextOptions,
): Promise<UpdateContextResult> {
  const before = await contextRepo.load(cwd);
  if (!before) {
    throw new Error(CONTEXT_NOT_FOUND);
  }

  const after: ProjectContext = {
    ...before,
    updatedAt: new Date().toISOString(),
  };

  if (options.name !== undefined) after.name = options.name;
  if (options.version !== undefined) after.version = options.version;

  await contextRepo.save(cwd, after);

  const updatedFiles: string[] = [];

  const filePatches: Array<[contextRepo.ContextFileType, Record<string, unknown> | undefined]> = [
    ["product", options.productPatch],
    ["technical", options.technicalPatch],
    ["structure", options.structurePatch],
  ];

  for (const [fileType, patch] of filePatches) {
    if (patch) {
      const existing = await contextRepo.loadContextFile(cwd, fileType) as Record<string, unknown> | null;
      await contextRepo.saveContextFile(cwd, fileType, { ...existing, ...patch });
      updatedFiles.push(fileType);
    }
  }

  return { before, after, updatedFiles };
}

async function safeReadJSON(path: string): Promise<unknown> {
  try {
    return await fs.readJSON(path);
  } catch {
    return null;
  }
}

export function resolveFilePath(
  fileRef: unknown,
): string {
  if (typeof fileRef === "string") return fileRef;
  if (typeof fileRef === "object" && fileRef !== null) {
    const obj = fileRef as Record<string, unknown>;
    if (typeof obj.path === "string") return obj.path;
    if (typeof obj.structured === "string") return obj.structured;
  }
  return "";
}
