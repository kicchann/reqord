// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { StatusCard } from "../../../components/dashboard/status-card";
import type { StatusBreakdown } from "../../../lib/dashboard-data";

describe("StatusCard", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders title and total count", () => {
    const breakdown: StatusBreakdown = { draft: 5, approved: 3 };
    render(<StatusCard title="Requirements" total={8} breakdown={breakdown} />);

    expect(screen.getByText("Requirements")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
  });

  it("renders breakdown badges for each status", () => {
    const breakdown: StatusBreakdown = { draft: 5, approved: 3 };
    render(<StatusCard title="Requirements" total={8} breakdown={breakdown} />);

    expect(screen.getByText("draft: 5")).toBeInTheDocument();
    expect(screen.getByText("approved: 3")).toBeInTheDocument();
  });

  it("applies rounded-xl class to the card container", () => {
    const breakdown: StatusBreakdown = { draft: 2 };
    const { container } = render(
      <StatusCard title="Test" total={2} breakdown={breakdown} />
    );

    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass("rounded-xl");
  });

  it("applies draft badge styling to draft status", () => {
    const breakdown: StatusBreakdown = { draft: 3 };
    render(<StatusCard title="Test" total={3} breakdown={breakdown} />);

    const draftBadge = screen.getByText("draft: 3");
    expect(draftBadge).toHaveClass("bg-gray-100");
    expect(draftBadge).toHaveClass("text-gray-600");
  });

  it("applies approved badge styling to approved status", () => {
    const breakdown: StatusBreakdown = { approved: 2 };
    render(<StatusCard title="Test" total={2} breakdown={breakdown} />);

    const approvedBadge = screen.getByText("approved: 2");
    expect(approvedBadge).toHaveClass("bg-blue-50");
    expect(approvedBadge).toHaveClass("text-blue-700");
  });

  it("applies implemented badge styling to implemented status", () => {
    const breakdown: StatusBreakdown = { implemented: 4 };
    render(<StatusCard title="Test" total={4} breakdown={breakdown} />);

    const implementedBadge = screen.getByText("implemented: 4");
    expect(implementedBadge).toHaveClass("bg-emerald-50");
    expect(implementedBadge).toHaveClass("text-emerald-700");
  });

  it("applies deprecated badge styling to deprecated status", () => {
    const breakdown: StatusBreakdown = { deprecated: 1 };
    render(<StatusCard title="Test" total={1} breakdown={breakdown} />);

    const deprecatedBadge = screen.getByText("deprecated: 1");
    expect(deprecatedBadge).toHaveClass("bg-red-50");
    expect(deprecatedBadge).toHaveClass("text-red-700");
  });

  it("applies hover shadow transition", () => {
    const breakdown: StatusBreakdown = { draft: 1 };
    const { container } = render(
      <StatusCard title="Test" total={1} breakdown={breakdown} />
    );

    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass("hover:shadow-md");
    expect(card).toHaveClass("transition-shadow");
  });
});
