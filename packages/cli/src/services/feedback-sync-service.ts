import type { FeedbackEntry } from "@reqord/shared";
import * as githubClient from "./github-client.js";
import type { GitHubIssue } from "./github-client.js";
import * as feedbackRepo from "../repositories/feedback.js";
import { parseReqordComment, upsertReqordComment } from "./reqord-comment.js";

export async function syncFromGitHub(cwd: string): Promise<number> {
  const issues = await githubClient.listFeedbackIssues();
  let count = 0;
  for (const issue of issues) {
    const feedback = parseGitHubIssue(issue);
    await feedbackRepo.upsertFeedback(cwd, feedback);
    count++;
  }
  return count;
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
    },
    syncedAt: new Date().toISOString(),
    status: issue.state === "closed" ? "closed" : "open",
  };
}
