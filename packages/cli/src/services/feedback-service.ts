import type { FeedbackEntry, FeedbackType, FeedbackSeverity, FeedbackIndex } from "@reqord/shared";
import * as feedbackRepo from "../repositories/feedback.js";
import * as reqRepo from "../repositories/requirement.js";
import * as specRepo from "../repositories/specification.js";
import * as githubClient from "./github-client.js";
import type { GitHubIssue } from "./github-client.js";
import { createRequirement } from "./requirement-service.js";

export interface ListFeedbacksOptions {
  state?: "open" | "closed" | "all";
  type?: FeedbackType;
}

export interface ShowFeedbackResult {
  feedback: FeedbackEntry;
  issue: GitHubIssue;
}

export interface LinkToRequirementOptions {
  issueNumber: number;
  requirementId: string;
  type?: FeedbackType;
  severity?: FeedbackSeverity;
}

export interface LinkWithNewRequirementOptions {
  issueNumber: number;
  type?: FeedbackType;
  severity?: FeedbackSeverity;
}

export interface LinkToSpecificationOptions {
  issueNumber: number;
  specificationId: string;
  type?: FeedbackType;
  severity?: FeedbackSeverity;
}

export async function listFeedbacks(
  cwd: string,
  options: ListFeedbacksOptions = {},
): Promise<FeedbackEntry[]> {
  const index = await feedbackRepo.loadIndex(cwd);
  let feedbacks = index.feedbacks;

  if (options.state && options.state !== "all") {
    feedbacks = feedbacks.filter((f) => f.status === options.state);
  }
  if (options.type) {
    feedbacks = feedbacks.filter((f) => f.type === options.type);
  }

  return feedbacks;
}

export async function showFeedback(
  cwd: string,
  issueNumber: number,
): Promise<ShowFeedbackResult> {
  const index = await feedbackRepo.loadIndex(cwd);
  const feedback = index.feedbacks.find((f) => f.githubIssue === issueNumber);

  if (!feedback) {
    throw new Error(
      `Feedback for issue #${issueNumber} not found in index.json. Run 'reqord feedback sync' first.`,
    );
  }

  const issue = await githubClient.getIssue(issueNumber);
  return { feedback, issue };
}

export async function linkToRequirement(
  cwd: string,
  options: LinkToRequirementOptions,
): Promise<void> {
  // Verify requirement exists
  const requirement = await reqRepo.findById(cwd, options.requirementId);
  if (!requirement) {
    throw new Error(`Requirement ${options.requirementId} not found`);
  }

  // Update index.json
  const index = await feedbackRepo.loadIndex(cwd);
  let feedback = index.feedbacks.find((f) => f.githubIssue === options.issueNumber);

  if (!feedback) {
    feedback = createEmptyFeedbackEntry(options.issueNumber);
    index.feedbacks.push(feedback);
  }

  if (options.type) feedback.type = options.type;
  if (options.severity) feedback.severity = options.severity;

  if (!feedback.linkedTo.requirements.includes(options.requirementId)) {
    feedback.linkedTo.requirements.push(options.requirementId);
  }

  await feedbackRepo.saveIndex(cwd, index);

  // Add feedback-review flag to Requirement
  const flagExists = requirement.flags.some(
    (f) => f.type === "feedback-review" && f.relatedIssues.includes(options.issueNumber),
  );

  if (!flagExists) {
    requirement.flags.push({
      type: "feedback-review",
      reason: `Feedback from issue #${options.issueNumber}`,
      createdAt: new Date().toISOString(),
      relatedIssues: [options.issueNumber],
      severity: options.severity ?? "medium",
    });
    await reqRepo.save(cwd, requirement);
  }

  // Add labels to GitHub Issue
  const labels = [`req:${options.requirementId.replace("req-", "")}`];
  if (options.type) labels.push(options.type);
  await githubClient.addLabelsToIssue(options.issueNumber, labels);
}

