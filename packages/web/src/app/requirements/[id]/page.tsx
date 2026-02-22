import { notFound } from "next/navigation";
import { getRequirementById, getRequirementDescription } from "@/lib/data";
import { getSpecificationsByRequirementId } from "@/lib/specification-data";
import { findUnresolvedByArtifactId } from "@/lib/feedback-data";
import { RequirementDetail } from "@/components/requirement/requirement-detail";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const requirement = await getRequirementById(id);
  if (!requirement) {
    return { title: "Not Found - Reqord" };
  }
  return { title: `${requirement.id}: ${requirement.title} - Reqord` };
}

export default async function RequirementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [requirement, description, specifications, feedbacks] = await Promise.all([
    getRequirementById(id),
    getRequirementDescription(id),
    getSpecificationsByRequirementId(id),
    findUnresolvedByArtifactId(id),
  ]);

  if (!requirement) {
    notFound();
  }

  return (
    <RequirementDetail
      requirement={requirement}
      description={description}
      specifications={specifications}
      feedbacks={feedbacks}
    />
  );
}
