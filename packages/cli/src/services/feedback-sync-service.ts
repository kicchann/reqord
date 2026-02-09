import type { FeedbackEntry, FeedbackType } from "@reqord/shared";
import * as githubClient from "./github-client.js";
import type { GitHubIssue } from "./github-client.js";
import * as feedbackRepo from "../repositories/feedback.js";

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
    const labels = buildLabelsFromFeedback(feedback);
    if (labels.length > 0) {
      await githubClient.addLabelsToIssue(feedback.githubIssue, labels);
      count++;
    }
  }
  return count;
}

export function parseGitHubIssue(issue: GitHubIssue): FeedbackEntry {
  const type = parseTypeFromLabels(issue.labels);
  const linkedTo = parseLinkedToFromLabels(issue.labels);

  return {
    githubIssue: issue.number,
    type,
    linkedTo,
    syncedAt: new Date().toISOString(),
    status: issue.state === "closed" ? "closed" : "open",
  };
}

export function buildLabelsFromFeedback(feedback: FeedbackEntry): string[] {
  const labels: string[] = [];
  if (feedback.type) {
    labels.push(feedback.type);
  }
  for (const reqId of feedback.linkedTo.requirements) {
    labels.push(`req:${reqId.replace("req-", "")}`);
  }
  for (const specId of feedback.linkedTo.specifications) {
    labels.push(`spec:${specId.replace("spec-", "")}`);
  }
  return labels;
}

function parseTypeFromLabels(labels: string[]): FeedbackType | undefined {
  const typeLabels: FeedbackType[] = [
    "bug",
    "improvement",
    "requirement-gap",
    "spec-mismatch",
    "security",
  ];
  return typeLabels.find((t) => labels.includes(t));
}

function parseLinkedToFromLabels(labels: string[]): {
  requirements: string[];
  createdRequirements: string[];
  specifications: string[];
} {
  const requirements = labels
    .filter((l) => /^req:\d{6}$/.test(l))
    .map((l) => `req-${l.slice(4)}`);
  const specifications = labels
    .filter((l) => /^spec:\d{6}$/.test(l))
    .map((l) => `spec-${l.slice(5)}`);
  return {
    requirements,
    createdRequirements: [],
    specifications,
  };
}
