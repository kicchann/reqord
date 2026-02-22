import type { FeedbackEntry } from "@reqord/shared";
import type { FeedbackRepository } from "./feedback-repository";
import { LocalFeedbackRepository } from "./local-feedback-repository";

let instance: FeedbackRepository | null = null;

function getFeedbackRepository(): FeedbackRepository {
  if (instance) {
    return instance;
  }

  const dataSource = process.env.REQORD_DATA_SOURCE ?? "local";

  switch (dataSource) {
    case "local":
      instance = new LocalFeedbackRepository();
      break;
    default:
      throw new Error(`Unknown REQORD_DATA_SOURCE: ${dataSource}`);
  }

  return instance;
}

export async function getAllFeedbacks(): Promise<FeedbackEntry[]> {
  const repo = getFeedbackRepository();
  return repo.findAll();
}

export async function findUnresolvedByArtifactId(artifactId: string): Promise<FeedbackEntry[]> {
  const repo = getFeedbackRepository();
  return repo.findUnresolvedByArtifactId(artifactId);
}
