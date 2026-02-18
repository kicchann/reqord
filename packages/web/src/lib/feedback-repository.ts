import type { FeedbackEntry } from "@reqord/shared";

export interface FeedbackRepository {
  findAll(): Promise<FeedbackEntry[]>;
}
