import { describe, it, expect } from "vitest";
import { parseSpecTag } from "./spec-tag-parser.js";

describe("parseSpecTag", () => {
  it("parses tag with specificationId only", () => {
    const body = '<!-- reqord:specification {"specificationId":"spec-000022"} -->\n\n## Task';
    const result = parseSpecTag(body);
    expect(result).toEqual({ specificationId: "spec-000022" });
  });

  it("parses tag with all fields", () => {
    const body = '<!-- reqord:specification {"specificationId":"spec-000022","priority":"P1","estimatedHours":8} -->\n\n## Task';
    const result = parseSpecTag(body);
    expect(result).toEqual({
      specificationId: "spec-000022",
      priority: "P1",
      estimatedHours: 8,
    });
  });

  it("returns null when no tag found", () => {
    const body = "## Task\n\nSome description";
    expect(parseSpecTag(body)).toBeNull();
  });

  it("returns null for empty body", () => {
    expect(parseSpecTag("")).toBeNull();
  });

  it("returns null for invalid JSON in tag", () => {
    const body = "<!-- reqord:specification {invalid json} -->";
    expect(parseSpecTag(body)).toBeNull();
  });

  it("returns null when specificationId is missing", () => {
    const body = '<!-- reqord:specification {"priority":"P1"} -->';
    expect(parseSpecTag(body)).toBeNull();
  });

  it("returns null when specificationId is not a string", () => {
    const body = '<!-- reqord:specification {"specificationId":123} -->';
    expect(parseSpecTag(body)).toBeNull();
  });

  it("ignores invalid priority value", () => {
    const body = '<!-- reqord:specification {"specificationId":"spec-000022","priority":"HIGH"} -->';
    const result = parseSpecTag(body);
    expect(result).toEqual({ specificationId: "spec-000022" });
  });

  it("ignores negative estimatedHours", () => {
    const body = '<!-- reqord:specification {"specificationId":"spec-000022","estimatedHours":-5} -->';
    const result = parseSpecTag(body);
    expect(result).toEqual({ specificationId: "spec-000022" });
  });

  it("ignores non-number estimatedHours", () => {
    const body = '<!-- reqord:specification {"specificationId":"spec-000022","estimatedHours":"eight"} -->';
    const result = parseSpecTag(body);
    expect(result).toEqual({ specificationId: "spec-000022" });
  });

  it("handles tag with extra whitespace", () => {
    const body = '<!-- reqord:specification  {"specificationId":"spec-000022"}  -->';
    const result = parseSpecTag(body);
    expect(result).toEqual({ specificationId: "spec-000022" });
  });

  it("handles tag embedded in multiline body", () => {
    const body = `Some text before

<!-- reqord:specification {"specificationId":"spec-000025","priority":"P0","estimatedHours":16} -->

## Implementation

More text here`;
    const result = parseSpecTag(body);
    expect(result).toEqual({
      specificationId: "spec-000025",
      priority: "P0",
      estimatedHours: 16,
    });
  });
});
