import * as reqRepo from "../repositories/requirement.js";
import { updateRequirement } from "./requirement-service.js";
import type { ApprovalHandler } from "./approval-service.js";

export const requirementHandler: ApprovalHandler = {
  async revalidate(cwd, target) {
    const requirement = await reqRepo.findByIdOrThrow(cwd, target.id);
    if (requirement.status !== "draft") {
      throw new Error(
        `Cannot start approval: ${target.id} current status is "${requirement.status}", expected "draft".`
      );
    }
    if (requirement.version !== target.version) {
      throw new Error(
        `Cannot start approval: ${target.id} current version is "${requirement.version}", expected "${target.version}".`
      );
    }
  },

  async updateStatus(cwd, target) {
    const { after } = await updateRequirement(cwd, target.id, { status: "approved" });
    return after.version;
  },

  buildPrTitle(target) {
    return `[Reqord] Approve ${target.id}: ${target.title} v${target.version}`;
  },

  buildPrBody(target) {
    return buildReqApprovalPrBody({
      id: target.id,
      title: target.title,
      version: target.version,
    });
  },
};

export interface ReqApprovalPrBodyParams {
  id: string;
  title: string;
  version: string;
  successCriteria?: string[];
  dependencies?: {
    blockedBy: string[];
    blocks: string[];
    relatedTo: string[];
  };
}

export function buildReqApprovalPrBody(params: ReqApprovalPrBodyParams): string {
  const lines: string[] = [
    `## Requirement Approval Request`,
    ``,
    `| Field | Value |`,
    `|-----------|------|`,
    `| ID | ${params.id} |`,
    `| Title | ${params.title} |`,
    `| Version | ${params.version} |`,
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

  if (params.dependencies) {
    const deps = params.dependencies;
    const hasAny =
      deps.blockedBy.length > 0 ||
      deps.blocks.length > 0 ||
      deps.relatedTo.length > 0;
    if (hasAny) {
      lines.push(``, `### Dependencies`);
      if (deps.blockedBy.length > 0) {
        lines.push(`- **blockedBy:** ${deps.blockedBy.join(", ")}`);
      }
      if (deps.blocks.length > 0) {
        lines.push(`- **blocks:** ${deps.blocks.join(", ")}`);
      }
      if (deps.relatedTo.length > 0) {
        lines.push(`- **relatedTo:** ${deps.relatedTo.join(", ")}`);
      }
    }
  }

  lines.push(
    ``,
    `### Checklist`,
    `- [ ] Success criteria are clear and verifiable`,
    `- [ ] No dependency issues`,
    `- [ ] Self-review completed`,
    `- [ ] Breaking changes reviewed`,
    `- [ ] Impact on related specifications reviewed`,
  );

  return lines.join("\n");
}
