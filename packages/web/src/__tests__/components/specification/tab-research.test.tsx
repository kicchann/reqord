// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { TabResearch } from "../../../components/specification/tab-research";

// Mock MarkdownRenderer to avoid react-markdown SSR issues
vi.mock("../../../components/requirement/markdown-renderer", () => ({
  MarkdownRenderer: ({ content }: { content: string }) => (
    <div data-testid="markdown-renderer">{content}</div>
  ),
}));

describe("TabResearch", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders markdown content when content is provided", () => {
    render(<TabResearch content="# Research\n\nFindings" />);

    const renderer = screen.getByTestId("markdown-renderer");
    expect(renderer).toBeInTheDocument();
    expect(renderer).toHaveTextContent("# Research");
    expect(renderer).toHaveTextContent("Findings");
  });

  it("shows empty state message when content is null", () => {
    render(<TabResearch content={null} />);

    expect(screen.getByText("Research document not available")).toBeInTheDocument();
    expect(screen.queryByTestId("markdown-renderer")).not.toBeInTheDocument();
  });

  it("renders empty content string as markdown", () => {
    render(<TabResearch content="" />);

    const renderer = screen.getByTestId("markdown-renderer");
    expect(renderer).toBeInTheDocument();
  });
});
