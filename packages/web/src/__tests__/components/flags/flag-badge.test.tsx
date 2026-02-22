// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { FeedbackBadge } from "../../../components/feedback/feedback-badge";

describe("FeedbackBadge", () => {
  afterEach(() => cleanup());

  it("bugタイプにred色クラスが適用される", () => {
    render(<FeedbackBadge type="bug" />);
    const badge = screen.getByTestId("feedback-badge-bug");
    expect(badge).toHaveClass("bg-red-100");
    expect(badge).toHaveTextContent("Bug");
  });

  it("improvementタイプにblue色クラスが適用される", () => {
    render(<FeedbackBadge type="improvement" />);
    const badge = screen.getByTestId("feedback-badge-improvement");
    expect(badge).toHaveClass("bg-blue-100");
    expect(badge).toHaveTextContent("Improvement");
  });

  it("spec-mismatchタイプにpurple色クラスが適用される", () => {
    render(<FeedbackBadge type="spec-mismatch" />);
    const badge = screen.getByTestId("feedback-badge-spec-mismatch");
    expect(badge).toHaveClass("bg-purple-100");
    expect(badge).toHaveTextContent("Spec Mismatch");
  });

  it("severity propsがある場合のみseverityバッジが表示される", () => {
    render(<FeedbackBadge type="bug" severity="high" />);
    expect(screen.getByTestId("feedback-severity")).toHaveTextContent("high");
  });

  it("severity propsがない場合はseverityバッジが表示されない", () => {
    render(<FeedbackBadge type="bug" />);
    expect(screen.queryByTestId("feedback-severity")).toBeNull();
  });
});
