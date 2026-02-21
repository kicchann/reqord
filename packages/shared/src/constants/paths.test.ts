import { describe, it, expect } from "vitest";
import { FEEDBACK_DIR, ISSUES_DIR } from "./paths.js";

describe("paths constants", () => {
  it("should define FEEDBACK_DIR constant", () => {
    expect(FEEDBACK_DIR).toBe("feedback");
  });

  it("should define ISSUES_DIR constant", () => {
    expect(ISSUES_DIR).toBe("issues");
  });
});
