import { getAllRequirements } from "@/lib/data";
import { getAllSpecifications } from "@/lib/specification-data";
import { GraphPageClient } from "@/components/graph/graph-page-client";

export const metadata = {
  title: "Dependency Graph - Reqord",
};

export const dynamic = "force-dynamic";

export default async function GraphPage() {
  const [requirements, specifications] = await Promise.all([
    getAllRequirements(),
    getAllSpecifications(),
  ]);

  const specCountMap: Record<string, number> = {};
  for (const spec of specifications) {
    specCountMap[spec.requirementId] = (specCountMap[spec.requirementId] ?? 0) + 1;
  }

  return (
    <GraphPageClient
      requirements={requirements}
      specifications={specifications}
      specCountMap={specCountMap}
    />
  );
}
