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

  it("applies bold styling to open items", () => {
    const items: CriticalPathItem[] = [
      {
        issueNumber: 100,
        title: "Open task",
        url: "https://github.com/repo/issues/100",
        priority: "high",
        status: "open",
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

  it("renders issue number as GitHub link", () => {
    const items: CriticalPathItem[] = [
      {
        issueNumber: 42,
        title: "Linked task",
        url: "https://github.com/repo/issues/42",
        priority: "high",
        status: "open",
        estimatedHours: 4,
        specId: "spec-000001",
      },
    ];

    render(<CriticalPathDisplay items={items} />);

    const link = screen.getByRole("link", { name: "#42" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute(
      "href",
      "https://github.com/kicchann/reqord/issues/42"
    );
  });

  it("applies red badge to high priority (P1) items", () => {
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

    const badge = screen.getByText("high");
    expect(badge).toHaveClass("bg-red-100");
  });

  it("applies orange badge to medium priority (P2) items", () => {
    const items: CriticalPathItem[] = [
      {
        issueNumber: 101,
        title: "Medium priority task",
        url: "https://github.com/repo/issues/101",
        priority: "medium",
        status: "open",
        estimatedHours: 8,
        specId: "spec-000002",
      },
    ];

    render(<CriticalPathDisplay items={items} />);

    const badge = screen.getByText("medium");
    expect(badge).toHaveClass("bg-orange-100");
  });
});
