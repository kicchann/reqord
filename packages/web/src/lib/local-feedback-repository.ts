import { FeedbackIndexSchema, type FeedbackEntry } from "@reqord/shared";
import type { FeedbackRepository } from "./feedback-repository";
import { readYAML, joinPath } from "./file-system";
import { getFeedbackDir } from "./reqord-root";

export class LocalFeedbackRepository implements FeedbackRepository {
  async findAll(): Promise<FeedbackEntry[]> {
    const indexPath = joinPath(getFeedbackDir(), "index.yaml");
    try {
      const raw = await readYAML<unknown>(indexPath);
      const parsed = FeedbackIndexSchema.safeParse(raw);
      if (!parsed.success) return [];
      return parsed.data.feedbacks;
    } catch {
      return [];
    }
  }
}
