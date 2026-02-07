import { getAllRequirements } from "@/lib/data";
import { GraphLoader } from "@/components/graph/graph-loader";

export const metadata = {
  title: "Dependency Graph - Reqord",
};

export const dynamic = "force-dynamic";

export default async function GraphPage() {
  const requirements = await getAllRequirements();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Dependency Graph</h1>
      <GraphLoader requirements={requirements} />
    </div>
  );
}
