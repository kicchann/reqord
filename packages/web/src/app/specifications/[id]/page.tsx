import { notFound } from "next/navigation";
import { getSpecificationById, getSpecificationDesign } from "@/lib/specification-data";
import { getRequirementById } from "@/lib/data";
import { SpecificationDetail } from "@/components/specification/specification-detail";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const specification = await getSpecificationById(id);
  if (!specification) {
    return { title: "Not Found - Reqord" };
  }
  return { title: `${specification.id} - Reqord` };
}

export default async function SpecificationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [specification, design] = await Promise.all([
    getSpecificationById(id),
    getSpecificationDesign(id),
  ]);

  if (!specification) {
    notFound();
  }

  const requirement = await getRequirementById(specification.requirementId);

  return (
    <SpecificationDetail
      specification={specification}
      design={design}
      requirementTitle={requirement?.title ?? null}
    />
  );
}
