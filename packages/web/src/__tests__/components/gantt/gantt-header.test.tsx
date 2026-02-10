// @vitest-environment jsdom
import React from "react";
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { GanttHeader } from "@/components/gantt/gantt-header";

describe("GanttHeader", () => {
  it("renders hour markers from 0 to timelineEnd", () => {
    const { container } = render(
      <svg>
        <GanttHeader timelineEnd={16} hourWidth={60} leftLabelWidth={200} />
      </svg>
    );

    const texts = container.querySelectorAll("text");
    expect(texts.length).toBeGreaterThan(0);
  });

  it("renders hour labels at 4-hour intervals", () => {
    const { container } = render(
      <svg>
        <GanttHeader timelineEnd={16} hourWidth={60} leftLabelWidth={200} />
      </svg>
    );

    const texts = Array.from(container.querySelectorAll("text")).map(
      (el) => el.textContent
    );
    expect(texts).toContain("0h");
    expect(texts).toContain("4h");
    expect(texts).toContain("8h");
    expect(texts).toContain("12h");
    expect(texts).toContain("16h");
  });

  it("renders correct number of markers for timelineEnd=16", () => {
    const { container } = render(
      <svg>
        <GanttHeader timelineEnd={16} hourWidth={60} leftLabelWidth={200} />
      </svg>
    );

    const texts = Array.from(container.querySelectorAll("text"));
    expect(texts.length).toBe(5); // 0, 4, 8, 12, 16
  });

  it("positions hour markers correctly with hourWidth", () => {
    const { container } = render(
      <svg>
        <GanttHeader timelineEnd={8} hourWidth={60} leftLabelWidth={200} />
      </svg>
    );

    const texts = Array.from(container.querySelectorAll("text"));
    const firstText = texts[0];
    expect(firstText).toHaveAttribute("x", "200"); // leftLabelWidth + 0 * hourWidth

    const secondText = texts[1];
    expect(secondText).toHaveAttribute("x", "440"); // leftLabelWidth + 4 * hourWidth
  });

  it("renders vertical lines for each marker", () => {
    const { container } = render(
      <svg>
        <GanttHeader timelineEnd={8} hourWidth={60} leftLabelWidth={200} />
      </svg>
    );

    const lines = container.querySelectorAll("line");
    expect(lines.length).toBe(3); // 0, 4, 8
  });

  it("handles timelineEnd=0 gracefully", () => {
    const { container } = render(
      <svg>
        <GanttHeader timelineEnd={0} hourWidth={60} leftLabelWidth={200} />
      </svg>
    );

    const texts = container.querySelectorAll("text");
    expect(texts.length).toBe(1); // Only 0h marker
  });
});
