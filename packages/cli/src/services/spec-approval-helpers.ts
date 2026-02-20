export function extractDesignSummary(designContent: string): string {
  if (!designContent) {
    return "(No design summary)";
  }

  // Split content into sections by ## headings
  const sections = designContent.split(/\n(?=##\s)/);

  // Find the section that starts with "## Design Overview" or "## 設計概要" (with optional numbering)
  const summarySection = sections.find(section =>
    /^##\s+(?:\d+\.\s+)?(?:Design Overview|設計概要)/.test(section)
  );

  if (!summarySection) {
    return "(No design summary)";
  }

  // Extract content after the heading
  const contentAfterHeading = summarySection.replace(/^##\s+(?:\d+\.\s+)?(?:Design Overview|設計概要)\s*\n+/, "");
  const summary = contentAfterHeading.trim();

  return summary || "(No design summary)";
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

  // Try English first, then Japanese fallback
  const section = extractDesignSection(designContent, "Component Design")
    ?? extractDesignSection(designContent, "コンポーネント設計");
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
    `## Specification Approval Request`,
    ``,
    `| Field | Value |`,
    `|-----------|------|`,
    `| Specification ID | ${params.specId} |`,
    `| Requirement ID | ${params.reqId} |`,
    `| Requirement Title | ${params.reqTitle} |`,
    `| Version | ${params.version} |`,
    ``,
    `### Design Overview`,
    params.designSummary,
    ``,
    `### Changes`,
    `status: draft → approved`,
  ];

  if (params.successCriteria && params.successCriteria.length > 0) {
    lines.push(``, `### Success Criteria`);
    for (const criterion of params.successCriteria) {
      lines.push(`- ${criterion}`);
    }
  }

  if (params.components && params.components.length > 0) {
    lines.push(``, `### Components`);
    for (const component of params.components) {
      lines.push(`- ${component}`);
    }
  }

  if (params.testPlan) {
    lines.push(``, `### Test Plan`, params.testPlan);
  }

  lines.push(
    ``,
    `### Design Files`,
    `- \`specifications/${params.specId}/design.md\``,
    ``,
    `### Checklist`,
    `- [ ] Design covers success criteria`,
    `- [ ] Component design is appropriate`,
    `- [ ] Test plan is clear`,
    `- [ ] Breaking changes reviewed`,
    `- [ ] Self-review completed`,
  );

  return lines.join("\n");
}
