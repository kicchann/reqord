import type { FeedbackEntry } from "@reqord/shared";
import type { FeedbackRepository } from "./feedback-repository";
import { LocalFeedbackRepository } from "./local-feedback-repository";

let instance: FeedbackRepository | null = null;

function getFeedbackRepository(): FeedbackRepository {
  if (!instance) {
    instance = new LocalFeedbackRepository();
  }
  return instance;
}

export async function getAllFeedbacks(): Promise<FeedbackEntry[]> {
  const repo = getFeedbackRepository();
  return repo.findAll();
}
