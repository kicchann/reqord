import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ProjectSettings } from "@reqord/shared";

// Mock dependencies BEFORE imports
vi.mock("../repositories/git.js", () => ({
  createBranch: vi.fn(),
  checkout: vi.fn(),
  add: vi.fn(),
  commit: vi.fn(),
  push: vi.fn(),
  getCurrentBranch: vi.fn(),
}));

vi.mock("../repositories/github.js", () => ({
  createPullRequest: vi.fn(),
}));

import * as gitRepo from "../repositories/git.js";
import * as githubRepo from "../repositories/github.js";
import {
  executeStatusTransition,
  type StatusTransitionTarget,
  type StatusTransitionCallbacks,
} from "./status-transition-service.js";

function makeSettings(overrides: Partial<ProjectSettings["statusTransitionPr"]> = {}): ProjectSettings {
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
      ...overrides,
    },
    branchNaming: {
      toApprovedPrefix: "reqord",
      toImplementedPrefix: "reqord",
      toDraftPrefix: "reqord",
    },
    feedbackValidation: {
      blockOnUnresolved: false,
      severityThreshold: "critical",
    },
    autoRevert: {
      onContentChange: "always",
    },
    consistencyCheck: {
      specNotImplementedLevel: "warning",
    },
  };
}

function makeTarget(overrides: Partial<StatusTransitionTarget> = {}): StatusTransitionTarget {
  return {
    id: "req-000001",
    version: "1.0",
    files: [".reqord/requirements/req-000001.yaml"],
    ...overrides,
  };
}

function makeCallbacks(overrides: Partial<StatusTransitionCallbacks> = {}): StatusTransitionCallbacks {
  return {
    updateStatus: vi.fn().mockResolvedValue("1.1"),
    buildBranchName: vi.fn().mockReturnValue("reqord/req-000001-implement"),
    buildPrTitle: vi.fn().mockReturnValue("[Reqord] Implement req-000001"),
    buildPrBody: vi.fn().mockReturnValue("## Implement\nreq-000001"),
    buildCommitMessage: vi.fn().mockReturnValue("chore(reqord): mark req-000001 as implemented"),
    ...overrides,
  };
}

describe("executeStatusTransition", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(gitRepo.getCurrentBranch).mockResolvedValue("main");
    vi.mocked(gitRepo.createBranch).mockResolvedValue(undefined);
    vi.mocked(gitRepo.checkout).mockResolvedValue(undefined);
    vi.mocked(gitRepo.add).mockResolvedValue(undefined);
    vi.mocked(gitRepo.commit).mockResolvedValue(undefined);
    vi.mocked(gitRepo.push).mockResolvedValue(undefined);
    vi.mocked(githubRepo.createPullRequest).mockResolvedValue({
      number: 10,
      url: "https://github.com/owner/repo/pull/10",
    });
  });

  describe("usePr=true（PR経由フロー）", () => {
    it("ブランチ作成→ステータス更新→コミット→プッシュ→PR作成の順で実行される", async () => {
      const target = makeTarget();
      const callbacks = makeCallbacks();
      const settings = makeSettings();
      const callOrder: string[] = [];

      vi.mocked(gitRepo.createBranch).mockImplementation(async () => { callOrder.push("createBranch"); });
      vi.mocked(gitRepo.checkout).mockImplementation(async () => { callOrder.push("checkout"); });
      vi.mocked(callbacks.updateStatus).mockImplementation(async () => {
        callOrder.push("updateStatus");
        return "1.1";
      });
      vi.mocked(gitRepo.add).mockImplementation(async () => { callOrder.push("add"); });
      vi.mocked(gitRepo.commit).mockImplementation(async () => { callOrder.push("commit"); });
      vi.mocked(gitRepo.push).mockImplementation(async () => { callOrder.push("push"); });
      vi.mocked(githubRepo.createPullRequest).mockImplementation(async () => {
        callOrder.push("createPR");
        return { number: 10, url: "https://github.com/owner/repo/pull/10" };
      });

      await executeStatusTransition("/test/cwd", target, callbacks, true, settings);

      expect(callOrder.indexOf("createBranch")).toBeLessThan(callOrder.indexOf("updateStatus"));
      expect(callOrder.indexOf("checkout")).toBeLessThan(callOrder.indexOf("updateStatus"));
      expect(callOrder.indexOf("updateStatus")).toBeLessThan(callOrder.indexOf("add"));
      expect(callOrder.indexOf("add")).toBeLessThan(callOrder.indexOf("commit"));
      expect(callOrder.indexOf("commit")).toBeLessThan(callOrder.indexOf("push"));
      expect(callOrder.indexOf("push")).toBeLessThan(callOrder.indexOf("createPR"));
    });

    it("PR情報（branchName, prNumber, prUrl）を返す", async () => {
      const target = makeTarget();
      const callbacks = makeCallbacks();
      const settings = makeSettings();

      const result = await executeStatusTransition("/test/cwd", target, callbacks, true, settings);

      expect(result.branchName).toBe("reqord/req-000001-implement");
      expect(result.prNumber).toBe(10);
      expect(result.prUrl).toBe("https://github.com/owner/repo/pull/10");
    });

    it("元のブランチに復帰する", async () => {
      vi.mocked(gitRepo.getCurrentBranch).mockResolvedValue("feature-branch");
      const target = makeTarget();
      const callbacks = makeCallbacks();
      const settings = makeSettings();

      await executeStatusTransition("/test/cwd", target, callbacks, true, settings);

      const checkoutCalls = vi.mocked(gitRepo.checkout).mock.calls;
      expect(checkoutCalls[checkoutCalls.length - 1][1]).toBe("feature-branch");
    });
  });

  describe("usePr=false（直接コミットフロー）", () => {
    it("ブランチ作成・プッシュ・PR作成をスキップして直接コミットする", async () => {
      const target = makeTarget();
      const callbacks = makeCallbacks();
      const settings = makeSettings();

      const result = await executeStatusTransition("/test/cwd", target, callbacks, false, settings);

      // Status update is called
      expect(callbacks.updateStatus).toHaveBeenCalledWith("/test/cwd");

      // git add and commit are called
      expect(gitRepo.add).toHaveBeenCalledWith("/test/cwd", target.files);
      expect(gitRepo.commit).toHaveBeenCalled();

      // branch creation, push, PR creation are skipped
      expect(gitRepo.createBranch).not.toHaveBeenCalled();
      expect(gitRepo.push).not.toHaveBeenCalled();
      expect(githubRepo.createPullRequest).not.toHaveBeenCalled();

      // No PR info in result
      expect(result.branchName).toBeUndefined();
      expect(result.prNumber).toBeUndefined();
      expect(result.prUrl).toBeUndefined();
    });

    it("直接コミットの場合、getCurrentBranch・checkout は呼ばれない", async () => {
      const target = makeTarget();
      const callbacks = makeCallbacks();
      const settings = makeSettings();

      await executeStatusTransition("/test/cwd", target, callbacks, false, settings);

      expect(gitRepo.getCurrentBranch).not.toHaveBeenCalled();
      expect(gitRepo.checkout).not.toHaveBeenCalled();
    });
  });
});
