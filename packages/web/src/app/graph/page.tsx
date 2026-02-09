import { getAllRequirements } from "@/lib/data";
import { getAllSpecifications } from "@/lib/specification-data";
import { GraphLoader } from "@/components/graph/graph-loader";

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
    <div>
      <h1 className="mb-6 text-2xl font-bold">Dependency Graph</h1>
      <GraphLoader requirements={requirements} specCountMap={specCountMap} />
    </div>
  );
}
