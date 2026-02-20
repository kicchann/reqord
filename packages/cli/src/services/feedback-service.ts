import type { FeedbackEntry, FeedbackType, FeedbackSeverity } from "@reqord/shared";
import * as feedbackRepo from "../repositories/feedback.js";
import * as reqRepo from "../repositories/requirement.js";
import * as specRepo from "../repositories/specification.js";
import * as githubClient from "./github-client.js";
import type { GitHubIssue } from "./github-client.js";
import { createRequirement } from "./requirement-service.js";
import { upsertReqordComment } from "./reqord-comment.js";

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
      `Feedback for issue #${issueNumber} not found in index.yaml. Run 'reqord feedback sync' first.`,
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
  const requirement = await reqRepo.findByIdOrThrow(cwd, options.requirementId);

  // Update index.yaml
  const index = await feedbackRepo.loadIndex(cwd);
  const feedback = getOrCreateFeedback(index, options.issueNumber, options);

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

  // Update GitHub Issue body with HTML comment
  const issue = await githubClient.getIssue(options.issueNumber);
  const currentBody = issue.body ?? "";
  const newBody = upsertReqordComment(currentBody, {
    type: feedback.type,
    severity: feedback.severity,
    linkedTo: feedback.linkedTo,
  });
  if (newBody !== currentBody) {
    await githubClient.updateIssueBody(options.issueNumber, newBody);
  }
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

  // Update index.yaml
  const index = await feedbackRepo.loadIndex(cwd);
  const feedback = getOrCreateFeedback(index, options.issueNumber, options);
  feedback.linkedTo.createdRequirements.push(newId);

  await feedbackRepo.saveIndex(cwd, index);

  // Update GitHub Issue body with HTML comment
  const currentBody = issue.body ?? "";
  const newBody = upsertReqordComment(currentBody, {
    type: feedback.type,
    severity: feedback.severity,
    linkedTo: feedback.linkedTo,
  });
  if (newBody !== currentBody) {
    await githubClient.updateIssueBody(options.issueNumber, newBody);
  }

  return newId;
}

export async function linkToSpecification(
  cwd: string,
  options: LinkToSpecificationOptions,
): Promise<void> {
  // Verify specification exists
  const specification = await specRepo.findByIdOrThrow(cwd, options.specificationId);

  // Update index.yaml
  const index = await feedbackRepo.loadIndex(cwd);
  const feedback = getOrCreateFeedback(index, options.issueNumber, options);

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

  // Update GitHub Issue body with HTML comment
  const issue = await githubClient.getIssue(options.issueNumber);
  const currentBody = issue.body ?? "";
  const newBody = upsertReqordComment(currentBody, {
    type: feedback.type,
    severity: feedback.severity,
    linkedTo: feedback.linkedTo,
  });
  if (newBody !== currentBody) {
    await githubClient.updateIssueBody(options.issueNumber, newBody);
  }
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
      createdSpecifications: [],
    },
    syncedAt: new Date().toISOString(),
    status: "open",
  };
}

function getOrCreateFeedback(
  index: { feedbacks: FeedbackEntry[] },
  issueNumber: number,
  options: { type?: FeedbackType; severity?: FeedbackSeverity },
): FeedbackEntry {
  let feedback = index.feedbacks.find((f) => f.githubIssue === issueNumber);
  if (!feedback) {
    feedback = createEmptyFeedbackEntry(issueNumber);
    index.feedbacks.push(feedback);
  }
  if (options.type) feedback.type = options.type;
  if (options.severity) feedback.severity = options.severity;
  return feedback;
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
  if (feedback.linkedTo.createdSpecifications.length > 0) {
    lines.push(`- Created Specifications: ${feedback.linkedTo.createdSpecifications.join(", ")}`);
  }

  lines.push("", "Flags remain on linked artifacts. Use `reqord feedback resolve` to remove when resolved.");

  return lines.join("\n");
}

// v3.0.0: Body generation conforming to ISSUE_TEMPLATE/05-feedback.yml (SC-17)
export interface CreateFeedbackOptions {
  title: string;
  description: string;
  type?: FeedbackType;
  severity?: FeedbackSeverity;
  relatedReq?: string;
  relatedSpec?: string;
}

function feedbackTypeToLabel(type: FeedbackType): string {
  const map: Record<FeedbackType, string> = {
    "requirement-gap": "requirement-gap (missing requirement)",
    "spec-mismatch": "spec-mismatch (spec vs implementation mismatch)",
    "bug": "implementation-bug (implementation bug)",
    "improvement": "improvement (improvement proposal)",
    "security": "security (security issue)",
  };
  return map[type] ?? type;
}

