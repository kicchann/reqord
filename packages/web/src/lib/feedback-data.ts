import type { FeedbackEntry } from "@reqord/shared";
import { LocalFeedbackRepository } from "./local-feedback-repository";

let instance: LocalFeedbackRepository | null = null;

function getFeedbackRepository(): LocalFeedbackRepository {
  if (!instance) {
    instance = new LocalFeedbackRepository();
  }
  return instance;
}

export async function getAllFeedbacks(): Promise<FeedbackEntry[]> {
  const repo = getFeedbackRepository();
  return repo.findAll();
}
