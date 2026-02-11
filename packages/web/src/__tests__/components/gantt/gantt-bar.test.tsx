// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { GanttBar } from "@/components/gantt/gantt-bar";
import type { GanttTask } from "@/lib/gantt-data";

describe("GanttBar", () => {
  const mockTask: GanttTask = {
    id: "1",
    title: "Test Task",
    issueNumber: 123,
    issueUrl: "https://github.com/test/repo/issues/123",
    priority: "P0",
    state: "open",
    estimatedHours: 4,
    startOffset: 0,
    dependencies: [],
    isCriticalPath: false,
  };

  it("renders closed state with green color", () => {
    const task = { ...mockTask, state: "closed" };
    const { container } = render(
      <svg>
        <GanttBar task={task} y={0} hourWidth={60} leftLabelWidth={200} />
      </svg>
    );

    const rect = container.querySelector("rect");
    expect(rect).toHaveAttribute("fill", "#22c55e");
  });

  it("renders in_progress state with blue color", () => {
    const task = { ...mockTask, state: "in_progress" };
    const { container } = render(
      <svg>
        <GanttBar task={task} y={0} hourWidth={60} leftLabelWidth={200} />
      </svg>
    );

    const rect = container.querySelector("rect");
    expect(rect).toHaveAttribute("fill", "#3b82f6");
  });

  it("renders blocked state with red color", () => {
    const task = { ...mockTask, state: "blocked" };
    const { container } = render(
      <svg>
        <GanttBar task={task} y={0} hourWidth={60} leftLabelWidth={200} />
      </svg>
    );

    const rect = container.querySelector("rect");
    expect(rect).toHaveAttribute("fill", "#ef4444");
  });

  it("renders open state with gray color", () => {
    const task = { ...mockTask, state: "open" };
    const { container } = render(
      <svg>
        <GanttBar task={task} y={0} hourWidth={60} leftLabelWidth={200} />
      </svg>
    );

    const rect = container.querySelector("rect");
    expect(rect).toHaveAttribute("fill", "#9ca3af");
  });

  it("renders bar with correct width based on estimatedHours", () => {
    const task = { ...mockTask, estimatedHours: 8 };
    const { container } = render(
      <svg>
        <GanttBar task={task} y={0} hourWidth={60} leftLabelWidth={200} />
      </svg>
    );

    const rect = container.querySelector("rect");
    expect(rect).toHaveAttribute("width", "480"); // 8 * 60
  });

  it("renders bar with correct x position based on startOffset", () => {
    const task = { ...mockTask, startOffset: 4, estimatedHours: 4 };
    const { container } = render(
      <svg>
        <GanttBar task={task} y={0} hourWidth={60} leftLabelWidth={200} />
      </svg>
    );

    const rect = container.querySelector("rect");
    expect(rect).toHaveAttribute("x", "440"); // 4 * 60 + 200
  });

  it("renders bar with correct y position", () => {
    const { container } = render(
      <svg>
        <GanttBar task={mockTask} y={100} hourWidth={60} leftLabelWidth={200} />
      </svg>
    );

    const rect = container.querySelector("rect");
    expect(rect).toHaveAttribute("y", "100");
  });

  it("renders bar with correct height", () => {
    const { container } = render(
      <svg>
        <GanttBar task={mockTask} y={0} hourWidth={60} leftLabelWidth={200} />
      </svg>
    );

    const rect = container.querySelector("rect");
    expect(rect).toHaveAttribute("height", "24"); // BAR_HEIGHT constant
  });

  it("calls onHover with task on mouse enter", () => {
    const onHover = vi.fn();
    const { container } = render(
      <svg>
        <GanttBar
          task={mockTask}
          y={0}
          hourWidth={60}
          leftLabelWidth={200}
          onHover={onHover}
        />
      </svg>
    );

    const group = container.querySelector("g");
    if (group) {
      fireEvent.mouseEnter(group);
    }
    expect(onHover).toHaveBeenCalledWith(mockTask);
  });

  it("calls onHover with null on mouse leave", () => {
    const onHover = vi.fn();
    const { container } = render(
      <svg>
        <GanttBar
          task={mockTask}
          y={0}
          hourWidth={60}
          leftLabelWidth={200}
          onHover={onHover}
        />
      </svg>
    );

    const group = container.querySelector("g");
    if (group) {
      fireEvent.mouseLeave(group);
    }
    expect(onHover).toHaveBeenCalledWith(null);
  });

  it("calls onClick with task when clicked", () => {
    const onClick = vi.fn();
    const { container } = render(
      <svg>
        <GanttBar
          task={mockTask}
          y={0}
          hourWidth={60}
          leftLabelWidth={200}
          onClick={onClick}
        />
      </svg>
    );

    const group = container.querySelector("g");
    if (group) {
      fireEvent.click(group);
    }
    expect(onClick).toHaveBeenCalledWith(mockTask);
  });

  it("renders task title as text", () => {
    const { container } = render(
      <svg>
        <GanttBar task={mockTask} y={0} hourWidth={60} leftLabelWidth={200} />
      </svg>
    );

    const text = container.querySelector("text");
    expect(text).toHaveTextContent("Test Task");
  });
});
