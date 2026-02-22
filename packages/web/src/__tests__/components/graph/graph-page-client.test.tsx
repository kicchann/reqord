// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { Requirement, Specification, TaskEntry } from "@reqord/shared";

const mockPush = vi.fn();
const mockGet = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: mockGet }),
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<any>) => {
    let Component: any = () => <div data-testid="loading" />;
    loader().then((mod: any) => {
      Component = mod.default || mod.DependencyGraph || mod.DrillDownGraph || mod;
    });
    return (props: any) => <Component {...props} />;
  },
}));

vi.mock("@xyflow/react", () => ({
  ReactFlow: ({ nodes, edges, children }: any) => (
    <div data-testid="react-flow" data-nodes={nodes?.length} data-edges={edges?.length}>
      {children}
    </div>
  ),
  default: ({ nodes, edges, children }: any) => (
    <div data-testid="react-flow" data-nodes={nodes?.length} data-edges={edges?.length}>
      {children}
    </div>
  ),
  Background: () => <div data-testid="background" />,
  Controls: () => <div data-testid="controls" />,
  MiniMap: () => <div data-testid="minimap" />,
  useNodesState: (initial: any[]) => [initial, vi.fn(), vi.fn()],
  useEdgesState: (initial: any[]) => [initial, vi.fn(), vi.fn()],
  Handle: ({ type }: any) => <div data-testid={`handle-${type}`} />,
  Position: { Left: "left", Right: "right", Top: "top", Bottom: "bottom" },
}));

import { GraphPageClient } from "../../../components/graph/graph-page-client";

function makeReq(id: string, overrides: Partial<Requirement> = {}): Requirement {
  return {
    id, version: "1.0.0", title: `Requirement ${id}`, status: "draft", priority: "medium",
    createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z", versionHistory: [],
    files: { description: `requirements/${id}/description.md`, supplementary: [] },
    successCriteria: [], format: { type: "free-form" },
    dependencies: { blockedBy: [], blocks: [], relatedTo: [] },
    ...overrides,
  } as Requirement;
}

function makeSpec(id: string, reqId: string, overrides: Partial<Specification> = {}): Specification {
  return {
    id, requirementId: reqId, version: "1.0.0", status: "draft",
    createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z", versionHistory: [],
    files: { design: `specifications/${id}/design.md`, supplementary: [] },
    ...overrides,
  } as Specification;
}

function makeTask(number: number, specIds: string[], overrides: Partial<TaskEntry> = {}): TaskEntry {
  return {
    number, title: `Task ${number}`, url: `https://github.com/test/repo/issues/${number}`,
    linkedTo: { specifications: specIds }, status: "open", syncedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

const defaultProps = {
  requirements: [makeReq("req-000001"), makeReq("req-000002")],
  specifications: [makeSpec("spec-000001", "req-000001")],
  specCountMap: { "req-000001": 1, "req-000002": 0 } as Record<string, number>,
  tasks: [makeTask(42, ["spec-000001"])],
};

describe("GraphPageClient", () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { cleanup(); });

  describe("when no ?req= param (overview mode)", () => {
    it("renders overview heading", () => {
      mockGet.mockReturnValue(null);
      render(<GraphPageClient {...defaultProps} />);
      expect(screen.getByText("Dependency Graph")).toBeInTheDocument();
    });

    it("does not render DrillDownBreadcrumb", () => {
      mockGet.mockReturnValue(null);
      render(<GraphPageClient {...defaultProps} />);
      expect(screen.queryByText("← Back to overview")).not.toBeInTheDocument();
    });
  });

  describe("when ?req= has a valid id (drilldown mode)", () => {
    it("renders DrillDownBreadcrumb with requirement title", () => {
      mockGet.mockReturnValue("req-000001");
      render(<GraphPageClient {...defaultProps} />);
      expect(screen.getByText("← Back to overview")).toBeInTheDocument();
      expect(screen.getByText("Requirement req-000001")).toBeInTheDocument();
    });

    it("does not render the overview heading", () => {
      mockGet.mockReturnValue("req-000001");
      render(<GraphPageClient {...defaultProps} />);
      expect(screen.queryByText("Dependency Graph")).not.toBeInTheDocument();
    });
  });

  describe("when ?req= has an invalid id (fallback)", () => {
    it("falls back to DependencyGraph overview", () => {
      mockGet.mockReturnValue("req-999999");
      render(<GraphPageClient {...defaultProps} />);
      expect(screen.getByText("Dependency Graph")).toBeInTheDocument();
      expect(screen.queryByText("← Back to overview")).not.toBeInTheDocument();
    });
  });
});
