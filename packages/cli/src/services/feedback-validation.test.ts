import { describe, it, expect } from "vitest";
import type { FeedbackEntry } from "@reqord/shared";
import type { ProjectSettings } from "@reqord/shared";
import { shouldBlockApproval } from "./feedback-validation.js";

function makeFeedbackEntry(overrides: Partial<FeedbackEntry> = {}): FeedbackEntry {
  return {
    githubIssue: 1,
    type: "bug",
    severity: "medium",
    linkedTo: {
      requirements: [],
      createdRequirements: [],
      specifications: [],
      createdSpecifications: [],
    },
    syncedAt: "2026-01-01T00:00:00.000Z",
    status: "open",
    ...overrides,
  };
}

function makeSettings(overrides: Partial<ProjectSettings["feedbackValidation"]> = {}): ProjectSettings {
  return {
    invariants: {
      versioning: true,
      cyclicDependencyCheck: true,
      statusTransitionRules: true,
      schemaValidation: true,
    },
    approvalPrerequisites: {
      designMdCheck: true,
      descriptionMdCheck: false,
      customFiles: [],
    },
    statusTransitionPr: {
      draftToApproved: true,
      approvedToImplemented: false,
      toDraft: true,
    },
    branchNaming: {
      toApprovedPrefix: "reqord",
      toImplementedPrefix: "reqord",
      toDraftPrefix: "reqord",
    },
    feedbackValidation: {
      blockOnUnresolved: false,
      severityThreshold: "critical",
      ...overrides,
    },
    autoRevert: {
      onContentChange: "always",
    },
    consistencyCheck: {
      specNotImplementedLevel: "warning",
    },
  };
}

