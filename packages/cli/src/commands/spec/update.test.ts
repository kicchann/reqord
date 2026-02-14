import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Specification } from "@reqord/shared";
import { updateCommand } from "./update.js";

// Mock services and repositories
vi.mock("../../services/specification-service.js", () => ({
  updateSpecification: vi.fn(),
}));

vi.mock("../../repositories/file-system.js", () => ({
  readText: vi.fn(),
}));

import { updateSpecification } from "../../services/specification-service.js";
import * as fs from "../../repositories/file-system.js";

const mockUpdateSpecification = vi.mocked(updateSpecification);
const mockReadText = vi.mocked(fs.readText);

function makeSpecification(overrides: Partial<Specification> = {}): Specification {
  return {
    id: "spec-000001",
    requirementId: "req-000001",
    version: "1.0",
    status: "draft",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    versionHistory: [],
    files: {
      design: "specifications/spec-000001/design.md",
      supplementary: [],
    },
    flags: [],
    ...overrides,
  };
}

describe("spec update command", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = 0;
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    // Reset Commander option state
    updateCommand.setOptionValue("patchFile", undefined);
    updateCommand.setOptionValue("designFile", undefined);
    updateCommand.setOptionValue("major", undefined);
    updateCommand.setOptionValue("patch", undefined);
    updateCommand.setOptionValue("json", undefined);
  });

  it("--patch-file適用の正常動作", async () => {
    const before = makeSpecification({ version: "1.0" });
    const after = makeSpecification({
      version: "1.0",
      files: {
        design: "specifications/spec-000001/design.md",
        supplementary: ["new.md"],
      },
    });

    mockReadText.mockResolvedValue("files:\n  supplementary:\n    - new.md\n");
    mockUpdateSpecification.mockResolvedValue({ before, after });

    await updateCommand.parseAsync(["node", "test", "spec-000001", "--patch-file", "patch.yaml"]);

    expect(mockReadText).toHaveBeenCalledWith("patch.yaml");
    expect(mockUpdateSpecification).toHaveBeenCalledWith(
      process.cwd(),
      "spec-000001",
      expect.objectContaining({
        patchData: expect.objectContaining({ files: expect.any(Object) }),
      }),
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("Updated specification: spec-000001"));
  });

  it("--design-file更新の正常動作", async () => {
    const before = makeSpecification({ version: "1.0" });
    const after = makeSpecification({ version: "1.0" });

    mockReadText.mockResolvedValue("# Updated design");
    mockUpdateSpecification.mockResolvedValue({ before, after });

    await updateCommand.parseAsync(["node", "test", "spec-000001", "--design-file", "design.md"]);

    expect(mockReadText).toHaveBeenCalledWith("design.md");
    expect(mockUpdateSpecification).toHaveBeenCalledWith(
      process.cwd(),
      "spec-000001",
      expect.objectContaining({
        designContent: "# Updated design",
      }),
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("design.md: updated"));
  });

  it("--major指定でmajorバージョンアップ", async () => {
    const before = makeSpecification({ version: "1.2" });
    const after = makeSpecification({ version: "2.0" });

    mockReadText.mockResolvedValue("files:\n  supplementary:\n    - new.md\n");
    mockUpdateSpecification.mockResolvedValue({ before, after });

    await updateCommand.parseAsync([
      "node",
      "test",
      "spec-000001",
      "--patch-file",
      "patch.yaml",
      "--major",
    ]);

    expect(mockUpdateSpecification).toHaveBeenCalledWith(
      process.cwd(),
      "spec-000001",
      expect.objectContaining({
        versionBump: "major",
      }),
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("version: 1.2 → 2.0"));
  });

  it("--patch指定でpatchバージョンアップ", async () => {
    const before = makeSpecification({ version: "1.2" });
    const after = makeSpecification({ version: "1.3" });

    mockReadText.mockResolvedValue("files:\n  supplementary:\n    - new.md\n");
    mockUpdateSpecification.mockResolvedValue({ before, after });

    await updateCommand.parseAsync([
      "node",
      "test",
      "spec-000001",
      "--patch-file",
      "patch.yaml",
      "--patch",
    ]);

    expect(mockUpdateSpecification).toHaveBeenCalledWith(
      process.cwd(),
      "spec-000001",
      expect.objectContaining({
        versionBump: "patch",
      }),
    );
  });

  it("--major/--patchの複数指定でエラー", async () => {
    await updateCommand.parseAsync([
      "node",
      "test",
      "spec-000001",
      "--patch-file",
      "patch.yaml",
      "--major",
      "--patch",
    ]);

    expect(process.exitCode).toBe(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Only one of --major or --patch can be specified"),
    );
  });

  it("オプション未指定でエラー", async () => {
    await updateCommand.parseAsync(["node", "test", "spec-000001"]);

    expect(process.exitCode).toBe(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("At least one option"),
    );
  });

  it("無効なYAMLファイルでエラー", async () => {
    mockReadText.mockResolvedValue("{invalid yaml: [}");

    await updateCommand.parseAsync(["node", "test", "spec-000001", "--patch-file", "invalid.yaml"]);

    expect(process.exitCode).toBe(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Invalid YAML"),
    );
  });

  it("--jsonオプションでJSON出力", async () => {
    const before = makeSpecification({ version: "1.0" });
    const after = makeSpecification({ version: "1.0" });

    mockReadText.mockResolvedValue("files:\n  supplementary:\n    - new.md\n");
    mockUpdateSpecification.mockResolvedValue({ before, after });

    await updateCommand.parseAsync([
      "node",
      "test",
      "spec-000001",
      "--patch-file",
      "patch.yaml",
      "--json",
    ]);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      JSON.stringify(after, null, 2),
    );
    // JSON mode should not print other messages
    expect(consoleLogSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Updated specification"),
    );
  });

  it("組み合わせ: --patch-file + --design-file", async () => {
    const before = makeSpecification({ version: "1.0" });
    const after = makeSpecification({ version: "1.0" });

    mockReadText.mockResolvedValueOnce("files:\n  supplementary:\n    - new.md\n");
    mockReadText.mockResolvedValueOnce("# Updated design");
    mockUpdateSpecification.mockResolvedValue({ before, after });

    await updateCommand.parseAsync([
      "node",
      "test",
      "spec-000001",
      "--patch-file",
      "patch.yaml",
      "--design-file",
      "design.md",
    ]);

    expect(mockUpdateSpecification).toHaveBeenCalledWith(
      process.cwd(),
      "spec-000001",
      expect.objectContaining({
        patchData: expect.any(Object),
        designContent: "# Updated design",
      }),
    );
  });
});
