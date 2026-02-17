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
  const contentAfterHeading = summarySection.replace(/^##\s+(?:\d+\.\s+)?設計概要\s*\n+/, "");
  const summary = contentAfterHeading.trim();

  return summary || "(設計概要なし)";
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function extractDesignSection(designContent: string, sectionName: string): string | null {
  if (!designContent) return null;

  const escaped = escapeRegExp(sectionName);
  const sections = designContent.split(/\n(?=##\s)/);
  const section = sections.find(s =>
    new RegExp(`^##\\s+(?:\\d+\\.\\s+)?${escaped}`).test(s),
  );

  if (!section) return null;

  const contentAfterHeading = section.replace(
    new RegExp(`^##\\s+(?:\\d+\\.\\s+)?${escaped}\\s*\\n+`),
    "",
  );
  const trimmed = contentAfterHeading.trim();
  return trimmed || null;
}

export function extractComponentList(designContent: string): string[] {
  if (!designContent) return [];

  const section = extractDesignSection(designContent, "コンポーネント設計");
  if (!section) return [];

  // Extract ### headings as component names
  const components: string[] = [];
  const headingRegex = /^###\s+[\d.]*\s*(.+)/gm;
  let match;
  while ((match = headingRegex.exec(section)) !== null) {
    components.push(match[1].trim());
  }
  return components;
}

export interface SpecApprovalPrBodyParams {
  specId: string;
  reqId: string;
  reqTitle: string;
  version: string;
  designSummary: string;
  successCriteria?: string[];
  testPlan?: string;
  components?: string[];
}

export function buildSpecApprovalPrBody(params: SpecApprovalPrBodyParams): string {
  const lines: string[] = [
    `## 仕様承認依頼`,
    ``,
    `| フィールド | 値 |`,
    `|-----------|------|`,
    `| Specification ID | ${params.specId} |`,
    `| Requirement ID | ${params.reqId} |`,
    `| 要件タイトル | ${params.reqTitle} |`,
    `| バージョン | ${params.version} |`,
    ``,
    `### 設計概要`,
    params.designSummary,
    ``,
    `### 変更内容`,
    `status: draft → approved`,
  ];

  if (params.successCriteria && params.successCriteria.length > 0) {
    lines.push(``, `### 対象要件の成功基準`);
    for (const criterion of params.successCriteria) {
      lines.push(`- ${criterion}`);
    }
  }

  if (params.components && params.components.length > 0) {
    lines.push(``, `### コンポーネント一覧`);
    for (const component of params.components) {
      lines.push(`- ${component}`);
    }
  }

  if (params.testPlan) {
    lines.push(``, `### テスト方針`, params.testPlan);
  }

  lines.push(
    ``,
    `### 設計ファイル`,
    `- \`specifications/${params.specId}/design.md\``,
    ``,
    `### Checklist`,
    `- [ ] 設計が要件の成功基準をカバーしている`,
    `- [ ] コンポーネント設計が妥当`,
    `- [ ] テスト方針が明確`,
    `- [ ] Breaking changesの確認`,
    `- [ ] セルフレビュー完了`,
    ``,
    `> マージ後、\`reqord spec update ${params.specId} --status approved\` でステータスを更新してください。`,
  );

  return lines.join("\n");
}
