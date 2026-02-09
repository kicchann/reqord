import { describe, it, expect } from "vitest";
import { FEEDBACK_DIR } from "./paths.js";

describe("paths constants", () => {
  it("should define FEEDBACK_DIR constant", () => {
    expect(FEEDBACK_DIR).toBe("feedback");
  });
});
