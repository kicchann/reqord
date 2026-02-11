import { describe, it, expect } from "vitest";
import { EDGE_STYLES } from "../../../components/graph/edge-styles";

describe("EDGE_STYLES", () => {
  it("dependency has stroke #64748b and strokeWidth 2", () => {
    expect(EDGE_STYLES.dependency).toEqual({
      stroke: "#64748b",
      strokeWidth: 2,
    });
  });

  it("implements has stroke #3b82f6, strokeWidth 2, and strokeDasharray '5,5'", () => {
    expect(EDGE_STYLES.implements).toEqual({
      stroke: "#3b82f6",
      strokeWidth: 2,
      strokeDasharray: "5,5",
    });
  });

  it("tracks has stroke #22c55e, strokeWidth 1.5, and strokeDasharray '2,2'", () => {
    expect(EDGE_STYLES.tracks).toEqual({
      stroke: "#22c55e",
      strokeWidth: 1.5,
      strokeDasharray: "2,2",
    });
  });
});
