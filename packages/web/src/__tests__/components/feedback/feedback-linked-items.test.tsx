// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { FeedbackLinkedTo } from "@reqord/shared";
import { FeedbackLinkedItems } from "../../../components/feedback/feedback-linked-items";

const emptyLinkedTo: FeedbackLinkedTo = {
  requirements: [],
  createdRequirements: [],
  specifications: [],
  createdSpecifications: [],
};

const reqTitles: Record<string, string> = {
  "req-000001": "ユーザー認証",
  "req-000002": "データ管理",
};

const specTitles: Record<string, string> = {
  "spec-000001": "認証API",
  "spec-000002": "管理画面",
};

describe("FeedbackLinkedItems", () => {
  afterEach(() => cleanup());

  it("空の場合: 何も表示されない", () => {
    const { container } = render(
      <FeedbackLinkedItems
        linkedTo={emptyLinkedTo}
        requirementTitles={reqTitles}
        specificationTitles={specTitles}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("requirementsリンクが表示される", () => {
    render(
      <FeedbackLinkedItems
        linkedTo={{ ...emptyLinkedTo, requirements: ["req-000001"] }}
        requirementTitles={reqTitles}
        specificationTitles={specTitles}
      />,
    );

    const link = screen.getByTestId("linked-requirement");
    expect(link).toHaveTextContent("ユーザー認証");
    expect(link).toHaveAttribute("href", "/requirements/req-000001");
  });

  it("createdRequirementsに「created」バッジが表示される", () => {
    render(
      <FeedbackLinkedItems
        linkedTo={{ ...emptyLinkedTo, createdRequirements: ["req-000002"] }}
        requirementTitles={reqTitles}
        specificationTitles={specTitles}
      />,
    );

    const link = screen.getByTestId("created-requirement");
    expect(link).toHaveTextContent("データ管理");
    expect(link).toHaveTextContent("created");
  });

  it("specificationsリンクが表示される", () => {
    render(
      <FeedbackLinkedItems
        linkedTo={{ ...emptyLinkedTo, specifications: ["spec-000001"] }}
        requirementTitles={reqTitles}
        specificationTitles={specTitles}
      />,
    );

    const link = screen.getByTestId("linked-specification");
    expect(link).toHaveTextContent("認証API");
    expect(link).toHaveAttribute("href", "/specifications/spec-000001");
  });

  it("createdSpecificationsに「created」バッジが表示される", () => {
    render(
      <FeedbackLinkedItems
        linkedTo={{ ...emptyLinkedTo, createdSpecifications: ["spec-000002"] }}
        requirementTitles={reqTitles}
        specificationTitles={specTitles}
      />,
    );

    const link = screen.getByTestId("created-specification");
    expect(link).toHaveTextContent("管理画面");
    expect(link).toHaveTextContent("created");
  });

  it("resolvedに「resolved」バッジが表示される", () => {
    render(
      <FeedbackLinkedItems
        linkedTo={{
          ...emptyLinkedTo,
          resolved: {
            requirements: ["req-000001"],
            specifications: ["spec-000001"],
          },
        }}
        requirementTitles={reqTitles}
        specificationTitles={specTitles}
      />,
    );

    const reqLink = screen.getByTestId("resolved-requirement");
    expect(reqLink).toHaveTextContent("ユーザー認証");
    expect(reqLink).toHaveTextContent("resolved");

    const specLink = screen.getByTestId("resolved-specification");
    expect(specLink).toHaveTextContent("認証API");
    expect(specLink).toHaveTextContent("resolved");
  });

  it("タイトルマップにないIDはIDがそのまま表示される", () => {
    render(
      <FeedbackLinkedItems
        linkedTo={{ ...emptyLinkedTo, requirements: ["req-999999"] }}
        requirementTitles={reqTitles}
        specificationTitles={specTitles}
      />,
    );

    expect(screen.getByTestId("linked-requirement")).toHaveTextContent("req-999999");
  });
});
