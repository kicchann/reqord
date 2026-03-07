// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { FeedbackFilters } from "../../../components/feedback/feedback-filters";

describe("FeedbackFilters - ラベル短縮", () => {
  afterEach(() => cleanup());

  it("requirement-gapタイプのラベルが'Req Gap'と短縮表示される", () => {
    render(<FeedbackFilters activeFilters={{}} onFilterChange={vi.fn()} />);

    // data-testidで要素を取得してテキストを確認
    const reqGapButton = screen.getByTestId("filter-type-requirement-gap");
    expect(reqGapButton).toHaveTextContent("Req Gap");
  });

  it("spec-mismatchタイプのラベルが'Spec Mismatch'と短縮表示される", () => {
    render(<FeedbackFilters activeFilters={{}} onFilterChange={vi.fn()} />);

    const specMismatchButton = screen.getByTestId("filter-type-spec-mismatch");
    expect(specMismatchButton).toHaveTextContent("Spec Mismatch");
  });

  it("セグメントボタンのパディングが拡大されている（px-3 py-1.5）", () => {
    render(<FeedbackFilters activeFilters={{}} onFilterChange={vi.fn()} />);

    const allTypeButton = screen.getByTestId("filter-type-all");
    expect(allTypeButton.className).toContain("px-3");
    expect(allTypeButton.className).toContain("py-1.5");
  });
});
