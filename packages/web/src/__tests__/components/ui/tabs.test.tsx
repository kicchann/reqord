// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { Tabs } from "../../../components/ui/tabs";

const tabs = [
  { id: "design", label: "Design" },
  { id: "research", label: "Research" },
  { id: "coverage", label: "Coverage" },
];

describe("Tabs - アクセシビリティ", () => {
  afterEach(() => cleanup());

  it("各タブボタンにrole='tab'が設定されている", () => {
    render(<Tabs tabs={tabs} activeTab="design" onTabChange={vi.fn()} />);

    const tabButtons = screen.getAllByRole("tab");
    expect(tabButtons).toHaveLength(3);
  });

  it("アクティブなタブのaria-selected='true'が設定される", () => {
    render(<Tabs tabs={tabs} activeTab="design" onTabChange={vi.fn()} />);

    const designTab = screen.getByRole("tab", { name: "Design" });
    expect(designTab).toHaveAttribute("aria-selected", "true");
  });

  it("非アクティブなタブのaria-selected='false'が設定される", () => {
    render(<Tabs tabs={tabs} activeTab="design" onTabChange={vi.fn()} />);

    const researchTab = screen.getByRole("tab", { name: "Research" });
    expect(researchTab).toHaveAttribute("aria-selected", "false");
  });

  it("タブクリックでonTabChangeが呼ばれる", () => {
    const onTabChange = vi.fn();
    render(<Tabs tabs={tabs} activeTab="design" onTabChange={onTabChange} />);

    fireEvent.click(screen.getByRole("tab", { name: "Research" }));
    expect(onTabChange).toHaveBeenCalledWith("research");
  });

  it("全タブのラベルが表示される", () => {
    render(<Tabs tabs={tabs} activeTab="design" onTabChange={vi.fn()} />);

    expect(screen.getByText("Design")).toBeInTheDocument();
    expect(screen.getByText("Research")).toBeInTheDocument();
    expect(screen.getByText("Coverage")).toBeInTheDocument();
  });
});
