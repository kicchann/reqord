// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { StatusBadge, PriorityBadge, ComplexityBadge } from "../../../components/ui/badge";

describe("StatusBadge", () => {
  afterEach(() => cleanup());

  it("draftステータスに正しいクラスが適用される", () => {
    const { container } = render(<StatusBadge status="draft" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveTextContent("Draft");
    expect(badge.className).toContain("bg-gray-100");
    expect(badge.className).toContain("text-gray-600");
  });

  it("approvedステータスにblue系クラスが適用される", () => {
    const { container } = render(<StatusBadge status="approved" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveTextContent("Approved");
    expect(badge.className).toContain("bg-blue-50");
    expect(badge.className).toContain("text-blue-700");
  });

  it("implementedステータスにemerald系クラスが適用される", () => {
    const { container } = render(<StatusBadge status="implemented" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveTextContent("Implemented");
    expect(badge.className).toContain("bg-emerald-50");
    expect(badge.className).toContain("text-emerald-700");
  });

  it("deprecatedステータスにred系クラスが適用される", () => {
    const { container } = render(<StatusBadge status="deprecated" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveTextContent("Deprecated");
    expect(badge.className).toContain("bg-red-50");
    expect(badge.className).toContain("text-red-700");
  });

  it("ring-1 ring-insetクラスで輪郭が明確化されている", () => {
    const { container } = render(<StatusBadge status="draft" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("ring-1");
    expect(badge.className).toContain("ring-inset");
  });
});

describe("PriorityBadge", () => {
  afterEach(() => cleanup());

  it("highプライオリティに正しいクラスが適用される", () => {
    const { container } = render(<PriorityBadge priority="high" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveTextContent("High");
    expect(badge.className).toContain("bg-red-100");
  });

  it("mediumプライオリティに正しいクラスが適用される", () => {
    const { container } = render(<PriorityBadge priority="medium" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveTextContent("Medium");
    expect(badge.className).toContain("bg-orange-100");
  });

  it("lowプライオリティに正しいクラスが適用される", () => {
    const { container } = render(<PriorityBadge priority="low" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveTextContent("Low");
    expect(badge.className).toContain("bg-blue-100");
  });
});

describe("ComplexityBadge", () => {
  afterEach(() => cleanup());

  it("smallに正しいラベルが表示される", () => {
    render(<ComplexityBadge complexity="small" />);
    expect(screen.getByText("S")).toBeInTheDocument();
  });

  it("mediumに正しいラベルが表示される", () => {
    render(<ComplexityBadge complexity="medium" />);
    expect(screen.getByText("M")).toBeInTheDocument();
  });

  it("largeに正しいラベルが表示される", () => {
    render(<ComplexityBadge complexity="large" />);
    expect(screen.getByText("L")).toBeInTheDocument();
  });

  it("xlargeに正しいラベルが表示される", () => {
    render(<ComplexityBadge complexity="xlarge" />);
    expect(screen.getByText("XL")).toBeInTheDocument();
  });
});
