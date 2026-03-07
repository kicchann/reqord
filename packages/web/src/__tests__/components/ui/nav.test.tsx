// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { Nav } from "../../../components/ui/nav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/requirements",
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

describe("Nav", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders all navigation items", () => {
    render(<Nav />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Requirements")).toBeInTheDocument();
    expect(screen.getByText("Specifications")).toBeInTheDocument();
    expect(screen.getByText("Feedback")).toBeInTheDocument();
    expect(screen.getByText("Graph")).toBeInTheDocument();
  });

  it("renders the Reqord brand link", () => {
    render(<Nav />);

    const brandLogo = screen.getByAltText("Reqord");
    expect(brandLogo).toBeInTheDocument();
    expect(brandLogo.closest("a")).toHaveAttribute("href", "/dashboard");
  });

  it("applies active styles to the current path link", () => {
    render(<Nav />);

    const requirementsLink = screen.getByText("Requirements").closest("a");
    expect(requirementsLink).toHaveClass("bg-warm-200");
    expect(requirementsLink).toHaveClass("text-warm-900");
  });

  it("applies inactive styles to non-active links", () => {
    render(<Nav />);

    const dashboardLink = screen.getByText("Dashboard").closest("a");
    expect(dashboardLink).toHaveClass("text-warm-700");
    expect(dashboardLink).not.toHaveClass("bg-warm-200");
  });

  it("each nav item has correct href", () => {
    render(<Nav />);

    expect(screen.getByText("Dashboard").closest("a")).toHaveAttribute(
      "href",
      "/dashboard"
    );
    expect(screen.getByText("Requirements").closest("a")).toHaveAttribute(
      "href",
      "/requirements"
    );
    expect(screen.getByText("Specifications").closest("a")).toHaveAttribute(
      "href",
      "/specifications"
    );
    expect(screen.getByText("Feedback").closest("a")).toHaveAttribute(
      "href",
      "/feedback"
    );
    expect(screen.getByText("Graph").closest("a")).toHaveAttribute(
      "href",
      "/graph"
    );
  });
});
