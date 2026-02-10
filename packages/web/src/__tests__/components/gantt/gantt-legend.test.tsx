// @vitest-environment jsdom
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { GanttLegend } from "@/components/gantt/gantt-legend";

describe("GanttLegend", () => {
  it("renders all 4 state labels", () => {
    render(<GanttLegend />);

    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getByText("Blocked")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("renders colored indicators for each state", () => {
    const { container } = render(<GanttLegend />);

    const indicators = container.querySelectorAll('[data-testid^="legend-indicator-"]');
    expect(indicators.length).toBe(4);
  });

  it("renders Completed with green color", () => {
    const { container } = render(<GanttLegend />);

    const completed = container.querySelector('[data-testid="legend-indicator-closed"]');
    expect(completed).toHaveStyle({ backgroundColor: "#22c55e" });
  });

  it("renders In Progress with blue color", () => {
    const { container } = render(<GanttLegend />);

    const inProgress = container.querySelector('[data-testid="legend-indicator-in_progress"]');
    expect(inProgress).toHaveStyle({ backgroundColor: "#3b82f6" });
  });

  it("renders Blocked with red color", () => {
    const { container } = render(<GanttLegend />);

    const blocked = container.querySelector('[data-testid="legend-indicator-blocked"]');
    expect(blocked).toHaveStyle({ backgroundColor: "#ef4444" });
  });

  it("renders Pending with gray color", () => {
    const { container } = render(<GanttLegend />);

    const pending = container.querySelector('[data-testid="legend-indicator-open"]');
    expect(pending).toHaveStyle({ backgroundColor: "#9ca3af" });
  });
});
