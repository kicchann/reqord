// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { IssueItem } from "../../../components/specification/tab-issues";
import { TabIssues } from "../../../components/specification/tab-issues";

describe("TabIssues", () => {
  afterEach(() => {
    cleanup();
  });

  const mockIssues: IssueItem[] = [
    {
      number: 123,
      title: "Implement user authentication",
      url: "https://github.com/user/repo/issues/123",
      priority: "P0",
      status: "open",
    },
    {
      number: 124,
      title: "Add validation for form inputs",
      url: "https://github.com/user/repo/issues/124",
      priority: "P1",
      status: "in_progress",
    },
    {
      number: 125,
      title: "Update documentation",
      url: "https://github.com/user/repo/issues/125",
      priority: "P2",
      status: "closed",
    },
  ];

  it("renders table with correct number of rows when issues are provided", () => {
    render(<TabIssues issues={mockIssues} />);

    // Check for table headers
    expect(screen.getByText("#")).toBeInTheDocument();
    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("Priority")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Link")).toBeInTheDocument();

    // Check for all issue titles
    expect(screen.getByText("Implement user authentication")).toBeInTheDocument();
    expect(screen.getByText("Add validation for form inputs")).toBeInTheDocument();
    expect(screen.getByText("Update documentation")).toBeInTheDocument();
  });

  it("shows empty state when issues is null", () => {
    render(<TabIssues issues={null} />);

    expect(screen.getByText("No issues generated yet")).toBeInTheDocument();
    expect(screen.queryByText("#")).not.toBeInTheDocument();
  });

  it("shows empty state when issues is empty array", () => {
    render(<TabIssues issues={[]} />);

    expect(screen.getByText("No issues generated yet")).toBeInTheDocument();
    expect(screen.queryByText("#")).not.toBeInTheDocument();
  });

  it("each row has a GitHub URL link", () => {
    render(<TabIssues issues={mockIssues} />);

    const links = screen.getAllByText("View");
    expect(links).toHaveLength(3);

    expect(links[0]).toHaveAttribute("href", "https://github.com/user/repo/issues/123");
    expect(links[0]).toHaveAttribute("target", "_blank");
    expect(links[0]).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("priority badges have correct colors", () => {
    render(<TabIssues issues={mockIssues} />);

    const p0Badge = screen.getByText("P0");
    const p1Badge = screen.getByText("P1");
    const p2Badge = screen.getByText("P2");

    expect(p0Badge.className).toContain("bg-red-100");
    expect(p0Badge.className).toContain("text-red-800");
    expect(p1Badge.className).toContain("bg-orange-100");
    expect(p1Badge.className).toContain("text-orange-800");
    expect(p2Badge.className).toContain("bg-yellow-100");
    expect(p2Badge.className).toContain("text-yellow-800");
  });

  it("status badges have correct colors", () => {
    render(<TabIssues issues={mockIssues} />);

    const openBadge = screen.getByText("open");
    const inProgressBadge = screen.getByText("in_progress");
    const closedBadge = screen.getByText("closed");

    expect(openBadge.className).toContain("bg-gray-100");
    expect(openBadge.className).toContain("text-gray-800");
    expect(inProgressBadge.className).toContain("bg-blue-100");
    expect(inProgressBadge.className).toContain("text-blue-800");
    expect(closedBadge.className).toContain("bg-green-100");
    expect(closedBadge.className).toContain("text-green-800");
  });

  it("renders P3 priority with gray color", () => {
    const p3Issue: IssueItem[] = [
      {
        number: 126,
        title: "Low priority task",
        url: "https://github.com/user/repo/issues/126",
        priority: "P3",
        status: "open",
      },
    ];

    render(<TabIssues issues={p3Issue} />);

    const p3Badge = screen.getByText("P3");
    expect(p3Badge.className).toContain("bg-gray-100");
    expect(p3Badge.className).toContain("text-gray-800");
  });
});
