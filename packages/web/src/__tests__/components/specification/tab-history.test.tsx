// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { VersionHistoryEntry } from "@reqord/shared";
import { TabHistory } from "../../../components/specification/tab-history";

describe("TabHistory", () => {
  afterEach(() => {
    cleanup();
  });

  const mockHistory: VersionHistoryEntry[] = [
    {
      version: "2.1.0",
      status: "approved",
      changedAt: "2026-02-10T10:00:00Z",
      summary: "Added new feature X",
    },
    {
      version: "2.0.0",
      status: "implemented",
      changedAt: "2026-02-01T10:00:00Z",
      summary: "Implemented core functionality",
    },
    {
      version: "1.0.0",
      status: "draft",
      changedAt: "2026-01-15T10:00:00Z",
      summary: "Initial draft specification",
    },
  ];

  it("renders timeline with all version history entries", () => {
    render(<TabHistory versionHistory={mockHistory} />);

    expect(screen.getByText("2.1.0")).toBeInTheDocument();
    expect(screen.getByText("2.0.0")).toBeInTheDocument();
    expect(screen.getByText("1.0.0")).toBeInTheDocument();

    expect(screen.getByText("Added new feature X")).toBeInTheDocument();
    expect(screen.getByText("Implemented core functionality")).toBeInTheDocument();
    expect(screen.getByText("Initial draft specification")).toBeInTheDocument();
  });

  it("shows empty state when versionHistory is empty array", () => {
    render(<TabHistory versionHistory={[]} />);

    expect(screen.getByText("No version history yet")).toBeInTheDocument();
    expect(screen.queryByText("2.1.0")).not.toBeInTheDocument();
  });

  it("latest version (first entry) is highlighted with ring", () => {
    const { container } = render(<TabHistory versionHistory={mockHistory} />);

    const dots = container.querySelectorAll(".absolute.-left-\\[33px\\]");
    expect(dots.length).toBeGreaterThan(0);

    // First dot should have ring-2 and ring-blue-500
    const firstDot = dots[0];
    expect(firstDot.className).toContain("ring-2");
    expect(firstDot.className).toContain("ring-blue-500");
    expect(firstDot.className).toContain("bg-blue-500");
  });

  it("older versions have gray dots without ring", () => {
    const { container } = render(<TabHistory versionHistory={mockHistory} />);

    const dots = container.querySelectorAll(".absolute.-left-\\[33px\\]");

    // Second and third dots should have bg-gray-400 and no ring
    if (dots.length > 1) {
      const secondDot = dots[1];
      expect(secondDot.className).toContain("bg-gray-400");
      expect(secondDot.className).not.toContain("ring-2");
    }
  });

  it("renders timeline with left border", () => {
    const { container } = render(<TabHistory versionHistory={mockHistory} />);

    const timeline = container.querySelector(".border-l-2");
    expect(timeline).toBeInTheDocument();
  });

  it("displays dates in localized format", () => {
    const singleEntry: VersionHistoryEntry[] = [
      {
        version: "1.0.0",
        status: "draft",
          changedAt: "2026-02-10T10:00:00Z",
        summary: "Initial version",
      },
    ];

    render(<TabHistory versionHistory={singleEntry} />);

    // Date should be rendered (format depends on locale, so just check it's there)
    const dateElement = screen.getByText(/2026/);
    expect(dateElement).toBeInTheDocument();
  });

  it("displays status badges for each entry", () => {
    render(<TabHistory versionHistory={mockHistory} />);

    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.getByText("Implemented")).toBeInTheDocument();
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  it("renders dots with correct size", () => {
    const { container } = render(<TabHistory versionHistory={mockHistory} />);

    const dots = container.querySelectorAll(".w-3.h-3");
    expect(dots.length).toBe(mockHistory.length);
  });
});
