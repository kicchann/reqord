// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { FlagBadge } from "../../../components/flags/flag-badge";

describe("FlagBadge", () => {
  afterEach(() => cleanup());

  it("feedback-reviewにamber色クラスが適用される", () => {
    render(<FlagBadge type="feedback-review" />);
    const badge = screen.getByTestId("flag-badge-feedback-review");
    expect(badge).toHaveClass("bg-amber-100");
    expect(badge).toHaveTextContent("Feedback Review");
  });

  it("security-reviewにred色クラスが適用される", () => {
    render(<FlagBadge type="security-review" />);
    const badge = screen.getByTestId("flag-badge-security-review");
    expect(badge).toHaveClass("bg-red-100");
    expect(badge).toHaveTextContent("Security Review");
  });

  it("breaking-changeにpurple色クラスが適用される", () => {
    render(<FlagBadge type="breaking-change" />);
    const badge = screen.getByTestId("flag-badge-breaking-change");
    expect(badge).toHaveClass("bg-purple-100");
    expect(badge).toHaveTextContent("Breaking Change");
  });

  it("severity propsがある場合のみseverityバッジが表示される", () => {
    render(<FlagBadge type="feedback-review" severity="high" />);
    expect(screen.getByTestId("flag-severity")).toHaveTextContent("high");
  });

  it("severity propsがない場合はseverityバッジが表示されない", () => {
    render(<FlagBadge type="feedback-review" />);
    expect(screen.queryByTestId("flag-severity")).toBeNull();
  });
});
