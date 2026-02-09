export function extractDesignSummary(designContent: string): string {
  if (!designContent) {
    return "(設計概要なし)";
  }

  // Split content into sections by ## headings
  const sections = designContent.split(/\n(?=##\s)/);

  // Find the section that starts with "## 設計概要" or "## 1. 設計概要"
  const summarySection = sections.find(section =>
    /^##\s+(?:\d+\.\s+)?設計概要/.test(section)
  );

  if (!summarySection) {
    return "(設計概要なし)";
  }

  // Extract content after the heading
  const contentAfterHeading = summarySection.replace(/^##\s+(?:\d+\.\s+)?設計概要\s*\n+/, '');
  const summary = contentAfterHeading.trim();

  return summary || "(設計概要なし)";
}

export interface SpecApprovalPrBodyParams {
  specId: string;
  reqId: string;
  reqTitle: string;
  version: string;
  designSummary: string;
}

export function buildSpecApprovalPrBody(params: SpecApprovalPrBodyParams): string {
  return `## 仕様承認依頼

| フィールド | 値 |
|-----------|------|
| Specification ID | ${params.specId} |
| Requirement ID | ${params.reqId} |
| 要件タイトル | ${params.reqTitle} |
| バージョン | ${params.version} |

### 設計概要
${params.designSummary}

### 変更内容
status: draft → pending_approval

### 設計ファイル
- \`specifications/${params.specId}/design.md\`

> このPRをマージすると、仕様のステータスが \`approved\` に更新されます。`;
}
