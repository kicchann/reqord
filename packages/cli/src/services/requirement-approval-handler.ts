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

  async saveCurrentApproval(cwd, target, newVersion) {
    const req = await reqRepo.findByIdOrThrow(cwd, target.id);
    await reqRepo.save(cwd, {
      ...req,
      currentApproval: {
        version: newVersion,
        phase: "requirement" as const,
        prNumber: 0,
        prUrl: "",
        approvedBy: [],
      },
    });
  },

  async updatePrInfo(cwd, target, prNumber, prUrl) {
    const req = await reqRepo.findByIdOrThrow(cwd, target.id);
    if (!req.currentApproval) {
      throw new Error(`Cannot update PR info: ${target.id} has no current approval.`);
    }
    await reqRepo.save(cwd, {
      ...req,
      currentApproval: {
        ...req.currentApproval,
        prNumber,
        prUrl,
      },
    });
  },

  buildPrTitle(target) {
    return `[Reqord] Approve ${target.id}: ${target.title} v${target.version}`;
  },

  buildPrBody(target) {
    return `## 要件承認依頼

| フィールド | 値 |
|-----------|------|
| ID | ${target.id} |
| タイトル | ${target.title} |
| バージョン | ${target.version} |

### 変更内容
status: draft → approved

> マージ後、\`reqord req update ${target.id} --status approved\` でステータスを更新してください。`;
  },
};
