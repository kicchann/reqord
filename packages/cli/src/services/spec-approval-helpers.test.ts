import { describe, it, expect } from "vitest";
import { extractDesignSummary, buildSpecApprovalPrBody } from "./spec-approval-helpers.js";

describe("extractDesignSummary", () => {
  it("'## 1. 設計概要' セクションの内容を抽出する", () => {
    const designContent = `# spec-000015 - Design

## 1. 設計概要

Specificationの承認プロセスをGitHub PRベースで管理する。

## 2. アーキテクチャ

詳細な設計...`;

    const result = extractDesignSummary(designContent);
    expect(result).toBe("Specificationの承認プロセスをGitHub PRベースで管理する。");
  });

  it("'## 設計概要' セクションからも抽出できる", () => {
    const designContent = `# Design

## 設計概要

シンプルな設計内容。

## インターフェース設計

入力定義...`;

    const result = extractDesignSummary(designContent);
    expect(result).toBe("シンプルな設計内容。");
  });

  it("設計概要セクションがない場合はデフォルトメッセージを返す", () => {
    const designContent = `# Design

## アーキテクチャ

内容...`;

    const result = extractDesignSummary(designContent);
    expect(result).toBe("(設計概要なし)");
  });

  it("設計概要が複数行の場合はすべて含む", () => {
    const designContent = `# Design

## 1. 設計概要

1行目の説明。
2行目の詳細。
3行目の補足。

## 2. 次のセクション`;

    const result = extractDesignSummary(designContent);
    expect(result).toBe("1行目の説明。\n2行目の詳細。\n3行目の補足。");
  });

  it("設計概要が最後のセクションの場合も正しく抽出する", () => {
    const designContent = `# Design

## 1. 設計概要

最後のセクションの内容。`;

    const result = extractDesignSummary(designContent);
    expect(result).toBe("最後のセクションの内容。");
  });

  it("空文字列の場合はデフォルトメッセージを返す", () => {
    expect(extractDesignSummary("")).toBe("(設計概要なし)");
  });
});

describe("buildSpecApprovalPrBody", () => {
  it("テンプレートに各フィールドが正しく埋め込まれる", () => {
    const result = buildSpecApprovalPrBody({
      specId: "spec-000015",
      reqId: "req-000015",
      reqTitle: "承認フロー実装",
      version: "1.0.0",
      designSummary: "設計の概要説明。",
    });

    expect(result).toContain("| Specification ID | spec-000015 |");
    expect(result).toContain("| Requirement ID | req-000015 |");
    expect(result).toContain("| 要件タイトル | 承認フロー実装 |");
    expect(result).toContain("| バージョン | 1.0.0 |");
    expect(result).toContain("### 設計概要\n設計の概要説明。");
    expect(result).toContain("status: draft → pending_approval");
    expect(result).toContain("`specifications/spec-000015/design.md`");
  });

  it("PR本文が仕様承認依頼ヘッダーで始まる", () => {
    const result = buildSpecApprovalPrBody({
      specId: "spec-000001",
      reqId: "req-000001",
      reqTitle: "テスト",
      version: "1.0.0",
      designSummary: "概要",
    });

    expect(result).toMatch(/^## 仕様承認依頼/);
  });

  it("マージ後の案内メッセージが含まれる", () => {
    const result = buildSpecApprovalPrBody({
      specId: "spec-000001",
      reqId: "req-000001",
      reqTitle: "テスト",
      version: "1.0.0",
      designSummary: "概要",
    });

    expect(result).toContain("マージ後、`reqord spec update spec-000001 --status approved` でステータスを更新してください。");
  });
});
