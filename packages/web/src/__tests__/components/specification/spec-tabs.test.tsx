// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { SpecTabs } from "../../../components/specification/spec-tabs";

// Mock child components
vi.mock("../../../components/specification/tab-design", () => ({
  TabDesign: ({ content }: { content: string | null }) => (
    <div data-testid="tab-design">Design: {content ?? "null"}</div>
  ),
}));

vi.mock("../../../components/specification/tab-research", () => ({
  TabResearch: ({ content }: { content: string | null }) => (
    <div data-testid="tab-research">Research: {content ?? "null"}</div>
  ),
}));

vi.mock("../../../components/specification/tab-coverage", () => ({
  TabCoverage: ({ successCriteria }: { successCriteria: string[] | null }) => (
    <div data-testid="tab-coverage">Coverage: {successCriteria?.length ?? 0} criteria</div>
  ),
}));

vi.mock("../../../components/specification/tab-issues", () => ({
  TabIssues: ({ issues }: { issues: any[] | null }) => (
    <div data-testid="tab-issues">Issues: {issues?.length ?? 0} issues</div>
  ),
}));

vi.mock("../../../components/specification/tab-history", () => ({
  TabHistory: ({ versionHistory }: { versionHistory: any[] }) => (
    <div data-testid="tab-history">History: {versionHistory.length} versions</div>
  ),
}));

vi.mock("../../../components/ui/tabs", () => ({
  Tabs: ({ tabs, activeTab, onTabChange }: any) => (
    <div data-testid="tabs-container">
      {tabs.map((tab: any) => (
        <button
          key={tab.id}
          data-testid={`tab-button-${tab.id}`}
          data-active={activeTab === tab.id}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  ),
}));

describe("SpecTabs", () => {
  afterEach(() => {
    cleanup();
    // Reset URL hash
    if (typeof window !== "undefined") {
      window.location.hash = "";
    }
  });

  it("defaults to design tab", () => {
    render(
      <SpecTabs
        design="# Design"
        research="# Research"
        successCriteria={[]}
        issues={[]}
        versionHistory={[]}
      />
    );

    const designButton = screen.getByTestId("tab-button-design");
    expect(designButton).toHaveAttribute("data-active", "true");
    expect(screen.getByTestId("tab-design")).toBeInTheDocument();
  });

  it("changes active tab when tab button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <SpecTabs
        design="# Design"
        research="# Research"
        successCriteria={[]}
        issues={[]}
        versionHistory={[]}
      />
    );

    const researchButton = screen.getByTestId("tab-button-research");
    await user.click(researchButton);

    expect(researchButton).toHaveAttribute("data-active", "true");
    expect(screen.getByTestId("tab-research")).toBeInTheDocument();
  });

  it("passes design content to TabDesign", () => {
    render(
      <SpecTabs
        design="# Design content"
        research={null}
        successCriteria={[]}
        issues={[]}
        versionHistory={[]}
      />
    );

    // Design tab should be active by default
    const designTab = screen.getByTestId("tab-design");
    expect(designTab).toBeInTheDocument();
    expect(designTab).toHaveTextContent("Design: # Design content");
  });

  it("passes research content to TabResearch", async () => {
    const user = userEvent.setup();
    render(
      <SpecTabs
        design={null}
        research="# Research content"
        successCriteria={[]}
        issues={[]}
        versionHistory={[]}
      />
    );

    await user.click(screen.getByTestId("tab-button-research"));

    expect(screen.getByText("Research: # Research content")).toBeInTheDocument();
  });

  it("handles null content for both tabs", async () => {
    const user = userEvent.setup();
    render(<SpecTabs design={null} research={null} successCriteria={[]} issues={[]} versionHistory={[]} />);

    // Design tab shown by default
    expect(screen.getByTestId("tab-design")).toHaveTextContent("Design: null");

    // Switch to research tab
    await user.click(screen.getByTestId("tab-button-research"));
    expect(screen.getByTestId("tab-research")).toHaveTextContent("Research: null");
  });

  it("renders both Design and Research tab labels", () => {
    render(<SpecTabs design={null} research={null} successCriteria={[]} issues={[]} versionHistory={[]} />);

    expect(screen.getByTestId("tab-button-design")).toHaveTextContent("Design");
    expect(screen.getByTestId("tab-button-research")).toHaveTextContent("Research");
  });
});
