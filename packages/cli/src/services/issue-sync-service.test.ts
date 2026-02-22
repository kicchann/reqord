import { describe, it, expect } from "vitest";

import { syncSpecification, syncAll } from "./issue-sync-service.js";

describe("syncSpecification", () => {
  it("throws an error indicating the feature is no longer supported", async () => {
    await expect(syncSpecification("/cwd", "spec-000001")).rejects.toThrow(
      "syncSpecification for spec-000001 is no longer supported"
    );
  });
});

describe("syncAll", () => {
  it("returns an empty array", async () => {
    const results = await syncAll("/cwd");
    expect(results).toEqual([]);
  });
});
