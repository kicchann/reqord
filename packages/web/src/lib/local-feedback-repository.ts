import { FeedbackIndexSchema, type FeedbackEntry } from "@reqord/shared";
import type { FeedbackRepository } from "./feedback-repository";
import { readYAML, joinPath } from "./file-system";
import { getIssuesDir } from "./reqord-root";

export class LocalFeedbackRepository implements FeedbackRepository {
  async findAll(): Promise<FeedbackEntry[]> {
    const indexPath = joinPath(getIssuesDir(), "feedbacks.yaml");
    try {
      const raw = await readYAML<unknown>(indexPath);
      const parsed = FeedbackIndexSchema.safeParse(raw);
      if (!parsed.success) return [];
      return parsed.data.feedbacks;
    } catch {
      return [];
    }
  }

  async findUnresolvedByArtifactId(artifactId: string): Promise<FeedbackEntry[]> {
    const feedbacks = await this.findAll();
    return feedbacks.filter((f) => {
      const linked = [
        ...f.linkedTo.requirements,
        ...f.linkedTo.specifications,
      ];
      if (!linked.includes(artifactId)) return false;
      const resolved = [
        ...(f.linkedTo.resolved?.requirements ?? []),
        ...(f.linkedTo.resolved?.specifications ?? []),
      ];
      return !resolved.includes(artifactId);
    });
  }
}
