// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { Requirement, Specification, TaskEntry } from "@reqord/shared";

vi.mock("@xyflow/react", () => ({
  ReactFlow: ({ nodes, edges, children }: any) => (
    <div data-testid="react-flow" data-nodes={nodes.length} data-edges={edges.length}>
      {nodes.map((n: any) => (
        <div key={n.id} data-testid={`node-${n.id}`} />
      ))}
      {children}
    </div>
  ),
  Background: () => <div data-testid="background" />,
  Controls: () => <div data-testid="controls" />,
  Handle: ({ type }: any) => <div data-testid={`handle-${type}`} />,
  Position: { Left: "left", Right: "right", Top: "top", Bottom: "bottom" },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import { DrillDownGraph } from "../../../components/graph/drilldown-graph";

function makeReq(id: string, overrides: Partial<Requirement> = {}): Requirement {
  return {
    id, version: "1.0.0", title: `Requirement ${id}`, status: "draft", priority: "medium",
    createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z", versionHistory: [],
    files: { description: `requirements/${id}/description.md`, supplementary: [] },
    successCriteria: [], format: { type: "free-form" },
    dependencies: { blockedBy: [], blocks: [], relatedTo: [] }, flags: [],
    ...overrides,
  } as Requirement;
}

function makeSpec(id: string, reqId: string, overrides: Partial<Specification> = {}): Specification {
  return {
    id, requirementId: reqId, version: "1.0.0", status: "draft",
    createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z", versionHistory: [],
    files: { design: `specifications/${id}/design.md`, supplementary: [] }, flags: [],
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

describe("DrillDownGraph", () => {
  afterEach(() => { cleanup(); });

  it("renders ReactFlow with nodes from requirement and specifications", () => {
    const req = makeReq("req-000001");
    const spec1 = makeSpec("spec-000001", "req-000001");
    const spec2 = makeSpec("spec-000002", "req-000001");

    const { getByTestId } = render(
      <DrillDownGraph requirement={req} specifications={[spec1, spec2]} tasks={[]} />
    );

    const flow = getByTestId("react-flow");
    expect(flow.getAttribute("data-nodes")).toBe("3");
    expect(flow.getAttribute("data-edges")).toBe("2");
  });

  it("renders ReactFlow with Background and Controls", () => {
    const req = makeReq("req-000001");

    const { getByTestId } = render(
      <DrillDownGraph requirement={req} specifications={[]} tasks={[]} />
    );

    expect(getByTestId("background")).toBeInTheDocument();
    expect(getByTestId("controls")).toBeInTheDocument();
  });

  it("renders requirement node", () => {
    const req = makeReq("req-000001");

    const { getByTestId } = render(
      <DrillDownGraph requirement={req} specifications={[]} tasks={[]} />
    );

    expect(getByTestId("node-req-000001")).toBeInTheDocument();
  });

  it("renders ReactFlow with issue nodes when tasks are linked to specs", () => {
    const req = makeReq("req-000001");
    const spec1 = makeSpec("spec-000001", "req-000001");
    const task = makeTask(42, ["spec-000001"]);

    const { getByTestId } = render(
      <DrillDownGraph requirement={req} specifications={[spec1]} tasks={[task]} />
    );

    const flow = getByTestId("react-flow");
    expect(flow.getAttribute("data-nodes")).toBe("3");
    expect(flow.getAttribute("data-edges")).toBe("2");
  });
});
