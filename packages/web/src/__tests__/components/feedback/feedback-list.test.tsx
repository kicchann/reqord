// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { FeedbackEntry } from "@reqord/shared";
import { FeedbackList } from "../../../components/feedback/feedback-list";

const baseFeedback: FeedbackEntry = {
  githubIssue: 42,
  type: "bug",
  severity: "high",
  status: "open",
  linkedTo: {
    requirements: [],
    createdRequirements: [],
    specifications: [],
    createdSpecifications: [],
  },
  syncedAt: "2026-01-15T10:00:00Z",
};

describe("FeedbackList", () => {
  afterEach(() => cleanup());

  it("feedbacks空: 何も表示されない", () => {
    const { container } = render(<FeedbackList feedbacks={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("titleがある場合はtitleが表示される", () => {
    const fb: FeedbackEntry = { ...baseFeedback, title: "Login fails on Safari" };
    render(<FeedbackList feedbacks={[fb]} />);

    expect(screen.getByTestId("feedback-title")).toHaveTextContent("Login fails on Safari");
  });

  it("titleがundefinedの場合はtitleが表示されない", () => {
    render(<FeedbackList feedbacks={[baseFeedback]} />);

    expect(screen.queryByTestId("feedback-title")).toBeNull();
  });

  it("Issue番号が表示される", () => {
    render(<FeedbackList feedbacks={[baseFeedback]} />);

    expect(screen.getByTestId("feedback-issue")).toHaveTextContent("#42");
  });
});
