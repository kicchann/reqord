// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { RequirementTable } from "../../../components/requirement/requirement-table";
import type { Requirement } from "@reqord/shared";

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

const makeReq = (id: string, overrides: Partial<Requirement> = {}): Requirement => ({
  id,
  title: `Requirement ${id}`,
  status: "draft",
  priority: "medium",
  estimatedComplexity: "small",
  version: "1.0",
  format: { type: "user-story", userStory: { as: "user", iWant: "feature", soThat: "benefit" } },
  updatedAt: "2026-01-01T00:00:00Z",
  createdAt: "2026-01-01T00:00:00Z",
  dependencies: { blockedBy: [], blocks: [], relatedTo: [] },
  files: { description: "description.md", supplementary: [] },
  successCriteria: [],
  versionHistory: [],
  ...overrides,
});

const requirements: Requirement[] = [
  makeReq("req-000001", { status: "approved", priority: "high" }),
  makeReq("req-000002", { status: "implemented", priority: "low" }),
  makeReq("req-000003", { status: "draft", priority: "medium" }),
];

describe("RequirementTable - ソートヘッダのアクセシビリティ", () => {
  afterEach(() => cleanup());

  it("ソートボタンがbutton要素として描画される（キーボード操作可能）", () => {
    render(<RequirementTable requirements={requirements} />);

    const sortButtons = screen.getAllByRole("button");
    expect(sortButtons.length).toBeGreaterThanOrEqual(5);
  });

  it("アクティブなソート列のthにaria-sort='ascending'が設定される", () => {
    render(<RequirementTable requirements={requirements} />);

    const idHeader = screen.getByRole("columnheader", { name: /id/i });
    expect(idHeader).toHaveAttribute("aria-sort", "ascending");
  });

  it("ソートボタンクリックで降順になるとthのaria-sort='descending'になる", () => {
    render(<RequirementTable requirements={requirements} />);

    const idButton = screen.getByRole("button", { name: /id/i });
    fireEvent.click(idButton);

    const idHeader = screen.getByRole("columnheader", { name: /id/i });
    expect(idHeader).toHaveAttribute("aria-sort", "descending");
  });

  it("非アクティブな列のthにaria-sort属性がない", () => {
    render(<RequirementTable requirements={requirements} />);

    const titleHeader = screen.getByRole("columnheader", { name: /title/i });
    expect(titleHeader).not.toHaveAttribute("aria-sort");
  });

  it("Enterキーでソートが実行できる", () => {
    render(<RequirementTable requirements={requirements} />);

    const titleButton = screen.getByRole("button", { name: /title/i });
    fireEvent.keyDown(titleButton, { key: "Enter", code: "Enter" });
    fireEvent.click(titleButton);

    const titleHeader = screen.getByRole("columnheader", { name: /title/i });
    expect(titleHeader).toHaveAttribute("aria-sort", "ascending");
  });
});

describe("RequirementTable - フォーム要素のアクセシビリティ", () => {
  afterEach(() => cleanup());

  it("検索inputにaria-labelが設定されている", () => {
    render(<RequirementTable requirements={requirements} />);

    const searchInput = screen.getByRole("textbox");
    expect(searchInput).toHaveAttribute("aria-label");
  });

  it("ステータスselectにaria-labelが設定されている", () => {
    render(<RequirementTable requirements={requirements} />);

    const selects = screen.getAllByRole("combobox");
    const statusSelect = selects.find(s =>
      s.getAttribute("aria-label")?.toLowerCase().includes("status")
    );
    expect(statusSelect).toBeDefined();
  });

  it("プライオリティselectにaria-labelが設定されている", () => {
    render(<RequirementTable requirements={requirements} />);

    const selects = screen.getAllByRole("combobox");
    const prioritySelect = selects.find(s =>
      s.getAttribute("aria-label")?.toLowerCase().includes("priority")
    );
    expect(prioritySelect).toBeDefined();
  });
});

describe("RequirementTable - 空状態UI", () => {
  afterEach(() => cleanup());

  it("フィルタ結果が0件のとき空状態UIが表示される", () => {
    render(<RequirementTable requirements={requirements} />);

    const searchInput = screen.getByRole("textbox");
    fireEvent.change(searchInput, { target: { value: "nonexistent-xyz-abc" } });

    expect(screen.getByText("No requirements found")).toBeInTheDocument();
  });

  it("フィルタ適用中に空状態UIのリセットボタンが表示される", () => {
    render(<RequirementTable requirements={requirements} />);

    const searchInput = screen.getByRole("textbox");
    fireEvent.change(searchInput, { target: { value: "nonexistent-xyz-abc" } });

    expect(screen.getByText("Clear all filters")).toBeInTheDocument();
  });

  it("リセットボタンクリックでフィルタが解除され全件表示に戻る", () => {
    render(<RequirementTable requirements={requirements} />);

    const searchInput = screen.getByRole("textbox");
    fireEvent.change(searchInput, { target: { value: "nonexistent-xyz-abc" } });

    const clearButton = screen.getByText("Clear all filters");
    fireEvent.click(clearButton);

    expect(screen.queryByText("No requirements found")).not.toBeInTheDocument();
    expect(screen.getByText("Requirement req-000001")).toBeInTheDocument();
  });

  it("フィルタなし・0件の場合はリセットボタンが表示されない", () => {
    render(<RequirementTable requirements={[]} />);

    expect(screen.queryByText("Clear all filters")).not.toBeInTheDocument();
  });
});

describe("RequirementTable - テーブル可読性", () => {
  afterEach(() => cleanup());

  it("テーブルヘッダにborder-b-2クラスが適用されている", () => {
    const { container } = render(<RequirementTable requirements={requirements} />);

    const thead = container.querySelector("thead");
    expect(thead).toHaveClass("border-b-2");
  });
});
