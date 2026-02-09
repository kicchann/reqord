import { describe, it, expect, vi, beforeEach } from "vitest";
import { ensureReqordInitialized } from "./reqord-check.js";
import { AppError, ErrorCode } from "../utils/errors.js";

// Mock the file-system module
vi.mock("../repositories/file-system.js", () => ({
  exists: vi.fn(),
}));

// Import the mocked function
const { exists } = await import("../repositories/file-system.js");

describe("ensureReqordInitialized", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should resolve without error when .reqord/ directory exists", async () => {
    vi.mocked(exists).mockResolvedValue(true);

    await expect(
      ensureReqordInitialized("/home/user/project"),
    ).resolves.toBeUndefined();
  });

  it("should verify path.join is called with correct arguments", async () => {
    vi.mocked(exists).mockResolvedValue(true);

    await ensureReqordInitialized("/home/user/project");

    expect(exists).toHaveBeenCalledWith("/home/user/project/.reqord");
  });

  it("should throw AppError with UNINITIALIZED code when .reqord/ does not exist", async () => {
    vi.mocked(exists).mockResolvedValue(false);

    await expect(ensureReqordInitialized("/home/user/project")).rejects.toThrow(
      AppError,
    );

    try {
      await ensureReqordInitialized("/home/user/project");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe(ErrorCode.UNINITIALIZED);
    }
  });

  it("should include 'reqord init' in error message when .reqord/ does not exist", async () => {
    vi.mocked(exists).mockResolvedValue(false);

    await expect(ensureReqordInitialized("/home/user/project")).rejects.toThrow(
      /reqord init/i,
    );
  });

  it("should include '.reqord/' in error message when directory does not exist", async () => {
    vi.mocked(exists).mockResolvedValue(false);

    await expect(ensureReqordInitialized("/home/user/project")).rejects.toThrow(
      /\.reqord\//,
    );
  });
});
