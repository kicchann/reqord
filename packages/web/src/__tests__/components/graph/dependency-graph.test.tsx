// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { Requirement } from "@reqord/shared";

// Capture nodes passed to ReactFlow
let capturedNodes: any[] = [];

vi.mock("@xyflow/react", () => ({
  ReactFlow: ({ nodes, edges, children }: any) => {
    capturedNodes = nodes;
    return (
      <div data-testid="react-flow" data-nodes={nodes.length} data-edges={edges.length}>
        {children}
      </div>
    );
  },
  Background: () => <div data-testid="background" />,
  Controls: () => <div data-testid="controls" />,
  MiniMap: () => <div data-testid="minimap" />,
  useNodesState: (initial: any[]) => [initial, vi.fn(), vi.fn()],
  useEdgesState: (initial: any[]) => [initial, vi.fn(), vi.fn()],
  Handle: ({ type }: any) => <div data-testid={`handle-${type}`} />,
  Position: { Left: "left", Right: "right", Top: "top", Bottom: "bottom" },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import { DependencyGraph } from "../../../components/graph/dependency-graph";

function makeReq(
  id: string,
  overrides: Partial<Requirement> = {},
): Requirement {
  return {
    id,
    version: "1.0.0",
    title: `Requirement ${id}`,
    status: "draft",
    priority: "medium",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    versionHistory: [],
    files: {
      description: `requirements/${id}/description.md`,
      supplementary: [],
    },
    successCriteria: [],
    format: { type: "free-form" },
    dependencies: { blockedBy: [], blocks: [], relatedTo: [] },
    flags: [],
    ...overrides,
  } as Requirement;
}

describe("DependencyGraph", () => {
  afterEach(() => {
    cleanup();
    capturedNodes = [];
  });

  it("passes onDrillDown in node data when onRequirementClick is provided", () => {
    const handleClick = vi.fn();
    const req = makeReq("req-000001");

    render(
      <DependencyGraph
        requirements={[req]}
        specCountMap={{ "req-000001": 2 }}
        onRequirementClick={handleClick}
      />
    );

    expect(capturedNodes).toHaveLength(1);
    expect(capturedNodes[0].data.onDrillDown).toBe(handleClick);
  });

  it("does not include onDrillDown in node data when onRequirementClick is not provided", () => {
    const req = makeReq("req-000001");

    render(
      <DependencyGraph
        requirements={[req]}
        specCountMap={{ "req-000001": 2 }}
      />
    );

    expect(capturedNodes).toHaveLength(1);
    expect(capturedNodes[0].data.onDrillDown).toBeUndefined();
  });
});