function severityToLabel(severity: FeedbackSeverity): string {
  const map: Record<FeedbackSeverity, string> = {
    critical: "critical (affects all users)",
    high: "high (affects many users)",
    medium: "medium (affects some users)",
    low: "low (minor issue)",
  };
  return map[severity] ?? severity;
}

function buildFeedbackIssueBody(options: CreateFeedbackOptions): string {
  const lines: string[] = [];

  lines.push("### What happened? / What did you notice?");
  lines.push("");
  lines.push(options.description);
  lines.push("");

  lines.push("### Feedback type");
  lines.push("");
  const typeLabel = options.type
    ? feedbackTypeToLabel(options.type)
    : "unknown/unclassified";
  lines.push(typeLabel);
  lines.push("");

  if (options.relatedReq) {
    lines.push("### Related requirement (Requirement)");
    lines.push("");
    lines.push(options.relatedReq);
    lines.push("");
  }

  if (options.relatedSpec) {
    lines.push("### Related specification (Specification)");
    lines.push("");
    lines.push(options.relatedSpec);
    lines.push("");
  }

  if (options.severity) {
    lines.push("### Severity");
    lines.push("");
    lines.push(severityToLabel(options.severity));
    lines.push("");
  }

  return lines.join("\n");
}

export async function createFeedbackIssue(
  cwd: string,
  options: CreateFeedbackOptions,
): Promise<number> {
  const body = buildFeedbackIssueBody(options);

  const title = options.title.startsWith("[Feedback]")
    ? options.title
    : `[Feedback] ${options.title}`;

  const result = await githubClient.createIssue({
    title,
    body,
    labels: ["feedback", "reqord-generated", ...(options.type ? [options.type] : [])],
  });

  const index = await feedbackRepo.loadIndex(cwd);
  const newEntry: FeedbackEntry = {
    githubIssue: result.number,
    type: options.type,
    severity: options.severity,
    linkedTo: {
      requirements: [],
      createdRequirements: [],
      specifications: [],
      createdSpecifications: [],
    },
    syncedAt: new Date().toISOString(),
    status: "open",
  };
  index.feedbacks.push(newEntry);
  await feedbackRepo.saveIndex(cwd, index);

  return result.number;
}

// v2.0.0: Resolve feedback flag (SC-11)
export interface ResolveFeedbackOptions {
  issueNumber: number;
  artifactId: string; // req-NNNNNN or spec-NNNNNN
}

export async function resolveFeedback(
  cwd: string,
  options: ResolveFeedbackOptions,
): Promise<void> {
  const index = await feedbackRepo.loadIndex(cwd);
  const feedback = index.feedbacks.find(
    (f) => f.githubIssue === options.issueNumber,
  );

  if (!feedback) {
    throw new Error(
      `Feedback for issue #${options.issueNumber} not found in index.yaml`,
    );
  }

  const isReq = options.artifactId.startsWith("req-");
  const isSpec = options.artifactId.startsWith("spec-");

  if (!isReq && !isSpec) {
    throw new Error(
      `Invalid artifact ID: ${options.artifactId}. Must start with "req-" or "spec-"`,
    );
  }

  // Verify artifact is linked (check both linked and created lists)
  const linkedList = isReq
    ? feedback.linkedTo.requirements
    : feedback.linkedTo.specifications;
  const createdList = isReq
    ? feedback.linkedTo.createdRequirements
    : feedback.linkedTo.createdSpecifications;

  if (!linkedList.includes(options.artifactId) && !createdList.includes(options.artifactId)) {
    throw new Error(
      `${options.artifactId} is not linked to feedback #${options.issueNumber}`,
    );
  }

  // Step 1: Remove feedback-review flag from artifact (safe side first)
  if (isReq) {
    const requirement = await reqRepo.findByIdOrThrow(cwd, options.artifactId);
    requirement.flags = requirement.flags.filter(
      (f) =>
        !(
          f.type === "feedback-review" &&
          f.relatedIssues.includes(options.issueNumber)
        ),
    );
    await reqRepo.save(cwd, requirement);
  } else {
    const specification = await specRepo.findByIdOrThrow(cwd, options.artifactId);
    specification.flags = specification.flags.filter(
      (f) =>
        !(
          f.type === "feedback-review" &&
          f.relatedIssues.includes(options.issueNumber)
        ),
    );
    await specRepo.save(cwd, specification);
  }

  // Step 2: Add to linkedTo.resolved
  if (!feedback.linkedTo.resolved) {
    feedback.linkedTo.resolved = { requirements: [], specifications: [] };
  }
  const resolvedList = isReq
    ? feedback.linkedTo.resolved.requirements
    : feedback.linkedTo.resolved.specifications;
  if (!resolvedList.includes(options.artifactId)) {
    resolvedList.push(options.artifactId);
  }

  await feedbackRepo.saveIndex(cwd, index);
}

