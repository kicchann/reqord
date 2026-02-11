import type { FeedbackEntry } from "@reqord/shared";
import * as githubClient from "./github-client.js";
import type { GitHubIssue } from "./github-client.js";
import * as feedbackRepo from "../repositories/feedback.js";
import { parseReqordComment, upsertReqordComment } from "./reqord-comment.js";

// v2.0.0: Bulk load/merge/save (1 loadIndex + 1 saveIndex instead of N)
export async function syncFromGitHub(cwd: string): Promise<number> {
  const issues = await githubClient.listFeedbackIssues();
  const index = await feedbackRepo.loadIndex(cwd);
  let updatedCount = 0;

  for (const issue of issues) {
    const fromGitHub = parseGitHubIssue(issue);
    const existingIdx = index.feedbacks.findIndex(
      (f) => f.githubIssue === issue.number,
    );

    if (existingIdx >= 0) {
      index.feedbacks[existingIdx] = mergeFeedback(index.feedbacks[existingIdx], fromGitHub);
    } else {
      index.feedbacks.push(fromGitHub);
    }
    updatedCount++;
  }

  await feedbackRepo.saveIndex(cwd, index);
  return updatedCount;
}

// v2.0.0: Merge update - preserve manual metadata from existing
export function mergeFeedback(
  existing: FeedbackEntry,
  fromGitHub: FeedbackEntry,
): FeedbackEntry {
  return {
    githubIssue: existing.githubIssue,
    type: existing.type ?? fromGitHub.type,
    severity: existing.severity ?? fromGitHub.severity,
    linkedTo: existing.linkedTo,
    syncedAt: fromGitHub.syncedAt,
    status: fromGitHub.status,
  };
}

export async function syncToGitHub(cwd: string): Promise<number> {
  const index = await feedbackRepo.loadIndex(cwd);
  let count = 0;
  for (const feedback of index.feedbacks) {
    const issue = await githubClient.getIssue(feedback.githubIssue);
    const metadata = {
      type: feedback.type,
      severity: feedback.severity,
      linkedTo: feedback.linkedTo,
    };
    const newBody = upsertReqordComment(issue.body ?? "", metadata);
    if (newBody !== issue.body) {
      await githubClient.updateIssueBody(feedback.githubIssue, newBody);
      count++;
    }
  }
  return count;
}

export function parseGitHubIssue(issue: GitHubIssue): FeedbackEntry {
  const comment = parseReqordComment(issue.body ?? "");

  return {
    githubIssue: issue.number,
    type: comment?.type,
    severity: comment?.severity,
    linkedTo: comment?.linkedTo ?? {
      requirements: [],
      createdRequirements: [],
      specifications: [],
      createdSpecifications: [],
    },
    syncedAt: new Date().toISOString(),
    status: issue.state === "closed" ? "closed" : "open",
  };
}
