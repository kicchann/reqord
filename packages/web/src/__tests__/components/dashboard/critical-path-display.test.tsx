// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { CriticalPathDisplay } from "../../../components/dashboard/critical-path-display";
import type { CriticalPathItem } from "../../../lib/dashboard-data";

describe("CriticalPathDisplay", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders all critical path items", () => {
    const items: CriticalPathItem[] = [
      {
        issueNumber: 100,
        title: "Implement feature A",
        url: "https://github.com/repo/issues/100",
        priority: "high",
        status: "open",
        estimatedHours: 8,
        specId: "spec-000001",
      },
      {
        issueNumber: 101,
        title: "Implement feature B",
        url: "https://github.com/repo/issues/101",
        priority: "medium",
        status: "in_progress",
        estimatedHours: 16,
        specId: "spec-000002",
      },
    ];

    render(<CriticalPathDisplay items={items} />);

    expect(screen.getByText("#100")).toBeInTheDocument();
    expect(screen.getByText("Implement feature A")).toBeInTheDocument();
    expect(screen.getByText("#101")).toBeInTheDocument();
    expect(screen.getByText("Implement feature B")).toBeInTheDocument();
  });

  it("applies line-through decoration to closed items", () => {
    const items: CriticalPathItem[] = [
      {
        issueNumber: 100,
        title: "Completed task",
        url: "https://github.com/repo/issues/100",
        priority: "high",
        status: "closed",
        estimatedHours: 8,
        specId: "spec-000001",
      },
    ];

    render(<CriticalPathDisplay items={items} />);

    const item = screen.getByTestId("critical-path-item");
    expect(item).toHaveClass("line-through");
  });

  it("applies bold styling to pending items", () => {
    const items: CriticalPathItem[] = [
      {
        issueNumber: 100,
        title: "Pending task",
        url: "https://github.com/repo/issues/100",
        priority: "high",
        status: "pending",
        estimatedHours: 8,
        specId: "spec-000001",
      },
    ];

    render(<CriticalPathDisplay items={items} />);

    const item = screen.getByTestId("critical-path-item");
    expect(item).toHaveClass("font-bold");
  });

  it("applies bold styling to in_progress items", () => {
    const items: CriticalPathItem[] = [
      {
        issueNumber: 100,
        title: "In progress task",
        url: "https://github.com/repo/issues/100",
        priority: "high",
        status: "in_progress",
        estimatedHours: 8,
        specId: "spec-000001",
      },
    ];

    render(<CriticalPathDisplay items={items} />);

    const item = screen.getByTestId("critical-path-item");
    expect(item).toHaveClass("font-bold");
  });

  it("displays priority badges", () => {
    const items: CriticalPathItem[] = [
      {
        issueNumber: 100,
        title: "High priority task",
        url: "https://github.com/repo/issues/100",
        priority: "high",
        status: "open",
        estimatedHours: 8,
        specId: "spec-000001",
      },
    ];

    render(<CriticalPathDisplay items={items} />);

    expect(screen.getByText("high")).toBeInTheDocument();
  });

  it("renders empty list when no items", () => {
    const items: CriticalPathItem[] = [];

    const { container } = render(<CriticalPathDisplay items={items} />);

    const listItems = container.querySelectorAll(
      '[data-testid="critical-path-item"]'
    );
    expect(listItems).toHaveLength(0);
  });
});