export async function linkWithNewRequirement(
  cwd: string,
  options: LinkWithNewRequirementOptions,
): Promise<string> {
  // Get GitHub Issue for title
  const issue = await githubClient.getIssue(options.issueNumber);

  // Create new Requirement
  const result = await createRequirement(cwd, {
    title: `[Feedback #${options.issueNumber}] ${issue.title}`,
    priority: "medium",
  });

  const newId = result.requirement.id;

  // Add origin info
  const requirement = result.requirement;
  requirement.origin = { feedbackIssue: options.issueNumber };
  await reqRepo.save(cwd, requirement);

  // Update index.json
  const index = await feedbackRepo.loadIndex(cwd);
  let feedback = index.feedbacks.find((f) => f.githubIssue === options.issueNumber);

  if (!feedback) {
    feedback = createEmptyFeedbackEntry(options.issueNumber);
    index.feedbacks.push(feedback);
  }

  if (options.type) feedback.type = options.type;
  if (options.severity) feedback.severity = options.severity;
  feedback.linkedTo.createdRequirements.push(newId);

  await feedbackRepo.saveIndex(cwd, index);

  // Add labels to GitHub Issue
  const labels = [`req:${newId.replace("req-", "")}`];
  if (options.type) labels.push(options.type);
  await githubClient.addLabelsToIssue(options.issueNumber, labels);

  return newId;
}

export async function linkToSpecification(
  cwd: string,
  options: LinkToSpecificationOptions,
): Promise<void> {
  // Verify specification exists
  const specification = await specRepo.findById(cwd, options.specificationId);
  if (!specification) {
    throw new Error(`Specification ${options.specificationId} not found`);
  }

  // Update index.json
  const index = await feedbackRepo.loadIndex(cwd);
  let feedback = index.feedbacks.find((f) => f.githubIssue === options.issueNumber);

  if (!feedback) {
    feedback = createEmptyFeedbackEntry(options.issueNumber);
    index.feedbacks.push(feedback);
  }

  if (options.type) feedback.type = options.type;
  if (options.severity) feedback.severity = options.severity;

  if (!feedback.linkedTo.specifications.includes(options.specificationId)) {
    feedback.linkedTo.specifications.push(options.specificationId);
  }

  await feedbackRepo.saveIndex(cwd, index);

  // Add feedback-review flag to Specification
  const flagExists = specification.flags.some(
    (f) => f.type === "feedback-review" && f.relatedIssues.includes(options.issueNumber),
  );

  if (!flagExists) {
    specification.flags.push({
      type: "feedback-review",
      reason: `Feedback from issue #${options.issueNumber}`,
      createdAt: new Date().toISOString(),
      relatedIssues: [options.issueNumber],
      severity: options.severity ?? "medium",
    });
    await specRepo.save(cwd, specification);
  }

  // Add labels to GitHub Issue
  const labels = [`spec:${options.specificationId.replace("spec-", "")}`];
  if (options.type) labels.push(options.type);
  await githubClient.addLabelsToIssue(options.issueNumber, labels);
}

export async function closeFeedback(
  cwd: string,
  issueNumber: number,
): Promise<void> {
  const index = await feedbackRepo.loadIndex(cwd);
  const feedback = index.feedbacks.find((f) => f.githubIssue === issueNumber);

  if (!feedback) {
    throw new Error(`Feedback for issue #${issueNumber} not found`);
  }

  feedback.status = "closed";
  await feedbackRepo.saveIndex(cwd, index);

  const summary = buildImpactSummary(feedback);
  await githubClient.closeIssue(issueNumber, summary);
}

function createEmptyFeedbackEntry(issueNumber: number): FeedbackEntry {
  return {
    githubIssue: issueNumber,
    linkedTo: {
      requirements: [],
      createdRequirements: [],
      specifications: [],
    },
    syncedAt: new Date().toISOString(),
    status: "open",
  };
}

function buildImpactSummary(feedback: FeedbackEntry): string {
  const lines = ["**Feedback closed - Impact summary:**", ""];

  if (feedback.linkedTo.requirements.length > 0) {
    lines.push(`- Linked Requirements: ${feedback.linkedTo.requirements.join(", ")}`);
  }
  if (feedback.linkedTo.createdRequirements.length > 0) {
    lines.push(`- Created Requirements: ${feedback.linkedTo.createdRequirements.join(", ")}`);
  }
  if (feedback.linkedTo.specifications.length > 0) {
    lines.push(`- Linked Specifications: ${feedback.linkedTo.specifications.join(", ")}`);
  }

  lines.push("", "Flags remain on linked requirements. Use `reqord req unflag` to remove when resolved.");

  return lines.join("\n");
}
