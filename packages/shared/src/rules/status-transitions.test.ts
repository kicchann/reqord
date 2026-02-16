import { describe, it, expect } from "vitest";
import {
  STATUS_TRANSITIONS,
  isValidTransition,
  getAvailableTransitions,
} from "./status-transitions.js";
import type { Status } from "../schemas/common.js";

describe("STATUS_TRANSITIONS", () => {
  it("draftからapprovedとdeprecatedに遷移できる", () => {
    expect(STATUS_TRANSITIONS.draft).toEqual(["approved", "deprecated"]);
  });

  it("approvedからimplementedとdeprecatedに遷移できる", () => {
    expect(STATUS_TRANSITIONS.approved).toEqual([
      "implemented",
      "deprecated",
    ]);
  });

  it("implementedからdeprecatedにのみ遷移できる", () => {
    expect(STATUS_TRANSITIONS.implemented).toEqual(["deprecated"]);
  });

  it("deprecatedからはどこにも遷移できない", () => {
    expect(STATUS_TRANSITIONS.deprecated).toEqual([]);
  });
});

describe("isValidTransition", () => {
  it("有効な遷移はtrueを返す", () => {
    expect(isValidTransition("draft", "approved")).toBe(true);
    expect(isValidTransition("draft", "deprecated")).toBe(true);
    expect(isValidTransition("approved", "implemented")).toBe(true);
    expect(isValidTransition("approved", "deprecated")).toBe(true);
    expect(isValidTransition("implemented", "deprecated")).toBe(true);
  });

  it("無効な遷移はfalseを返す", () => {
    expect(isValidTransition("deprecated", "draft")).toBe(false);
    expect(isValidTransition("implemented", "approved")).toBe(false);
    expect(isValidTransition("implemented", "draft")).toBe(false);
    expect(isValidTransition("approved", "draft")).toBe(false);
    expect(isValidTransition("deprecated", "approved")).toBe(false);
  });

  it("同一ステータスへの遷移はfalseを返す", () => {
    const statuses: Status[] = ["draft", "approved", "implemented", "deprecated"];
    for (const status of statuses) {
      expect(isValidTransition(status, status)).toBe(false);
    }
  });
});

describe("getAvailableTransitions", () => {
  it("各ステータスの遷移先を正しく返す", () => {
    expect(getAvailableTransitions("draft")).toEqual(["approved", "deprecated"]);
    expect(getAvailableTransitions("approved")).toEqual([
      "implemented",
      "deprecated",
    ]);
    expect(getAvailableTransitions("implemented")).toEqual(["deprecated"]);
    expect(getAvailableTransitions("deprecated")).toEqual([]);
  });
});
