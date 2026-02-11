// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { IssueNode } from "../../../components/graph/issue-node";

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

describe("IssueNode", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders issue number text", () => {
    render(
      <IssueNode
        {...defaultNodeProps}
        id="issue-spec-000001-123"
        data={{
          label: "Issue #123",
          status: "open",
          issueNumber: 123,
          issueUrl: "https://github.com/test/repo/issues/123",
        }}
        type="issue"
      />
    );

    expect(screen.getByText("Issue #123")).toBeInTheDocument();
  });

  it("renders open status with yellow background class", () => {
    const { container } = render(
      <IssueNode
        {...defaultNodeProps}
        id="issue-spec-000001-123"
        data={{
          label: "Issue #123",
          status: "open",
          issueNumber: 123,
          issueUrl: "https://github.com/test/repo/issues/123",
        }}
        type="issue"
      />
    );

    const nodeDiv = container.querySelector(".bg-yellow-200");
    expect(nodeDiv).toBeInTheDocument();
  });

  it("renders closed status with green background class", () => {
    const { container } = render(
      <IssueNode
        {...defaultNodeProps}
        id="issue-spec-000001-124"
        data={{
          label: "Issue #124",
          status: "closed",
          issueNumber: 124,
          issueUrl: "https://github.com/test/repo/issues/124",
        }}
        type="issue"
      />
    );

    const nodeDiv = container.querySelector(".bg-green-200");
    expect(nodeDiv).toBeInTheDocument();
  });

  it("renders in_progress status with blue background class", () => {
    const { container } = render(
      <IssueNode
        {...defaultNodeProps}
        id="issue-spec-000001-125"
        data={{
          label: "Issue #125",
          status: "in_progress",
          issueNumber: 125,
          issueUrl: "https://github.com/test/repo/issues/125",
        }}
        type="issue"
      />
    );

    const nodeDiv = container.querySelector(".bg-blue-200");
    expect(nodeDiv).toBeInTheDocument();
  });

  it("renders status badge", () => {
    render(
      <IssueNode
        {...defaultNodeProps}
        id="issue-spec-000001-123"
        data={{
          label: "Issue #123",
          status: "open",
          issueNumber: 123,
          issueUrl: "https://github.com/test/repo/issues/123",
        }}
        type="issue"
      />
    );

    expect(screen.getByText("open")).toBeInTheDocument();
  });

  it("renders only target handle", () => {
    render(
      <IssueNode
        {...defaultNodeProps}
        id="issue-spec-000001-123"
        data={{
          label: "Issue #123",
          status: "open",
          issueNumber: 123,
          issueUrl: "https://github.com/test/repo/issues/123",
        }}
        type="issue"
      />
    );

    expect(screen.getByTestId("handle-target")).toBeInTheDocument();
    expect(screen.queryByTestId("handle-source")).not.toBeInTheDocument();
  });

  it("opens issue URL in new tab when clicked", () => {
    const windowOpenSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    render(
      <IssueNode
        {...defaultNodeProps}
        id="issue-spec-000001-123"
        data={{
          label: "Issue #123",
          status: "open",
          issueNumber: 123,
          issueUrl: "https://github.com/test/repo/issues/123",
        }}
        type="issue"
      />
    );

    const node = screen.getByText("Issue #123").closest("div");
    if (node) {
      fireEvent.click(node);
    }

    expect(windowOpenSpy).toHaveBeenCalledWith(
      "https://github.com/test/repo/issues/123",
      "_blank",
      "noopener,noreferrer"
    );

    windowOpenSpy.mockRestore();
  });
});
