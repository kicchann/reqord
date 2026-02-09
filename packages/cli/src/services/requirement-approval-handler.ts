import * as reqRepo from "../repositories/requirement.js";
import { updateRequirement } from "./requirement-service.js";
import type { ApprovalHandler, ApprovalTarget } from "./approval-service.js";

export const requirementHandler: ApprovalHandler = {
  async revalidate(cwd, target) {
    const requirement = await reqRepo.findById(cwd, target.id);
    if (!requirement) {
      throw new Error(`${target.id} not found.`);
    }
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
    const { after } = await updateRequirement(cwd, target.id, { status: "pending_approval" });
    return after.version;
  },

  async saveCurrentApproval(cwd, target, newVersion) {
    const req = await reqRepo.findById(cwd, target.id);
    if (req) {
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
    }
  },

  async updatePrInfo(cwd, target, prNumber, prUrl) {
    const req = await reqRepo.findById(cwd, target.id);
    if (req?.currentApproval) {
      await reqRepo.save(cwd, {
        ...req,
        currentApproval: {
          ...req.currentApproval,
          prNumber,
          prUrl,
        },
      });
    }
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
status: draft → pending_approval

> マージ後、\`reqord req update ${target.id} --status approved\` でステータスを更新してください。`;
  },
};