describe("shouldBlockApproval", () => {
  describe("blockOnUnresolved: false（デフォルト設定）", () => {
    it("未解決feedbackがあっても blocked: false を返す", () => {
      const feedbacks = [
        makeFeedbackEntry({ githubIssue: 1, severity: "critical" }),
        makeFeedbackEntry({ githubIssue: 2, severity: "high" }),
      ];
      const settings = makeSettings({ blockOnUnresolved: false });

      const result = shouldBlockApproval(feedbacks, settings);

      expect(result.blocked).toBe(false);
      expect(result.blockingFeedbacks).toEqual([]);
    });

    it("feedbackが空でも blocked: false を返す", () => {
      const settings = makeSettings({ blockOnUnresolved: false });

      const result = shouldBlockApproval([], settings);

      expect(result.blocked).toBe(false);
      expect(result.blockingFeedbacks).toEqual([]);
    });
  });

  describe("blockOnUnresolved: true, severityThreshold: 'critical'", () => {
    it("critical feedbackがある場合は blocked: true を返す", () => {
      const feedbacks = [
        makeFeedbackEntry({ githubIssue: 1, severity: "critical" }),
      ];
      const settings = makeSettings({ blockOnUnresolved: true, severityThreshold: "critical" });

      const result = shouldBlockApproval(feedbacks, settings);

      expect(result.blocked).toBe(true);
      expect(result.blockingFeedbacks).toHaveLength(1);
      expect(result.blockingFeedbacks[0].githubIssue).toBe(1);
    });

    it("high feedbackのみの場合は blocked: false を返す（閾値はcritical）", () => {
      const feedbacks = [
        makeFeedbackEntry({ githubIssue: 1, severity: "high" }),
      ];
      const settings = makeSettings({ blockOnUnresolved: true, severityThreshold: "critical" });

      const result = shouldBlockApproval(feedbacks, settings);

      expect(result.blocked).toBe(false);
      expect(result.blockingFeedbacks).toEqual([]);
    });

    it("medium feedbackのみの場合は blocked: false を返す（閾値はcritical）", () => {
      const feedbacks = [
        makeFeedbackEntry({ githubIssue: 1, severity: "medium" }),
      ];
      const settings = makeSettings({ blockOnUnresolved: true, severityThreshold: "critical" });

      const result = shouldBlockApproval(feedbacks, settings);

      expect(result.blocked).toBe(false);
      expect(result.blockingFeedbacks).toEqual([]);
    });

    it("low feedbackのみの場合は blocked: false を返す（閾値はcritical）", () => {
      const feedbacks = [
        makeFeedbackEntry({ githubIssue: 1, severity: "low" }),
      ];
      const settings = makeSettings({ blockOnUnresolved: true, severityThreshold: "critical" });

      const result = shouldBlockApproval(feedbacks, settings);

      expect(result.blocked).toBe(false);
      expect(result.blockingFeedbacks).toEqual([]);
    });
  });

  describe("blockOnUnresolved: true, severityThreshold: 'high'", () => {
    it("critical feedbackがある場合は blocked: true を返す", () => {
      const feedbacks = [
        makeFeedbackEntry({ githubIssue: 1, severity: "critical" }),
      ];
      const settings = makeSettings({ blockOnUnresolved: true, severityThreshold: "high" });

      const result = shouldBlockApproval(feedbacks, settings);

      expect(result.blocked).toBe(true);
      expect(result.blockingFeedbacks).toHaveLength(1);
    });

    it("high feedbackがある場合は blocked: true を返す", () => {
      const feedbacks = [
        makeFeedbackEntry({ githubIssue: 1, severity: "high" }),
      ];
      const settings = makeSettings({ blockOnUnresolved: true, severityThreshold: "high" });

      const result = shouldBlockApproval(feedbacks, settings);

      expect(result.blocked).toBe(true);
      expect(result.blockingFeedbacks).toHaveLength(1);
    });

    it("medium feedbackのみの場合は blocked: false を返す（閾値はhigh）", () => {
      const feedbacks = [
        makeFeedbackEntry({ githubIssue: 1, severity: "medium" }),
      ];
      const settings = makeSettings({ blockOnUnresolved: true, severityThreshold: "high" });

      const result = shouldBlockApproval(feedbacks, settings);

      expect(result.blocked).toBe(false);
      expect(result.blockingFeedbacks).toEqual([]);
    });

    it("low feedbackのみの場合は blocked: false を返す（閾値はhigh）", () => {
      const feedbacks = [
        makeFeedbackEntry({ githubIssue: 1, severity: "low" }),
      ];
      const settings = makeSettings({ blockOnUnresolved: true, severityThreshold: "high" });

      const result = shouldBlockApproval(feedbacks, settings);

      expect(result.blocked).toBe(false);
      expect(result.blockingFeedbacks).toEqual([]);
    });
  });

  describe("blockOnUnresolved: true, severityThreshold: 'medium'", () => {
    it("medium以上のfeedbackは全てブロック対象になる", () => {
      const feedbacks = [
        makeFeedbackEntry({ githubIssue: 1, severity: "medium" }),
        makeFeedbackEntry({ githubIssue: 2, severity: "high" }),
        makeFeedbackEntry({ githubIssue: 3, severity: "critical" }),
        makeFeedbackEntry({ githubIssue: 4, severity: "low" }),
      ];
      const settings = makeSettings({ blockOnUnresolved: true, severityThreshold: "medium" });

      const result = shouldBlockApproval(feedbacks, settings);

      expect(result.blocked).toBe(true);
      expect(result.blockingFeedbacks).toHaveLength(3);
      const blockedIssues = result.blockingFeedbacks.map(f => f.githubIssue);
      expect(blockedIssues).toContain(1);
      expect(blockedIssues).toContain(2);
      expect(blockedIssues).toContain(3);
      expect(blockedIssues).not.toContain(4);
    });
  });

  describe("blockOnUnresolved: true, severityThreshold: 'low'", () => {
    it("severityThreshold: 'low'は全てのfeedbackをブロック対象にする", () => {
      const feedbacks = [
        makeFeedbackEntry({ githubIssue: 1, severity: "low" }),
      ];
      const settings = makeSettings({ blockOnUnresolved: true, severityThreshold: "low" });

      const result = shouldBlockApproval(feedbacks, settings);

      expect(result.blocked).toBe(true);
      expect(result.blockingFeedbacks).toHaveLength(1);
    });
  });

  describe("severity未設定のfeedback", () => {
    it("severityがundefinedの場合は 'low' として扱う（閾値がhigh以上なら非ブロック）", () => {
      const feedbacks = [
        makeFeedbackEntry({ githubIssue: 1, severity: undefined }),
      ];
      const settings = makeSettings({ blockOnUnresolved: true, severityThreshold: "high" });

      const result = shouldBlockApproval(feedbacks, settings);

      expect(result.blocked).toBe(false);
      expect(result.blockingFeedbacks).toEqual([]);
    });

    it("severityがundefinedで閾値がlowの場合はブロックする", () => {
      const feedbacks = [
        makeFeedbackEntry({ githubIssue: 1, severity: undefined }),
      ];
      const settings = makeSettings({ blockOnUnresolved: true, severityThreshold: "low" });

      const result = shouldBlockApproval(feedbacks, settings);

      expect(result.blocked).toBe(true);
      expect(result.blockingFeedbacks).toHaveLength(1);
    });
  });

  describe("feedbacksが空の場合", () => {
    it("blockOnUnresolved: trueでもfeedbackが空なら blocked: false を返す", () => {
      const settings = makeSettings({ blockOnUnresolved: true, severityThreshold: "critical" });

      const result = shouldBlockApproval([], settings);

      expect(result.blocked).toBe(false);
      expect(result.blockingFeedbacks).toEqual([]);
    });
  });

  describe("blockingFeedbacksの内容", () => {
    it("ブロック対象のfeedbackエントリが正しく返される", () => {
      const criticalFeedback = makeFeedbackEntry({ githubIssue: 10, severity: "critical" });
      const highFeedback = makeFeedbackEntry({ githubIssue: 20, severity: "high" });
      const feedbacks = [criticalFeedback, highFeedback];
      const settings = makeSettings({ blockOnUnresolved: true, severityThreshold: "critical" });

      const result = shouldBlockApproval(feedbacks, settings);

      expect(result.blockingFeedbacks).toHaveLength(1);
      expect(result.blockingFeedbacks[0]).toEqual(criticalFeedback);
    });
  });
});
