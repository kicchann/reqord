// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { FeedbackFilters, type FeedbackFilterState } from "../../../components/feedback/feedback-filters";

describe("FeedbackFilters", () => {
  afterEach(() => cleanup());

  it("全フィルタグループが表示される", () => {
    const onChange = vi.fn();
    render(<FeedbackFilters activeFilters={{}} onFilterChange={onChange} />);

    expect(screen.getByTestId("feedback-filters")).toBeInTheDocument();
    expect(screen.getByTestId("filter-type-all")).toBeInTheDocument();
    expect(screen.getByTestId("filter-type-bug")).toBeInTheDocument();
    expect(screen.getByTestId("filter-severity-all")).toBeInTheDocument();
    expect(screen.getByTestId("filter-severity-critical")).toBeInTheDocument();
    expect(screen.getByTestId("filter-status-all")).toBeInTheDocument();
    expect(screen.getByTestId("filter-status-open")).toBeInTheDocument();
  });

  it("typeフィルタ選択でonFilterChangeが呼ばれる", () => {
    const onChange = vi.fn();
    render(<FeedbackFilters activeFilters={{}} onFilterChange={onChange} />);

    fireEvent.click(screen.getByTestId("filter-type-bug"));
    expect(onChange).toHaveBeenCalledWith({ type: "bug" });
  });

  it("allを選択するとフィルタがundefinedになる", () => {
    const onChange = vi.fn();
    render(
      <FeedbackFilters activeFilters={{ type: "bug" }} onFilterChange={onChange} />,
    );

    fireEvent.click(screen.getByTestId("filter-type-all"));
    expect(onChange).toHaveBeenCalledWith({ type: undefined });
  });

  it("アクティブなフィルタボタンにbg-blue-600クラスが適用される", () => {
    const onChange = vi.fn();
    render(
      <FeedbackFilters activeFilters={{ severity: "high" }} onFilterChange={onChange} />,
    );

    expect(screen.getByTestId("filter-severity-high")).toHaveClass("bg-blue-600");
    expect(screen.getByTestId("filter-severity-all")).not.toHaveClass("bg-blue-600");
  });
});
