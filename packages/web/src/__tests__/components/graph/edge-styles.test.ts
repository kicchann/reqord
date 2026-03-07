import { describe, it, expect } from "vitest";
import { EDGE_STYLES } from "../../../components/graph/edge-styles";

describe("EDGE_STYLES", () => {
  it("dependency has stroke #94a3b8 (slate-400) and strokeWidth 2 (brand color system)", () => {
    expect(EDGE_STYLES.dependency).toEqual({
      stroke: "#94a3b8",
      strokeWidth: 2,
    });
  });

  it("implements has stroke #6366f1 (brand indigo), strokeWidth 2, and strokeDasharray '5,5'", () => {
    expect(EDGE_STYLES.implements).toEqual({
      stroke: "#6366f1",
      strokeWidth: 2,
      strokeDasharray: "5,5",
    });
  });

  it("tracks has stroke #a855f7 (purple), strokeWidth 1.5, and strokeDasharray '2,2'", () => {
    expect(EDGE_STYLES.tracks).toEqual({
      stroke: "#a855f7",
      strokeWidth: 1.5,
      strokeDasharray: "2,2",
    });
  });
});
