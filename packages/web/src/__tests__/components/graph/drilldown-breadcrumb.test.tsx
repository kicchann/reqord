// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { DrillDownBreadcrumb } from "../../../components/graph/drilldown-breadcrumb";

describe("DrillDownBreadcrumb", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders requirement title", () => {
    const onBack = vi.fn();

    render(
      <DrillDownBreadcrumb requirementTitle="User Login" onBack={onBack} />
    );

    expect(screen.getByText("User Login")).toBeInTheDocument();
  });

  it("calls onBack when back button is clicked", () => {
    const onBack = vi.fn();

    render(
      <DrillDownBreadcrumb requirementTitle="User Login" onBack={onBack} />
    );

    fireEvent.click(screen.getByRole("button", { name: /back to overview/i }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("calls onBack when Escape key is pressed", () => {
    const onBack = vi.fn();

    render(
      <DrillDownBreadcrumb requirementTitle="User Login" onBack={onBack} />
    );

    fireEvent.keyDown(window, { key: "Escape" });

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("shows Esc hint text", () => {
    const onBack = vi.fn();

    render(
      <DrillDownBreadcrumb requirementTitle="User Login" onBack={onBack} />
    );

    expect(screen.getByText("(Press Esc to go back)")).toBeInTheDocument();
  });

  it("cleans up event listener on unmount", () => {
    const onBack = vi.fn();

    const { unmount } = render(
      <DrillDownBreadcrumb requirementTitle="User Login" onBack={onBack} />
    );

    unmount();

    fireEvent.keyDown(window, { key: "Escape" });

    expect(onBack).not.toHaveBeenCalled();
  });
});
