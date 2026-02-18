// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { FeedbackEntry } from "@reqord/shared";
import { FeedbackClientView } from "../../../components/feedback/feedback-client-view";

const feedbacks: FeedbackEntry[] = [
  {
    githubIssue: 1,
    type: "bug",
    severity: "high",
    status: "open",
    linkedTo: { requirements: [], createdRequirements: [], specifications: [], createdSpecifications: [] },
    syncedAt: "2026-01-01T00:00:00Z",
  },
  {
    githubIssue: 2,
    type: "improvement",
    severity: "medium",
    status: "closed",
    linkedTo: { requirements: [], createdRequirements: [], specifications: [], createdSpecifications: [] },
    syncedAt: "2026-01-02T00:00:00Z",
  },
  {
    githubIssue: 3,
    type: "bug",
    severity: "low",
    status: "open",
    linkedTo: { requirements: [], createdRequirements: [], specifications: [], createdSpecifications: [] },
    syncedAt: "2026-01-03T00:00:00Z",
  },
];

describe("FeedbackClientView", () => {
  afterEach(() => cleanup());

  it("初期状態で全件表示される", () => {
    render(
      <FeedbackClientView feedbacks={feedbacks} requirementTitles={{}} specificationTitles={{}} />,
    );

    expect(screen.getAllByTestId("feedback-row")).toHaveLength(3);
  });

  it("typeフィルタで絞り込みができる", () => {
    render(
      <FeedbackClientView feedbacks={feedbacks} requirementTitles={{}} specificationTitles={{}} />,
    );

    fireEvent.click(screen.getByTestId("filter-type-bug"));
    expect(screen.getAllByTestId("feedback-row")).toHaveLength(2);
  });

  it("statusフィルタで絞り込みができる", () => {
    render(
      <FeedbackClientView feedbacks={feedbacks} requirementTitles={{}} specificationTitles={{}} />,
    );

    fireEvent.click(screen.getByTestId("filter-status-closed"));
    expect(screen.getAllByTestId("feedback-row")).toHaveLength(1);
  });

  it("複数フィルタのAND条件で絞り込みができる", () => {
    render(
      <FeedbackClientView feedbacks={feedbacks} requirementTitles={{}} specificationTitles={{}} />,
    );

    fireEvent.click(screen.getByTestId("filter-type-bug"));
    fireEvent.click(screen.getByTestId("filter-severity-high"));
    expect(screen.getAllByTestId("feedback-row")).toHaveLength(1);
    expect(screen.getByTestId("feedback-issue")).toHaveTextContent("#1");
  });

  it("フィルタ結果が0件の場合emptyメッセージが表示される", () => {
    render(
      <FeedbackClientView feedbacks={feedbacks} requirementTitles={{}} specificationTitles={{}} />,
    );

    fireEvent.click(screen.getByTestId("filter-type-security"));
    expect(screen.getByTestId("feedback-empty")).toBeInTheDocument();
  });
});
