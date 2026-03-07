// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { SpecificationTable } from "../../../components/specification/specification-table";
import type { Specification } from "@reqord/shared";

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

const makeSpec = (id: string, overrides: Partial<Specification> = {}): Specification => ({
  id,
  requirementId: "req-000001",
  title: `Specification ${id}`,
  status: "draft",
  version: "1.0",
  updatedAt: "2026-01-01T00:00:00Z",
  createdAt: "2026-01-01T00:00:00Z",
  files: { design: "design.md", supplementary: [] },
  versionHistory: [],
  ...overrides,
});

const specifications: Specification[] = [
  makeSpec("spec-000001", { status: "approved", requirementId: "req-000001" }),
  makeSpec("spec-000002", { status: "implemented", requirementId: "req-000002" }),
  makeSpec("spec-000003", { status: "draft", requirementId: "req-000001" }),
];

const requirementTitleMap: Record<string, string> = {
  "req-000001": "Auth Requirement",
  "req-000002": "Dashboard Requirement",
};

describe("SpecificationTable - ソートヘッダのアクセシビリティ", () => {
  afterEach(() => cleanup());

  it("ソートボタンがbutton要素として描画される（キーボード操作可能）", () => {
    render(
      <SpecificationTable
        specifications={specifications}
        requirementTitleMap={requirementTitleMap}
      />
    );

    const sortButtons = screen.getAllByRole("button");
    expect(sortButtons.length).toBeGreaterThanOrEqual(6);
  });

  it("アクティブなソート列のthにaria-sort='ascending'が設定される", () => {
    render(
      <SpecificationTable
        specifications={specifications}
        requirementTitleMap={requirementTitleMap}
      />
    );

    const idHeader = screen.getByRole("columnheader", { name: /id/i });
    expect(idHeader).toHaveAttribute("aria-sort", "ascending");
  });

  it("ソートボタンクリックで降順になるとthのaria-sort='descending'になる", () => {
    render(
      <SpecificationTable
        specifications={specifications}
        requirementTitleMap={requirementTitleMap}
      />
    );

    const idButton = screen.getByRole("button", { name: /id/i });
    fireEvent.click(idButton);

    const idHeader = screen.getByRole("columnheader", { name: /id/i });
    expect(idHeader).toHaveAttribute("aria-sort", "descending");
  });

  it("非アクティブな列のthにaria-sort属性がない", () => {
    render(
      <SpecificationTable
        specifications={specifications}
        requirementTitleMap={requirementTitleMap}
      />
    );

    const titleHeader = screen.getByRole("columnheader", { name: /title/i });
    expect(titleHeader).not.toHaveAttribute("aria-sort");
  });
});

describe("SpecificationTable - フォーム要素のアクセシビリティ", () => {
  afterEach(() => cleanup());

  it("検索inputにaria-labelが設定されている", () => {
    render(
      <SpecificationTable
        specifications={specifications}
        requirementTitleMap={requirementTitleMap}
      />
    );

    const searchInput = screen.getByRole("textbox");
    expect(searchInput).toHaveAttribute("aria-label");
  });

  it("ステータスselectにaria-labelが設定されている", () => {
    render(
      <SpecificationTable
        specifications={specifications}
        requirementTitleMap={requirementTitleMap}
      />
    );

    const selects = screen.getAllByRole("combobox");
    const statusSelect = selects.find(s =>
      s.getAttribute("aria-label")?.toLowerCase().includes("status")
    );
    expect(statusSelect).toBeDefined();
  });
});

describe("SpecificationTable - 空状態UI", () => {
  afterEach(() => cleanup());

  it("フィルタ結果が0件のとき空状態UIが表示される", () => {
    render(
      <SpecificationTable
        specifications={specifications}
        requirementTitleMap={requirementTitleMap}
      />
    );

    const searchInput = screen.getByRole("textbox");
    fireEvent.change(searchInput, { target: { value: "nonexistent-xyz-abc" } });

    expect(screen.getByText("No specifications found")).toBeInTheDocument();
  });

  it("フィルタ適用中に空状態UIのリセットボタンが表示される", () => {
    render(
      <SpecificationTable
        specifications={specifications}
        requirementTitleMap={requirementTitleMap}
      />
    );

    const searchInput = screen.getByRole("textbox");
    fireEvent.change(searchInput, { target: { value: "nonexistent-xyz-abc" } });

    expect(screen.getByText("Clear all filters")).toBeInTheDocument();
  });

  it("リセットボタンクリックでフィルタが解除され全件表示に戻る", () => {
    render(
      <SpecificationTable
        specifications={specifications}
        requirementTitleMap={requirementTitleMap}
      />
    );

    const searchInput = screen.getByRole("textbox");
    fireEvent.change(searchInput, { target: { value: "nonexistent-xyz-abc" } });

    const clearButton = screen.getByText("Clear all filters");
    fireEvent.click(clearButton);

    expect(screen.queryByText("No specifications found")).not.toBeInTheDocument();
    expect(screen.getByText("Specification spec-000001")).toBeInTheDocument();
  });
});

describe("SpecificationTable - テーブル可読性", () => {
  afterEach(() => cleanup());

  it("テーブルヘッダにborder-b-2クラスが適用されている", () => {
    const { container } = render(
      <SpecificationTable
        specifications={specifications}
        requirementTitleMap={requirementTitleMap}
      />
    );

    const thead = container.querySelector("thead");
    expect(thead).toHaveClass("border-b-2");
  });
});
