// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { FeedbackEntry } from "@reqord/shared";
import { FeedbackList } from "../../../components/feedback/feedback-list";

const makeFeedback = (overrides: Partial<FeedbackEntry> = {}): FeedbackEntry => ({
  githubIssue: 1,
  type: "bug",
  severity: "high",
  linkedTo: {
    requirements: [],
    createdRequirements: [],
    specifications: ["spec-000001"],
    createdSpecifications: [],
  },
  syncedAt: "2026-01-01T00:00:00Z",
  status: "open",
  ...overrides,
});

describe("FeedbackList", () => {
  afterEach(() => cleanup());

  it("feedbacks空配列: 何も表示されない", () => {
    const { container } = render(<FeedbackList feedbacks={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("feedbackエントリ: githubIssueとseverityバッジが表示される", () => {
    render(<FeedbackList feedbacks={[makeFeedback({ githubIssue: 42, severity: "high" })]} />);

    expect(screen.getByTestId("feedback-list")).toBeInTheDocument();
    expect(screen.getByTestId("feedback-severity")).toHaveTextContent("high");
    expect(screen.getByTestId("feedback-issue")).toHaveTextContent("#42");
  });

  it("複数feedback: 全件表示される", () => {
    const feedbacks: FeedbackEntry[] = [
      makeFeedback({ githubIssue: 1, type: "bug" }),
      makeFeedback({ githubIssue: 2, type: "improvement" }),
      makeFeedback({ githubIssue: 3, type: "security" }),
    ];
    render(<FeedbackList feedbacks={feedbacks} />);

    const items = screen.getAllByTestId("feedback-item");
    expect(items).toHaveLength(3);
  });
});
