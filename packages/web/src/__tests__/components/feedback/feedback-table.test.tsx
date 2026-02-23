// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { FeedbackEntry } from "@reqord/shared";
import { FeedbackTable } from "../../../components/feedback/feedback-table";

const baseFeedback: FeedbackEntry = {
  githubIssue: 42,
  type: "bug",
  severity: "high",
  status: "open",
  linkedTo: {
    requirements: ["req-000001"],
    createdRequirements: [],
    specifications: [],
    createdSpecifications: [],
  },
  syncedAt: "2026-01-15T10:00:00Z",
};

const reqTitles: Record<string, string> = { "req-000001": "認証" };
const specTitles: Record<string, string> = {};

describe("FeedbackTable", () => {
  afterEach(() => cleanup());

  it("feedbacks空: empty メッセージが表示される", () => {
    render(
      <FeedbackTable
        feedbacks={[]}
        requirementTitles={reqTitles}
        specificationTitles={specTitles}
      />,
    );
    expect(screen.getByTestId("feedback-empty")).toBeInTheDocument();
  });

  it("feedbacks配列に基づく行数の正確性", () => {
    const feedbacks: FeedbackEntry[] = [
      baseFeedback,
      { ...baseFeedback, githubIssue: 43, type: "improvement", severity: "medium" },
      { ...baseFeedback, githubIssue: 44, type: "security", severity: "critical" },
    ];
    render(
      <FeedbackTable
        feedbacks={feedbacks}
        requirementTitles={reqTitles}
        specificationTitles={specTitles}
      />,
    );

    expect(screen.getAllByTestId("feedback-row")).toHaveLength(3);
  });

  it("Issue番号が表示される", () => {
    render(
      <FeedbackTable
        feedbacks={[baseFeedback]}
        requirementTitles={reqTitles}
        specificationTitles={specTitles}
      />,
    );

    expect(screen.getByTestId("feedback-issue")).toHaveTextContent("#42");
  });

  it("タイプバッジにbug用の色クラスが適用される", () => {
    render(
      <FeedbackTable
        feedbacks={[baseFeedback]}
        requirementTitles={reqTitles}
        specificationTitles={specTitles}
      />,
    );

    const badge = screen.getByTestId("feedback-type-badge");
    expect(badge).toHaveTextContent("bug");
    expect(badge).toHaveClass("bg-red-100");
  });

  it("severityバッジが表示される", () => {
    render(
      <FeedbackTable
        feedbacks={[baseFeedback]}
        requirementTitles={reqTitles}
        specificationTitles={specTitles}
      />,
    );

    const badge = screen.getByTestId("feedback-severity-badge");
    expect(badge).toHaveTextContent("high");
    expect(badge).toHaveClass("bg-orange-500");
  });

  it("statusバッジが表示される", () => {
    render(
      <FeedbackTable
        feedbacks={[baseFeedback]}
        requirementTitles={reqTitles}
        specificationTitles={specTitles}
      />,
    );

    const badge = screen.getByTestId("feedback-status-badge");
    expect(badge).toHaveTextContent("open");
    expect(badge).toHaveClass("bg-green-100");
  });

  it("type/severityがundefinedの場合はバッジが表示されない", () => {
    const fb: FeedbackEntry = {
      ...baseFeedback,
      type: undefined,
      severity: undefined,
    };
    render(
      <FeedbackTable
        feedbacks={[fb]}
        requirementTitles={reqTitles}
        specificationTitles={specTitles}
      />,
    );

    expect(screen.queryByTestId("feedback-type-badge")).toBeNull();
    expect(screen.queryByTestId("feedback-severity-badge")).toBeNull();
  });

  it("titleがある場合はtitleが表示される", () => {
    const fb: FeedbackEntry = { ...baseFeedback, title: "Login button broken" };
    render(
      <FeedbackTable
        feedbacks={[fb]}
        requirementTitles={reqTitles}
        specificationTitles={specTitles}
      />,
    );

    expect(screen.getByTestId("feedback-title")).toHaveTextContent("Login button broken");
  });

  it("titleがundefinedの場合は'-'が表示される", () => {
    render(
      <FeedbackTable
        feedbacks={[baseFeedback]}
        requirementTitles={reqTitles}
        specificationTitles={specTitles}
      />,
    );

    expect(screen.getByTestId("feedback-title")).toHaveTextContent("-");
  });

  it("関連Req/Specリンクが表示される", () => {
    render(
      <FeedbackTable
        feedbacks={[baseFeedback]}
        requirementTitles={reqTitles}
        specificationTitles={specTitles}
      />,
    );

    expect(screen.getByTestId("linked-requirement")).toHaveTextContent("認証");
  });
});
