import { notFound } from "next/navigation";
import { getSpecificationById } from "@/lib/specification-data";
import { getRequirementById } from "@/lib/data";
import { loadSpecFile } from "@/lib/specification-file";
import { SpecDetail } from "@/components/specification/spec-detail";

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
  const [specification, design, research] = await Promise.all([
    getSpecificationById(id),
    loadSpecFile(id, "design.md"),
    loadSpecFile(id, "research.md"),
  ]);

  if (!specification) {
    notFound();
  }

  const requirement = await getRequirementById(specification.requirementId);

  return (
    <SpecDetail
      specification={specification}
      design={design}
      research={research}
      requirementTitle={requirement?.title ?? null}
    />
  );
}
