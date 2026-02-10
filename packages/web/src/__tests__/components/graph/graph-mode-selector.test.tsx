// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { GraphModeSelector } from "../../../components/graph/graph-mode-selector";

describe("GraphModeSelector", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders both mode buttons", () => {
    const onModeChange = vi.fn();
    render(<GraphModeSelector mode="requirements" onModeChange={onModeChange} />);

    expect(screen.getByText("Requirements Only")).toBeInTheDocument();
    expect(screen.getByText("Full Traceability")).toBeInTheDocument();
  });

  it("Requirements Only button is active by default when mode is requirements", () => {
    const onModeChange = vi.fn();
    render(<GraphModeSelector mode="requirements" onModeChange={onModeChange} />);

    const requirementsBtn = screen.getByText("Requirements Only");
    expect(requirementsBtn).toHaveClass("bg-blue-600");
    expect(requirementsBtn).toHaveClass("text-white");
  });

  it("Full Traceability button is active when mode is full", () => {
    const onModeChange = vi.fn();
    render(<GraphModeSelector mode="full" onModeChange={onModeChange} />);

    const fullBtn = screen.getByText("Full Traceability");
    expect(fullBtn).toHaveClass("bg-blue-600");
    expect(fullBtn).toHaveClass("text-white");
  });

  it("inactive button has correct styling", () => {
    const onModeChange = vi.fn();
    render(<GraphModeSelector mode="requirements" onModeChange={onModeChange} />);

    const fullBtn = screen.getByText("Full Traceability");
    expect(fullBtn).toHaveClass("bg-white");
    expect(fullBtn).toHaveClass("text-gray-700");
  });

  it("clicking Full Traceability button triggers onModeChange with full", () => {
    const onModeChange = vi.fn();
    render(<GraphModeSelector mode="requirements" onModeChange={onModeChange} />);

    const fullBtn = screen.getByText("Full Traceability");
    fireEvent.click(fullBtn);

    expect(onModeChange).toHaveBeenCalledWith("full");
  });

  it("clicking Requirements Only button triggers onModeChange with requirements", () => {
    const onModeChange = vi.fn();
    render(<GraphModeSelector mode="full" onModeChange={onModeChange} />);

    const requirementsBtn = screen.getByText("Requirements Only");
    fireEvent.click(requirementsBtn);

    expect(onModeChange).toHaveBeenCalledWith("requirements");
  });

  it("does not call onModeChange when clicking already active button", () => {
    const onModeChange = vi.fn();
    render(<GraphModeSelector mode="requirements" onModeChange={onModeChange} />);

    const requirementsBtn = screen.getByText("Requirements Only");
    fireEvent.click(requirementsBtn);

    expect(onModeChange).not.toHaveBeenCalled();
  });
});
