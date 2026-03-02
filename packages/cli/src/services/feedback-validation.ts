import type { FeedbackEntry, FeedbackSeverity } from "@reqord/shared";
import type { ProjectSettings } from "@reqord/shared";

const SEVERITY_ORDER: FeedbackSeverity[] = ["low", "medium", "high", "critical"];

export function shouldBlockApproval(
  feedbacks: FeedbackEntry[],
  settings: ProjectSettings,
): { blocked: boolean; blockingFeedbacks: FeedbackEntry[] } {
  if (!settings.feedbackValidation.blockOnUnresolved) {
    return { blocked: false, blockingFeedbacks: [] };
  }

  const thresholdIndex = SEVERITY_ORDER.indexOf(settings.feedbackValidation.severityThreshold);
  const blockingFeedbacks = feedbacks.filter((f) => {
    const severityIndex = SEVERITY_ORDER.indexOf(f.severity ?? "low");
    return severityIndex >= thresholdIndex;
  });

  return {
    blocked: blockingFeedbacks.length > 0,
    blockingFeedbacks,
  };
}
