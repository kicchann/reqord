import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Requirement, Specification, VersionHistoryEntry } from "@reqord/shared";

// Mock repositories and services
vi.mock("../../repositories/requirement.js", () => ({
  findByIdOrThrow: vi.fn(),
  save: vi.fn(),
}));
vi.mock("../../repositories/specification.js", () => ({
  findByIdOrThrow: vi.fn(),
  save: vi.fn(),
}));
vi.mock("../../services/version-service.js", () => ({
  applyVersionBump: vi.fn(),
  createHistoryEntry: vi.fn(),
}));

import { versionCommand } from "./version.js";
import * as reqRepo from "../../repositories/requirement.js";
import * as specRepo from "../../repositories/specification.js";
import * as versionService from "../../services/version-service.js";

const mockReqFindByIdOrThrow = vi.mocked(reqRepo.findByIdOrThrow);
const mockReqSave = vi.mocked(reqRepo.save);
const mockSpecFindByIdOrThrow = vi.mocked(specRepo.findByIdOrThrow);
const mockSpecSave = vi.mocked(specRepo.save);
const mockApplyVersionBump = vi.mocked(versionService.applyVersionBump);
const mockCreateHistoryEntry = vi.mocked(versionService.createHistoryEntry);

function makeRequirement(overrides: Partial<Requirement> = {}): Requirement {
  return {
    id: "req-000001",
    version: "1.0",
    title: "Test Requirement",
    status: "draft",
    priority: "medium",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    versionHistory: [],
    files: {
      description: "requirements/req-000001/description.md",
      supplementary: [],
    },
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

function makeHistoryEntry(overrides: Partial<VersionHistoryEntry> = {}): VersionHistoryEntry {
  return {
    version: "2.0",
    status: "draft",
    changedAt: "2026-01-15T00:00:00Z",
    summary: "Version bumped (major)",
    ...overrides,
  };
}

describe("version command", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = 0;
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    // Reset Commander option state
    versionCommand.setOptionValue("major", undefined);
    versionCommand.setOptionValue("patch", undefined);
    versionCommand.setOptionValue("summary", undefined);
    versionCommand.setOptionValue("json", undefined);

    // Default mock: createHistoryEntry returns a basic entry
    mockCreateHistoryEntry.mockReturnValue(makeHistoryEntry());
  });

  describe("requirement version bump", () => {
    it("default (no flags) bumps major version", async () => {
      const req = makeRequirement({ version: "1.0", status: "draft" });
      mockReqFindByIdOrThrow.mockResolvedValue(req);
      mockApplyVersionBump.mockReturnValue("2.0");

      await versionCommand.parseAsync(["node", "test", "req-000001"]);

      expect(mockApplyVersionBump).toHaveBeenCalledWith("1.0", "major");
      expect(mockReqSave).toHaveBeenCalledWith(
        process.cwd(),
        expect.objectContaining({ version: "2.0" }),
      );
    });

    it("--major bumps major version (1.0 -> 2.0)", async () => {
      const req = makeRequirement({ version: "1.0" });
      mockReqFindByIdOrThrow.mockResolvedValue(req);
      mockApplyVersionBump.mockReturnValue("2.0");

      await versionCommand.parseAsync(["node", "test", "req-000001", "--major"]);

      expect(mockApplyVersionBump).toHaveBeenCalledWith("1.0", "major");
      expect(mockReqSave).toHaveBeenCalledWith(
        process.cwd(),
        expect.objectContaining({ version: "2.0" }),
      );
    });

    it("--patch bumps patch version (1.0 -> 1.1)", async () => {
      const req = makeRequirement({ version: "1.0" });
      mockReqFindByIdOrThrow.mockResolvedValue(req);
      mockApplyVersionBump.mockReturnValue("1.1");
      mockCreateHistoryEntry.mockReturnValue(makeHistoryEntry({ version: "1.1" }));

      await versionCommand.parseAsync(["node", "test", "req-000001", "--patch"]);

      expect(mockApplyVersionBump).toHaveBeenCalledWith("1.0", "patch");
      expect(mockReqSave).toHaveBeenCalledWith(
        process.cwd(),
        expect.objectContaining({ version: "1.1" }),
      );
    });

    it("status is NOT changed after version bump", async () => {
      const req = makeRequirement({ version: "1.0", status: "approved" });
      mockReqFindByIdOrThrow.mockResolvedValue(req);
      mockApplyVersionBump.mockReturnValue("2.0");

      await versionCommand.parseAsync(["node", "test", "req-000001"]);

      expect(mockReqSave).toHaveBeenCalledWith(
        process.cwd(),
        expect.objectContaining({ status: "approved" }),
      );
    });

    it("calls createHistoryEntry with correct arguments", async () => {
      const req = makeRequirement({ version: "1.0", status: "draft" });
      mockReqFindByIdOrThrow.mockResolvedValue(req);
      mockApplyVersionBump.mockReturnValue("2.0");

      await versionCommand.parseAsync(["node", "test", "req-000001"]);

      expect(mockCreateHistoryEntry).toHaveBeenCalledWith(
        { version: "2.0", status: "draft" },
        { summary: "Version bumped (major)" },
      );
    });

    it("appends versionHistory entry from createHistoryEntry", async () => {
      const req = makeRequirement({ version: "1.0", status: "draft", versionHistory: [] });
      mockReqFindByIdOrThrow.mockResolvedValue(req);
      mockApplyVersionBump.mockReturnValue("2.0");
      const entry = makeHistoryEntry({ version: "2.0", status: "draft" });
      mockCreateHistoryEntry.mockReturnValue(entry);

      await versionCommand.parseAsync(["node", "test", "req-000001"]);

      const savedReq = mockReqSave.mock.calls[0][1] as Requirement;
      expect(savedReq.versionHistory).toHaveLength(1);
      expect(savedReq.versionHistory[0]).toBe(entry);
    });

    it("--summary sets custom summary passed to createHistoryEntry", async () => {
      const req = makeRequirement({ version: "1.0" });
      mockReqFindByIdOrThrow.mockResolvedValue(req);
      mockApplyVersionBump.mockReturnValue("2.0");

      await versionCommand.parseAsync([
        "node", "test", "req-000001", "--summary", "Breaking change in API",
      ]);

      expect(mockCreateHistoryEntry).toHaveBeenCalledWith(
        expect.anything(),
        { summary: "Breaking change in API" },
      );
    });

    it("approved status includes approval metadata via createHistoryEntry", async () => {
      const req = makeRequirement({ version: "1.0", status: "approved" });
      mockReqFindByIdOrThrow.mockResolvedValue(req);
      mockApplyVersionBump.mockReturnValue("2.0");
      mockCreateHistoryEntry.mockReturnValue(makeHistoryEntry({
        version: "2.0",
        status: "approved",
        approvedAt: "2026-01-15T00:00:00Z",
        approvedBy: [],
      }));

      await versionCommand.parseAsync(["node", "test", "req-000001"]);

      expect(mockCreateHistoryEntry).toHaveBeenCalledWith(
        { version: "2.0", status: "approved" },
        { summary: "Version bumped (major)" },
      );
      const savedReq = mockReqSave.mock.calls[0][1] as Requirement;
      expect(savedReq.versionHistory[0].approvedAt).toBeDefined();
      expect(savedReq.versionHistory[0].approvedBy).toEqual([]);
    });

    it("displays human-readable output", async () => {
      const req = makeRequirement({ version: "1.0" });
      mockReqFindByIdOrThrow.mockResolvedValue(req);
      mockApplyVersionBump.mockReturnValue("2.0");

      await versionCommand.parseAsync(["node", "test", "req-000001"]);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("req-000001"),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("1.0"),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("2.0"),
      );
    });
  });

  describe("specification version bump", () => {
    it("bumps specification version", async () => {
      const spec = makeSpecification({ version: "1.0" });
      mockSpecFindByIdOrThrow.mockResolvedValue(spec);
      mockApplyVersionBump.mockReturnValue("2.0");

      await versionCommand.parseAsync(["node", "test", "spec-000001"]);

      expect(mockApplyVersionBump).toHaveBeenCalledWith("1.0", "major");
      expect(mockSpecSave).toHaveBeenCalledWith(
        process.cwd(),
        expect.objectContaining({ version: "2.0" }),
      );
    });

    it("--patch bumps specification patch version", async () => {
      const spec = makeSpecification({ version: "1.0" });
      mockSpecFindByIdOrThrow.mockResolvedValue(spec);
      mockApplyVersionBump.mockReturnValue("1.1");
      mockCreateHistoryEntry.mockReturnValue(makeHistoryEntry({ version: "1.1" }));

      await versionCommand.parseAsync(["node", "test", "spec-000001", "--patch"]);

      expect(mockApplyVersionBump).toHaveBeenCalledWith("1.0", "patch");
      expect(mockSpecSave).toHaveBeenCalledWith(
        process.cwd(),
        expect.objectContaining({ version: "1.1" }),
      );
    });

    it("status is NOT changed after specification version bump", async () => {
      const spec = makeSpecification({ version: "1.0", status: "approved" });
      mockSpecFindByIdOrThrow.mockResolvedValue(spec);
      mockApplyVersionBump.mockReturnValue("2.0");

      await versionCommand.parseAsync(["node", "test", "spec-000001"]);

      expect(mockSpecSave).toHaveBeenCalledWith(
        process.cwd(),
        expect.objectContaining({ status: "approved" }),
      );
    });

    it("appends versionHistory entry for specification", async () => {
      const spec = makeSpecification({ version: "1.0", status: "draft", versionHistory: [] });
      mockSpecFindByIdOrThrow.mockResolvedValue(spec);
      mockApplyVersionBump.mockReturnValue("2.0");
      const entry = makeHistoryEntry({ version: "2.0", status: "draft" });
      mockCreateHistoryEntry.mockReturnValue(entry);

      await versionCommand.parseAsync(["node", "test", "spec-000001"]);

      const savedSpec = mockSpecSave.mock.calls[0][1] as Specification;
      expect(savedSpec.versionHistory).toHaveLength(1);
      expect(savedSpec.versionHistory[0]).toBe(entry);
    });

    it("approved specification includes approval metadata via createHistoryEntry", async () => {
      const spec = makeSpecification({ version: "1.0", status: "approved" });
      mockSpecFindByIdOrThrow.mockResolvedValue(spec);
      mockApplyVersionBump.mockReturnValue("2.0");
      mockCreateHistoryEntry.mockReturnValue(makeHistoryEntry({
        version: "2.0",
        status: "approved",
        approvedAt: "2026-01-15T00:00:00Z",
        approvedBy: [],
      }));

      await versionCommand.parseAsync(["node", "test", "spec-000001"]);

      expect(mockCreateHistoryEntry).toHaveBeenCalledWith(
        { version: "2.0", status: "approved" },
        { summary: "Version bumped (major)" },
      );
      const savedSpec = mockSpecSave.mock.calls[0][1] as Specification;
      expect(savedSpec.versionHistory[0].approvedAt).toBeDefined();
      expect(savedSpec.versionHistory[0].approvedBy).toEqual([]);
    });
  });

  describe("error cases", () => {
    it("invalid ID format produces error", async () => {
      await versionCommand.parseAsync(["node", "test", "invalid-id"]);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Invalid ID format"),
      );
      expect(process.exitCode).toBe(1);
    });

    it("--major and --patch together produces error", async () => {
      await versionCommand.parseAsync([
        "node", "test", "req-000001", "--major", "--patch",
      ]);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Only one of --major or --patch"),
      );
      expect(process.exitCode).toBe(1);
    });
  });

  describe("--json output", () => {
    it("outputs requirement as JSON", async () => {
      const req = makeRequirement({ version: "1.0" });
      mockReqFindByIdOrThrow.mockResolvedValue(req);
      mockApplyVersionBump.mockReturnValue("2.0");

      await versionCommand.parseAsync(["node", "test", "req-000001", "--json"]);

      const output = consoleLogSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(output);
      expect(parsed.version).toBe("2.0");
      expect(parsed.id).toBe("req-000001");
    });

    it("outputs specification as JSON", async () => {
      const spec = makeSpecification({ version: "1.0" });
      mockSpecFindByIdOrThrow.mockResolvedValue(spec);
      mockApplyVersionBump.mockReturnValue("2.0");

      await versionCommand.parseAsync(["node", "test", "spec-000001", "--json"]);

      const output = consoleLogSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(output);
      expect(parsed.version).toBe("2.0");
      expect(parsed.id).toBe("spec-000001");
    });
  });
});
