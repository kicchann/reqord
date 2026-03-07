// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { SpecificationNode } from "../../../components/graph/specification-node";

// Mock @xyflow/react Handle and Position
vi.mock("@xyflow/react", () => ({
  Handle: ({ type }: any) => <div data-testid={`handle-${type}`} />,
  Position: { Left: "left", Right: "right", Top: "top", Bottom: "bottom" },
}));

const defaultNodeProps = {
  selected: false,
  dragging: false,
  draggable: true,
  selectable: true,
  deletable: false,
  zIndex: 0,
  isConnectable: true,
  positionAbsoluteX: 0,
  positionAbsoluteY: 0,
};

describe("SpecificationNode", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders spec ID text", () => {
    render(
      <SpecificationNode
        {...defaultNodeProps}
        id="spec-000001"
        data={{ label: "spec-000001", status: "draft" }}
        type="specification"
      />
    );

    expect(screen.getByText("spec-000001")).toBeInTheDocument();
  });

  it("renders draft status with gray background class (brand color system)", () => {
    const { container } = render(
      <SpecificationNode
        {...defaultNodeProps}
        id="spec-000001"
        data={{ label: "spec-000001", status: "draft" }}
        type="specification"
      />
    );

    const nodeDiv = container.querySelector(".bg-gray-100");
    expect(nodeDiv).toBeInTheDocument();
  });

  it("renders approved status with blue background class (brand color system)", () => {
    const { container } = render(
      <SpecificationNode
        {...defaultNodeProps}
        id="spec-000002"
        data={{ label: "spec-000002", status: "approved" }}
        type="specification"
      />
    );

    const nodeDiv = container.querySelector(".bg-blue-100");
    expect(nodeDiv).toBeInTheDocument();
  });

  it("renders implemented status with emerald background class (brand color system)", () => {
    const { container } = render(
      <SpecificationNode
        {...defaultNodeProps}
        id="spec-000003"
        data={{ label: "spec-000003", status: "implemented" }}
        type="specification"
      />
    );

    const nodeDiv = container.querySelector(".bg-emerald-100");
    expect(nodeDiv).toBeInTheDocument();
  });

  it("renders deprecated status with red background class (brand color system)", () => {
    const { container } = render(
      <SpecificationNode
        {...defaultNodeProps}
        id="spec-000004"
        data={{ label: "spec-000004", status: "deprecated" }}
        type="specification"
      />
    );

    const nodeDiv = container.querySelector(".bg-red-100");
    expect(nodeDiv).toBeInTheDocument();
  });

  it("renders status badge with semi-transparent white background", () => {
    const { container } = render(
      <SpecificationNode
        {...defaultNodeProps}
        id="spec-000001"
        data={{ label: "My Spec Title", status: "draft" }}
        type="specification"
      />
    );

    const badge = container.querySelector(".bg-white\\/80");
    expect(badge).toBeInTheDocument();
  });

  it("renders label text as title", () => {
    render(
      <SpecificationNode
        {...defaultNodeProps}
        id="spec-000001"
        data={{ label: "My Spec Title", status: "draft" }}
        type="specification"
      />
    );

    expect(screen.getByText("My Spec Title")).toBeInTheDocument();
  });

  it("renders status badge", () => {
    render(
      <SpecificationNode
        {...defaultNodeProps}
        id="spec-000001"
        data={{ label: "spec-000001", status: "draft" }}
        type="specification"
      />
    );

    expect(screen.getByText("draft")).toBeInTheDocument();
  });

  it("renders both target and source handles", () => {
    render(
      <SpecificationNode
        {...defaultNodeProps}
        id="spec-000001"
        data={{ label: "spec-000001", status: "draft" }}
        type="specification"
      />
    );

    expect(screen.getByTestId("handle-target")).toBeInTheDocument();
    expect(screen.getByTestId("handle-source")).toBeInTheDocument();
  });
});
