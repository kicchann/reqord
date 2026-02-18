// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { Flag } from "@reqord/shared";
import { FlagList } from "../../../components/flags/flag-list";

describe("FlagList", () => {
  afterEach(() => cleanup());

  it("flags空配列: 何も表示されない", () => {
    const { container } = render(<FlagList flags={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("feedback-reviewフラグ: severity バッジとrelatedIssuesリンクが表示される", () => {
    const flags: Flag[] = [
      {
        type: "feedback-review",
        reason: "セキュリティ関連の指摘",
        createdAt: "2026-01-01T00:00:00Z",
        relatedIssues: [42, 43],
        severity: "high",
      },
    ];
    render(<FlagList flags={flags} />);

    expect(screen.getByTestId("flag-list")).toBeInTheDocument();
    expect(screen.getByTestId("flag-severity")).toHaveTextContent("high");
    const issues = screen.getAllByTestId("related-issue");
    expect(issues).toHaveLength(2);
    expect(issues[0]).toHaveTextContent("#42");
    expect(issues[1]).toHaveTextContent("#43");
  });

  it("breaking-changeフラグ: affectedVersionsが表示される", () => {
    const flags: Flag[] = [
      {
        type: "breaking-change",
        reason: "API変更",
        createdAt: "2026-01-01T00:00:00Z",
        affectedVersions: ["0.1.0", "0.2.0"],
      },
    ];
    render(<FlagList flags={flags} />);

    expect(screen.getByTestId("affected-versions")).toHaveTextContent("0.1.0, 0.2.0");
  });

  it("security-reviewフラグ: 警告スタイルが適用される", () => {
    const flags: Flag[] = [
      {
        type: "security-review",
        reason: "認証ロジックの確認が必要",
        createdAt: "2026-01-01T00:00:00Z",
      },
    ];
    render(<FlagList flags={flags} />);

    expect(screen.getByTestId("flag-badge-security-review")).toHaveClass("bg-red-100");
  });

  it("複数フラグ: 全件表示される", () => {
    const flags: Flag[] = [
      {
        type: "feedback-review",
        reason: "指摘A",
        createdAt: "2026-01-01T00:00:00Z",
        relatedIssues: [1],
        severity: "medium",
      },
      {
        type: "security-review",
        reason: "指摘B",
        createdAt: "2026-01-02T00:00:00Z",
      },
      {
        type: "breaking-change",
        reason: "指摘C",
        createdAt: "2026-01-03T00:00:00Z",
      },
    ];
    render(<FlagList flags={flags} />);

    const items = screen.getAllByTestId("flag-item");
    expect(items).toHaveLength(3);
  });
});
