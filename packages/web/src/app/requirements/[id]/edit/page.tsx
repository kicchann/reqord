import { notFound } from "next/navigation";
import {
  getAllRequirements,
  getRequirementById,
  getRequirementDescription,
} from "@/lib/data";
import { RequirementForm } from "@/components/requirement/requirement-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `Edit ${id} - Reqord` };
}

export default async function EditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [requirement, description, allRequirements] = await Promise.all([
    getRequirementById(id),
    getRequirementDescription(id),
    getAllRequirements(),
  ]);

  if (!requirement) {
    notFound();
  }

  return (
    <RequirementForm
      mode="edit"
      requirement={requirement}
      description={description}
      allRequirements={allRequirements}
    />
  );
}
