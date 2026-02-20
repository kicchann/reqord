import * as specRepo from "../repositories/specification.js";
import { updateSpecificationStatus } from "./specification-service.js";
import { buildSpecApprovalPrBody } from "./spec-approval-helpers.js";
import type { ApprovalHandler } from "./approval-service.js";

export const specificationHandler: ApprovalHandler = {
  async revalidate(cwd, target) {
    const spec = await specRepo.findByIdOrThrow(cwd, target.id);
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
    const { after } = await updateSpecificationStatus(cwd, target.id, "approved");
    return after.version;
  },

  async saveCurrentApproval(cwd, target, newVersion) {
    const spec = await specRepo.findByIdOrThrow(cwd, target.id);
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
  },

  async updatePrInfo(cwd, target, prNumber, prUrl) {
    const spec = await specRepo.findByIdOrThrow(cwd, target.id);
    if (!spec.currentApproval) {
      throw new Error(`Cannot update PR info: current approval not found for "${target.id}".`);
    }
    await specRepo.save(cwd, {
      ...spec,
      currentApproval: {
        ...spec.currentApproval,
        prNumber,
        prUrl,
      },
    });
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
      designSummary: "(No design summary)",
    });
  },
};
