import { Suspense } from "react";
import { getAllFeedbacks } from "@/lib/feedback-data";
import { getAllRequirements } from "@/lib/data";
import { getAllSpecifications } from "@/lib/specification-data";
import { FeedbackClientView } from "@/components/feedback/feedback-client-view";
import Loading from "./loading";

export const metadata = {
  title: "Feedback - Reqord",
};

export const dynamic = "force-dynamic";

async function FeedbackContent() {
  const [feedbacks, requirements, specifications] = await Promise.all([
    getAllFeedbacks(),
    getAllRequirements(),
    getAllSpecifications(),
  ]);

  const reqTitleMap: Record<string, string> = Object.fromEntries(
    requirements.map((r) => [r.id, r.title]),
  );
  const specTitleMap: Record<string, string> = Object.fromEntries(
    specifications.map((s) => [s.id, s.title]),
  );

  return (
    <FeedbackClientView
      feedbacks={feedbacks}
      requirementTitles={reqTitleMap}
      specificationTitles={specTitleMap}
    />
  );
}

export default function FeedbackPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Feedback</h1>
      </div>
      <Suspense fallback={<Loading />}>
        <FeedbackContent />
      </Suspense>
    </div>
  );
}
