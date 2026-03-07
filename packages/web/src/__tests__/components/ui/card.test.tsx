// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { Card } from "../../../components/ui/card";

describe("Card", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders children correctly", () => {
    render(<Card>Card content</Card>);

    expect(screen.getByText("Card content")).toBeInTheDocument();
  });

  it("renders default variant with standard styles", () => {
    render(<Card data-testid="card">Content</Card>);

    const card = screen.getByTestId("card");
    expect(card).toHaveClass("rounded-xl");
    expect(card).toHaveClass("border");
    expect(card).toHaveClass("border-gray-200");
    expect(card).toHaveClass("bg-white");
    expect(card).toHaveClass("p-6");
    expect(card).toHaveClass("shadow-sm");
  });

  it("renders hero variant with gradient background", () => {
    render(<Card variant="hero" data-testid="hero-card">Hero content</Card>);

    const card = screen.getByTestId("hero-card");
    expect(card).toHaveClass("bg-gradient-to-br");
  });

  it("hero variant does not apply bg-white", () => {
    render(<Card variant="hero" data-testid="hero-card">Hero content</Card>);

    const card = screen.getByTestId("hero-card");
    expect(card).not.toHaveClass("bg-white");
  });

  it("passes additional className prop", () => {
    render(<Card className="custom-class" data-testid="card">Content</Card>);

    const card = screen.getByTestId("card");
    expect(card).toHaveClass("custom-class");
  });

  it("renders as a div element", () => {
    render(<Card data-testid="card">Content</Card>);

    const card = screen.getByTestId("card");
    expect(card.tagName).toBe("DIV");
  });
});
