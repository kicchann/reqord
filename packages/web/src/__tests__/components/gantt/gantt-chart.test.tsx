// @vitest-environment jsdom
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { GanttChart } from "@/components/gantt/gantt-chart";
import type { GanttData } from "@/lib/gantt-data";

describe("GanttChart", () => {
  const mockData: GanttData = {
    specId: "spec-000001",
    groups: [
      {
        priority: "P0",
        label: "P0: Sequential",
        tasks: [
          {
            id: "1",
            title: "Task 1",
            issueNumber: 100,
            issueUrl: "https://github.com/test/repo/issues/100",
            priority: "P0",
            state: "closed",
            estimatedHours: 4,
            startOffset: 0,
            dependencies: [],
            isCriticalPath: true,
          },
          {
            id: "2",
            title: "Task 2",
            issueNumber: 101,
            issueUrl: "https://github.com/test/repo/issues/101",
            priority: "P0",
            state: "in_progress",
            estimatedHours: 4,
            startOffset: 4,
            dependencies: [100],
            isCriticalPath: true,
          },
        ],
      },
      {
        priority: "P1",
        label: "P1: Parallel",
        tasks: [
          {
            id: "3",
            title: "Task 3",
            issueNumber: 102,
            issueUrl: "https://github.com/test/repo/issues/102",
            priority: "P1",
            state: "open",
            estimatedHours: 4,
            startOffset: 8,
            dependencies: [],
            isCriticalPath: false,
          },
        ],
      },
    ],
    totalEstimatedHours: 12,
    timelineStart: 0,
    timelineEnd: 12,
  };

  it("renders SVG element", () => {
    const { container } = render(<GanttChart data={mockData} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("renders correct number of task bars", () => {
    const { container } = render(<GanttChart data={mockData} />);
    const rects = container.querySelectorAll("rect");
    // Each task has a rect, plus group headers
    expect(rects.length).toBeGreaterThanOrEqual(3); // 3 tasks minimum
  });

  it("renders group labels", () => {
    render(<GanttChart data={mockData} />);
    const labels = screen.getAllByText("P0: Sequential");
    expect(labels.length).toBeGreaterThanOrEqual(1);
    const p1Labels = screen.getAllByText("P1: Parallel");
    expect(p1Labels.length).toBeGreaterThanOrEqual(1);
  });

  it("renders legend component", () => {
    render(<GanttChart data={mockData} />);
    const completed = screen.getAllByText("Completed");
    expect(completed.length).toBeGreaterThanOrEqual(1);
    const inProgress = screen.getAllByText("In Progress");
    expect(inProgress.length).toBeGreaterThanOrEqual(1);
  });

  it("renders empty chart when no groups", () => {
    const emptyData: GanttData = {
      specId: "spec-000001",
      groups: [],
      totalEstimatedHours: 0,
      timelineStart: 0,
      timelineEnd: 0,
    };

    const { container } = render(<GanttChart data={emptyData} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("handles single task", () => {
    const singleTaskData: GanttData = {
      specId: "spec-000001",
      groups: [
        {
          priority: "P0",
          label: "P0: Sequential",
          tasks: [
            {
              id: "1",
              title: "Only Task",
              issueNumber: 100,
              issueUrl: "https://github.com/test/repo/issues/100",
              priority: "P0",
              state: "open",
              estimatedHours: 4,
              startOffset: 0,
              dependencies: [],
              isCriticalPath: true,
            },
          ],
        },
      ],
      totalEstimatedHours: 4,
      timelineStart: 0,
      timelineEnd: 4,
    };

    render(<GanttChart data={singleTaskData} />);
    expect(screen.getByText("Only Task")).toBeInTheDocument();
  });
});
