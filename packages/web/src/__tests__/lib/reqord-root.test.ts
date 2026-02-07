import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("getReqordRoot", () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.REQORD_ROOT;
    // Clear module cache to reset the cached root
    vi.resetModules();
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.REQORD_ROOT = originalEnv;
    } else {
      delete process.env.REQORD_ROOT;
    }
  });

  it("returns the REQORD_ROOT env value", async () => {
    process.env.REQORD_ROOT = "/test/path";
    const { getReqordRoot } = await import("../../lib/reqord-root");
    expect(getReqordRoot()).toBe("/test/path");
  });

  it("throws when REQORD_ROOT is not set", async () => {
    delete process.env.REQORD_ROOT;
    const { getReqordRoot } = await import("../../lib/reqord-root");
    expect(() => getReqordRoot()).toThrow("REQORD_ROOT");
  });
});
