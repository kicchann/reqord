// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { RequirementNode } from "../../../components/graph/requirement-node";

const mockPush = vi.fn();

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock @xyflow/react Handle and Position
vi.mock("@xyflow/react", () => ({
  Handle: ({ type }: any) => <div data-testid={`handle-${type}`} />,
  Position: { Left: "left", Right: "right", Top: "top", Bottom: "bottom" },
}));

describe("RequirementNode", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const baseProps = {
    id: "req-000001",
    type: "requirement" as const,
    selected: false,
    dragging: false,
    draggable: true,
    selectable: true,
    deletable: false,
    zIndex: 0,
    isConnectable: true,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    data: {
      label: "User Login",
      status: "draft",
      priority: "medium",
      specCount: 3,
    },
  };

  describe("drill down button visibility", () => {
    it("shows drill down button when onDrillDown is defined and specCount > 0", () => {
      const onDrillDown = vi.fn();

      render(
        <RequirementNode
          {...baseProps}
          data={{ ...baseProps.data, specCount: 3, onDrillDown }}
        />
      );

      expect(screen.getByRole("button", { name: /3 specs/i })).toBeInTheDocument();
    });

    it("does NOT show drill down button when onDrillDown is undefined", () => {
      render(
        <RequirementNode
          {...baseProps}
          data={{ ...baseProps.data, specCount: 3 }}
        />
      );

      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("does NOT show drill down button when specCount is 0", () => {
      const onDrillDown = vi.fn();

      render(
        <RequirementNode
          {...baseProps}
          data={{ ...baseProps.data, specCount: 0, onDrillDown }}
        />
      );

      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });
  });

  describe("drill down button interaction", () => {
    it("calls onDrillDown with node id when button is clicked", () => {
      const onDrillDown = vi.fn();

      render(
        <RequirementNode
          {...baseProps}
          data={{ ...baseProps.data, specCount: 2, onDrillDown }}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /2 specs/i }));

      expect(onDrillDown).toHaveBeenCalledWith("req-000001");
    });

    it("does NOT trigger parent onClick when button is clicked", () => {
      const onDrillDown = vi.fn();

      render(
        <RequirementNode
          {...baseProps}
          data={{ ...baseProps.data, specCount: 2, onDrillDown }}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /2 specs/i }));

      // router.push should not be called - button stopPropagation prevents it
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe("body click navigation", () => {
    it("calls router.push with requirement path when body is clicked", () => {
      render(<RequirementNode {...baseProps} />);

      // Click the node ID text area (part of the body, not button)
      fireEvent.click(screen.getByText("req-000001"));

      expect(mockPush).toHaveBeenCalledWith("/requirements/req-000001");
    });
  });

  describe("rendering", () => {
    it("renders node id and label", () => {
      render(<RequirementNode {...baseProps} />);

      expect(screen.getByText("req-000001")).toBeInTheDocument();
      expect(screen.getByText("User Login")).toBeInTheDocument();
    });

    it("shows singular 'spec' for specCount of 1", () => {
      const onDrillDown = vi.fn();

      render(
        <RequirementNode
          {...baseProps}
          data={{ ...baseProps.data, specCount: 1, onDrillDown }}
        />
      );

      expect(screen.getByRole("button", { name: /1 spec$/i })).toBeInTheDocument();
    });
  });
});
