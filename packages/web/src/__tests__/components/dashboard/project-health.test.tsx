// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { ProjectHealth } from "../../../components/dashboard/project-health";

describe("ProjectHealth", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders score with emerald color when score >= 80", () => {
    render(<ProjectHealth score={85} />);

    const scoreElement = screen.getByTestId("health-score");
    expect(scoreElement).toBeInTheDocument();
    expect(scoreElement).toHaveTextContent("85");
    expect(scoreElement).toHaveClass("text-emerald-300");
  });

  it("renders score with yellow color when score >= 50 and < 80", () => {
    render(<ProjectHealth score={65} />);

    const scoreElement = screen.getByTestId("health-score");
    expect(scoreElement).toHaveTextContent("65");
    expect(scoreElement).toHaveClass("text-yellow-300");
  });

  it("renders score with red color when score < 50", () => {
    render(<ProjectHealth score={30} />);

    const scoreElement = screen.getByTestId("health-score");
    expect(scoreElement).toHaveTextContent("30");
    expect(scoreElement).toHaveClass("text-red-300");
  });

  it("renders score at boundary (score = 80) as emerald", () => {
    render(<ProjectHealth score={80} />);

    const scoreElement = screen.getByTestId("health-score");
    expect(scoreElement).toHaveClass("text-emerald-300");
  });

  it("renders score at boundary (score = 50) as yellow", () => {
    render(<ProjectHealth score={50} />);

    const scoreElement = screen.getByTestId("health-score");
    expect(scoreElement).toHaveClass("text-yellow-300");
  });

  it("displays '/ 100' label", () => {
    render(<ProjectHealth score={75} />);

    expect(screen.getByText("/ 100")).toBeInTheDocument();
  });

  it("renders as hero card with brand gradient background", () => {
    render(<ProjectHealth score={75} />);

    const container = screen.getByTestId("health-score").closest("div[class*='from-brand']");
    expect(container).not.toBeNull();
  });

  it("rounds fractional score for display", () => {
    render(<ProjectHealth score={84.6} />);

    const scoreElement = screen.getByTestId("health-score");
    expect(scoreElement).toHaveTextContent("85");
  });
});
