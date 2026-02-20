import { describe, it, expect } from "vitest";
import { buildReqApprovalPrBody } from "./requirement-approval-handler.js";

describe("buildReqApprovalPrBody", () => {
  it("テンプレートに各フィールドが正しく埋め込まれる", () => {
    const result = buildReqApprovalPrBody({
      id: "req-000011",
      title: "要件タイトル",
      version: "2.0",
    });

    expect(result).toContain("| ID | req-000011 |");
    expect(result).toContain("| Title | 要件タイトル |");
    expect(result).toContain("| Version | 2.0 |");
    expect(result).toContain("status: draft → approved");
  });

  it("PR本文が要件承認依頼ヘッダーで始まる", () => {
    const result = buildReqApprovalPrBody({
      id: "req-000001",
      title: "テスト",
      version: "1.0",
    });

    expect(result).toMatch(/^## Requirement Approval Request/);
  });

  it("PR本文に手動更新指示が含まれない", () => {
    const result = buildReqApprovalPrBody({
      id: "req-000011",
      title: "要件タイトル",
      version: "2.0",
      successCriteria: ["基準1", "基準2"],
      dependencies: {
        blockedBy: ["req-000001"],
        blocks: ["req-000002"],
        relatedTo: ["req-000003"],
      },
    });

    expect(result).not.toMatch(/reqord\s+req\s+update/);
    expect(result).not.toMatch(/reqord\s+spec\s+update/);
    expect(result).not.toContain("手動で");
    expect(result).not.toContain("manually");
  });
});