// v3.0.0: Remaining flag warning on close (SC-16)
export interface RemainingFlag {
  artifactId: string;
  issueNumber: number;
  severity: string;
}

export async function checkRemainingFlags(
  cwd: string,
  feedback: FeedbackEntry,
): Promise<RemainingFlag[]> {
  const remaining: RemainingFlag[] = [];

  for (const reqId of feedback.linkedTo.requirements) {
    let requirement;
    try {
      requirement = await reqRepo.findByIdOrThrow(cwd, reqId);
    } catch {
      continue;
    }

    const flags = requirement.flags.filter(
      (f) =>
        f.type === "feedback-review" &&
        f.relatedIssues.includes(feedback.githubIssue),
    );
    for (const flag of flags) {
      remaining.push({
        artifactId: reqId,
        issueNumber: feedback.githubIssue,
        severity: flag.type === "feedback-review" ? flag.severity : "medium",
      });
    }
  }

  for (const specId of feedback.linkedTo.specifications) {
    let specification;
    try {
      specification = await specRepo.findByIdOrThrow(cwd, specId);
    } catch {
      continue;
    }

    const flags = specification.flags.filter(
      (f) =>
        f.type === "feedback-review" &&
        f.relatedIssues.includes(feedback.githubIssue),
    );
    for (const flag of flags) {
      remaining.push({
        artifactId: specId,
        issueNumber: feedback.githubIssue,
        severity: flag.type === "feedback-review" ? flag.severity : "medium",
      });
    }
  }

  return remaining;
}

// v3.0.0: Feedback link removal (SC-14, SC-15)
export interface UnlinkFromRequirementOptions {
  issueNumber: number;
  requirementId: string;
}

export interface UnlinkFromSpecificationOptions {
  issueNumber: number;
  specificationId: string;
}

export async function unlinkFromRequirement(
  cwd: string,
  options: UnlinkFromRequirementOptions,
): Promise<void> {
  const index = await feedbackRepo.loadIndex(cwd);
  const feedback = index.feedbacks.find((f) => f.githubIssue === options.issueNumber);

  if (!feedback) {
    throw new Error(`Feedback for issue #${options.issueNumber} not found in index.yaml`);
  }

  // Remove from linkedTo.requirements
  const reqIndex = feedback.linkedTo.requirements.indexOf(options.requirementId);
  if (reqIndex === -1) {
    throw new Error(
      `${options.requirementId} is not linked to feedback #${options.issueNumber}`,
    );
  }
  feedback.linkedTo.requirements.splice(reqIndex, 1);

  // Remove feedback-review flag from Requirement
  const requirement = await reqRepo.findByIdOrThrow(cwd, options.requirementId);
  requirement.flags = requirement.flags.filter(
    (f) =>
      !(
        f.type === "feedback-review" &&
        f.relatedIssues.includes(options.issueNumber)
      ),
  );
  await reqRepo.save(cwd, requirement);

  await feedbackRepo.saveIndex(cwd, index);

  // Update HTML comment in GitHub Issue body
  const issue = await githubClient.getIssue(options.issueNumber);
  const newBody = upsertReqordComment(issue.body ?? "", {
    type: feedback.type,
    severity: feedback.severity,
    linkedTo: feedback.linkedTo,
  });
  await githubClient.updateIssueBody(options.issueNumber, newBody);
}

export async function unlinkFromSpecification(
  cwd: string,
  options: UnlinkFromSpecificationOptions,
): Promise<void> {
  const index = await feedbackRepo.loadIndex(cwd);
  const feedback = index.feedbacks.find((f) => f.githubIssue === options.issueNumber);

  if (!feedback) {
    throw new Error(`Feedback for issue #${options.issueNumber} not found in index.yaml`);
  }

  // Remove from linkedTo.specifications
  const specIndex = feedback.linkedTo.specifications.indexOf(options.specificationId);
  if (specIndex === -1) {
    throw new Error(
      `${options.specificationId} is not linked to feedback #${options.issueNumber}`,
    );
  }
  feedback.linkedTo.specifications.splice(specIndex, 1);

  // Remove feedback-review flag from Specification
  const specification = await specRepo.findByIdOrThrow(cwd, options.specificationId);
  specification.flags = specification.flags.filter(
    (f) =>
      !(
        f.type === "feedback-review" &&
        f.relatedIssues.includes(options.issueNumber)
      ),
  );
  await specRepo.save(cwd, specification);

  await feedbackRepo.saveIndex(cwd, index);

  // Update HTML comment in GitHub Issue body
  const issue = await githubClient.getIssue(options.issueNumber);
  const newBody = upsertReqordComment(issue.body ?? "", {
    type: feedback.type,
    severity: feedback.severity,
    linkedTo: feedback.linkedTo,
  });
  await githubClient.updateIssueBody(options.issueNumber, newBody);
}
