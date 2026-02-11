// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { TabDesign } from "../../../components/specification/tab-design";

// Mock MarkdownRenderer to avoid react-markdown SSR issues
vi.mock("../../../components/requirement/markdown-renderer", () => ({
  MarkdownRenderer: ({ content }: { content: string }) => (
    <div data-testid="markdown-renderer">{content}</div>
  ),
}));

describe("TabDesign", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders markdown content when content is provided", () => {
    render(<TabDesign content="# Design\n\nContent here" />);

    const renderer = screen.getByTestId("markdown-renderer");
    expect(renderer).toBeInTheDocument();
    expect(renderer).toHaveTextContent("# Design");
    expect(renderer).toHaveTextContent("Content here");
  });

  it("shows empty state message when content is null", () => {
    render(<TabDesign content={null} />);

    expect(screen.getByText("Design document not available")).toBeInTheDocument();
    expect(screen.queryByTestId("markdown-renderer")).not.toBeInTheDocument();
  });

  it("renders empty content string as markdown", () => {
    render(<TabDesign content="" />);

    const renderer = screen.getByTestId("markdown-renderer");
    expect(renderer).toBeInTheDocument();
  });
});
