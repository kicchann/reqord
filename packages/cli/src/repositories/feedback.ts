import type { FeedbackIndex, FeedbackEntry } from "@reqord/shared";
import { FeedbackIndexSchema, ISSUES_DIR } from "@reqord/shared";
import * as fs from "./file-system.js";

const INDEX_FILENAME = "feedbacks.yaml";

function getFeedbackDir(cwd: string): string {
  return fs.getReqordDir(cwd, ISSUES_DIR);
}

function getIndexPath(cwd: string): string {
  return fs.joinPath(getFeedbackDir(cwd), INDEX_FILENAME);
}

export async function loadIndex(cwd: string): Promise<FeedbackIndex> {
  const indexPath = getIndexPath(cwd);
  if (!(await fs.exists(indexPath))) {
    return { feedbacks: [] };
  }
  const raw = await fs.readYAML<unknown>(indexPath);
  const result = FeedbackIndexSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Invalid feedback index: ${result.error.message}`);
  }
  return result.data;
}

export async function saveIndex(cwd: string, index: FeedbackIndex): Promise<void> {
  const feedbackDir = getFeedbackDir(cwd);
  await fs.mkdirp(feedbackDir);
  const indexPath = getIndexPath(cwd);
  const validated = FeedbackIndexSchema.parse(index);
  await fs.writeYAML(indexPath, validated);
}

export async function findFeedbackByIssue(
  cwd: string,
  issueNumber: number,
): Promise<FeedbackEntry | undefined> {
  const index = await loadIndex(cwd);
  return index.feedbacks.find((f) => f.githubIssue === issueNumber);
}

export async function upsertFeedback(
  cwd: string,
  feedback: FeedbackEntry,
): Promise<void> {
  const index = await loadIndex(cwd);
  const existingIndex = index.feedbacks.findIndex(
    (f) => f.githubIssue === feedback.githubIssue,
  );
  if (existingIndex >= 0) {
    index.feedbacks[existingIndex] = feedback;
  } else {
    index.feedbacks.push(feedback);
  }
  await saveIndex(cwd, index);
}
