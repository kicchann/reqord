import * as specRepo from "../repositories/specification.js";
import { updateSpecificationStatus } from "./specification-service.js";
import { buildSpecApprovalPrBody } from "./spec-approval-helpers.js";
import type { ApprovalHandler, ApprovalTarget } from "./approval-service.js";

export const specificationHandler: ApprovalHandler = {
  async revalidate(cwd, target) {
    const spec = await specRepo.findById(cwd, target.id);
    if (!spec) {
      throw new Error(`${target.id} not found.`);
    }
    if (spec.status !== "draft") {
      throw new Error(
        `Cannot start approval: ${target.id} current status is "${spec.status}", expected "draft".`
      );
    }
    if (spec.version !== target.version) {
      throw new Error(
        `Cannot start approval: ${target.id} current version is "${spec.version}", expected "${target.version}".`
      );
    }
  },

  async updateStatus(cwd, target) {
    const { after } = await updateSpecificationStatus(cwd, target.id, "pending_approval");
    return after.version;
  },

  async saveCurrentApproval(cwd, target, newVersion) {
    const spec = await specRepo.findById(cwd, target.id);
    if (spec) {
      await specRepo.save(cwd, {
        ...spec,
        currentApproval: {
          version: newVersion,
          phase: "specification" as const,
          prNumber: 0,
          prUrl: "",
          approvedBy: [],
        },
      });
    }
  },

  async updatePrInfo(cwd, target, prNumber, prUrl) {
    const spec = await specRepo.findById(cwd, target.id);
    if (spec?.currentApproval) {
      await specRepo.save(cwd, {
        ...spec,
        currentApproval: {
          ...spec.currentApproval,
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
    // This will be overridden in the command with actual design content
    return buildSpecApprovalPrBody({
      specId: target.id,
      reqId: "",
      reqTitle: target.title,
      version: target.version,
      designSummary: "(設計概要なし)",
    });
  },
};
