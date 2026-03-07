// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { Button } from "../../../components/ui/button";

describe("Button", () => {
  afterEach(() => {
    cleanup();
  });

  describe("variant", () => {
    it("renders primary variant with warm-800 background by default", () => {
      render(<Button>Click me</Button>);

      const button = screen.getByRole("button", { name: "Click me" });
      expect(button).toHaveClass("bg-warm-800");
      expect(button).toHaveClass("text-white");
    });

    it("renders secondary variant with gray outline", () => {
      render(<Button variant="secondary">Secondary</Button>);

      const button = screen.getByRole("button", { name: "Secondary" });
      expect(button).toHaveClass("border");
      expect(button).toHaveClass("border-warm-300");
      expect(button).toHaveClass("bg-white");
      expect(button).toHaveClass("text-warm-700");
    });

    it("renders danger variant with red background", () => {
      render(<Button variant="danger">Delete</Button>);

      const button = screen.getByRole("button", { name: "Delete" });
      expect(button).toHaveClass("bg-accent");
      expect(button).toHaveClass("text-white");
    });

    it("renders ghost variant with transparent background", () => {
      render(<Button variant="ghost">Ghost</Button>);

      const button = screen.getByRole("button", { name: "Ghost" });
      expect(button).toHaveClass("text-warm-700");
      expect(button).not.toHaveClass("bg-warm-800");
      expect(button).not.toHaveClass("bg-white");
    });
  });

  describe("size", () => {
    it("renders md size by default", () => {
      render(<Button>Medium</Button>);

      const button = screen.getByRole("button", { name: "Medium" });
      expect(button).toHaveClass("px-4");
      expect(button).toHaveClass("py-2");
      expect(button).toHaveClass("text-sm");
    });

    it("renders sm size with smaller padding", () => {
      render(<Button size="sm">Small</Button>);

      const button = screen.getByRole("button", { name: "Small" });
      expect(button).toHaveClass("px-3");
      expect(button).toHaveClass("py-1.5");
      expect(button).toHaveClass("text-xs");
    });

    it("renders lg size with larger padding", () => {
      render(<Button size="lg">Large</Button>);

      const button = screen.getByRole("button", { name: "Large" });
      expect(button).toHaveClass("px-6");
      expect(button).toHaveClass("py-3");
      expect(button).toHaveClass("text-base");
    });
  });

  it("passes additional className prop", () => {
    render(<Button className="custom-class">Click</Button>);

    const button = screen.getByRole("button", { name: "Click" });
    expect(button).toHaveClass("custom-class");
  });

  it("passes native button props like disabled", () => {
    render(<Button disabled>Disabled</Button>);

    const button = screen.getByRole("button", { name: "Disabled" });
    expect(button).toBeDisabled();
  });

  it("renders children correctly", () => {
    render(<Button>Submit</Button>);

    expect(screen.getByText("Submit")).toBeInTheDocument();
  });
});
