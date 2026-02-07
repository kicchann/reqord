import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateContext, showContext, initContext } from "./context-service.js";
import type { ProjectContext } from "@reqord/shared";

// Mock repositories
vi.mock("../repositories/project-context.js", () => ({
  load: vi.fn(),
  save: vi.fn(),
  contextExists: vi.fn(),
  loadContextFile: vi.fn(),
  saveContextFile: vi.fn(),
}));

vi.mock("../repositories/file-system.js", () => ({
  exists: vi.fn(),
  readJSON: vi.fn(),
  writeJSON: vi.fn(),
  mkdirp: vi.fn(),
  readdirFiles: vi.fn(),
  joinPath: vi.fn((...args: string[]) => args.join("/")),
}));

import * as contextRepo from "../repositories/project-context.js";
import * as fs from "../repositories/file-system.js";

function makeContext(overrides: Partial<ProjectContext> = {}): ProjectContext {
  return {
    id: "test-project",
    name: "Test Project",
    version: "0.1.0",
    language: "ja",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    files: {
      product: { path: "context/product.json", format: "json" },
      technical: { structured: "context/technical.json" },
      structure: { structured: "context/structure.json" },
      domain: [],
    },
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("updateContext", () => {
  it("コンテキストが存在しない場合エラーを投げる", async () => {
    vi.mocked(contextRepo.load).mockResolvedValue(null);

    await expect(updateContext("/cwd", {})).rejects.toThrow(
      "context.json not found. Run 'reqord context init' first.",
    );
  });

  it("名前を更新できる", async () => {
    const ctx = makeContext();
    vi.mocked(contextRepo.load).mockResolvedValue(ctx);
    vi.mocked(contextRepo.save).mockResolvedValue(undefined);

    const result = await updateContext("/cwd", { name: "New Name" });

    expect(result.after.name).toBe("New Name");
    expect(result.before.name).toBe("Test Project");
    expect(contextRepo.save).toHaveBeenCalledOnce();
  });

  it("バージョンを更新できる", async () => {
    const ctx = makeContext();
    vi.mocked(contextRepo.load).mockResolvedValue(ctx);
    vi.mocked(contextRepo.save).mockResolvedValue(undefined);

    const result = await updateContext("/cwd", { version: "1.0.0" });

    expect(result.after.version).toBe("1.0.0");
  });

  it("updatedAtが自動更新される", async () => {
    const ctx = makeContext();
    vi.mocked(contextRepo.load).mockResolvedValue(ctx);
    vi.mocked(contextRepo.save).mockResolvedValue(undefined);

    const result = await updateContext("/cwd", { name: "Updated" });

    expect(result.after.updatedAt).not.toBe(ctx.updatedAt);
    expect(result.after.createdAt).toBe(ctx.createdAt);
  });

  it("product.jsonをパッチ更新できる", async () => {
    const ctx = makeContext();
    vi.mocked(contextRepo.load).mockResolvedValue(ctx);
    vi.mocked(contextRepo.save).mockResolvedValue(undefined);
    vi.mocked(contextRepo.loadContextFile).mockResolvedValue({
      name: "Test Project",
      vision: "",
      goals: [],
      targetUsers: [],
    });
    vi.mocked(contextRepo.saveContextFile).mockResolvedValue(undefined);

    const patchData = { vision: "世界を変える", goals: ["Goal 1"] };
    const result = await updateContext("/cwd", {
      productPatch: patchData,
    });

    expect(contextRepo.saveContextFile).toHaveBeenCalledWith(
      "/cwd",
      "product",
      expect.objectContaining({
        name: "Test Project",
        vision: "世界を変える",
        goals: ["Goal 1"],
        targetUsers: [],
      }),
    );
    expect(result.updatedFiles).toContain("product");
  });

  it("technical.jsonをパッチ更新できる", async () => {
    const ctx = makeContext();
    vi.mocked(contextRepo.load).mockResolvedValue(ctx);
    vi.mocked(contextRepo.save).mockResolvedValue(undefined);
    vi.mocked(contextRepo.loadContextFile).mockResolvedValue({
      stack: {},
      constraints: [],
      decisions: [],
    });
    vi.mocked(contextRepo.saveContextFile).mockResolvedValue(undefined);

    const patchData = { stack: { language: "TypeScript", runtime: "Node.js" } };
    const result = await updateContext("/cwd", {
      technicalPatch: patchData,
    });

    expect(contextRepo.saveContextFile).toHaveBeenCalledWith(
      "/cwd",
      "technical",
      expect.objectContaining({
        stack: { language: "TypeScript", runtime: "Node.js" },
        constraints: [],
        decisions: [],
      }),
    );
    expect(result.updatedFiles).toContain("technical");
  });

  it("structure.jsonをパッチ更新できる", async () => {
    const ctx = makeContext();
    vi.mocked(contextRepo.load).mockResolvedValue(ctx);
    vi.mocked(contextRepo.save).mockResolvedValue(undefined);
    vi.mocked(contextRepo.loadContextFile).mockResolvedValue({
      modules: [],
      layers: [],
    });
    vi.mocked(contextRepo.saveContextFile).mockResolvedValue(undefined);

    const patchData = { modules: [{ name: "core", path: "src/core" }] };
    const result = await updateContext("/cwd", {
      structurePatch: patchData,
    });

    expect(contextRepo.saveContextFile).toHaveBeenCalledWith(
      "/cwd",
      "structure",
      expect.objectContaining({
        modules: [{ name: "core", path: "src/core" }],
        layers: [],
      }),
    );
    expect(result.updatedFiles).toContain("structure");
  });

  it("コンテキストファイルが存在しない場合、パッチデータのみで新規作成される", async () => {
    const ctx = makeContext();
    vi.mocked(contextRepo.load).mockResolvedValue(ctx);
    vi.mocked(contextRepo.save).mockResolvedValue(undefined);
    vi.mocked(contextRepo.loadContextFile).mockResolvedValue(null);
    vi.mocked(contextRepo.saveContextFile).mockResolvedValue(undefined);

    const patchData = { vision: "新規プロダクト" };
    const result = await updateContext("/cwd", {
      productPatch: patchData,
    });

    expect(contextRepo.saveContextFile).toHaveBeenCalledWith(
      "/cwd",
      "product",
      { vision: "新規プロダクト" },
    );
    expect(result.updatedFiles).toContain("product");
  });

  it("複数のファイルを同時に更新できる", async () => {
    const ctx = makeContext();
    vi.mocked(contextRepo.load).mockResolvedValue(ctx);
    vi.mocked(contextRepo.save).mockResolvedValue(undefined);
    vi.mocked(contextRepo.loadContextFile).mockResolvedValue({});
    vi.mocked(contextRepo.saveContextFile).mockResolvedValue(undefined);

    const result = await updateContext("/cwd", {
      name: "Updated Project",
      productPatch: { vision: "V" },
      technicalPatch: { stack: { lang: "TS" } },
    });

    expect(result.after.name).toBe("Updated Project");
    expect(result.updatedFiles).toContain("product");
    expect(result.updatedFiles).toContain("technical");
    expect(contextRepo.saveContextFile).toHaveBeenCalledTimes(2);
  });

  it("オプションが何も指定されていなくてもエラーにならない（updatedAtだけ更新）", async () => {
    const ctx = makeContext();
    vi.mocked(contextRepo.load).mockResolvedValue(ctx);
    vi.mocked(contextRepo.save).mockResolvedValue(undefined);

    const result = await updateContext("/cwd", {});

    expect(result.after.updatedAt).not.toBe(ctx.updatedAt);
    expect(contextRepo.save).toHaveBeenCalledOnce();
  });

  it("id, createdAt, filesは変更されない", async () => {
    const ctx = makeContext();
    vi.mocked(contextRepo.load).mockResolvedValue(ctx);
    vi.mocked(contextRepo.save).mockResolvedValue(undefined);

    const result = await updateContext("/cwd", { name: "Changed" });

    expect(result.after.id).toBe(ctx.id);
    expect(result.after.createdAt).toBe(ctx.createdAt);
    expect(result.after.files).toEqual(ctx.files);
  });
});
