import { Suspense } from "react";
import { getAllSpecifications } from "@/lib/specification-data";
import { getAllRequirements } from "@/lib/data";
import { SpecificationTable } from "@/components/specification/specification-table";
import Loading from "./loading";

export const metadata = {
  title: "Specifications - Reqord",
};

export const dynamic = "force-dynamic";

async function SpecificationList() {
  const [specifications, requirements] = await Promise.all([
    getAllSpecifications(),
    getAllRequirements(),
  ]);

  const requirementMap = Object.fromEntries(
    requirements.map((r) => [r.id, r.title]),
  );

  return (
    <SpecificationTable
      specifications={specifications}
      requirementTitleMap={requirementMap}
    />
  );
}

export default function SpecificationsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Specifications</h1>
      </div>
      <Suspense fallback={<Loading />}>
        <SpecificationList />
      </Suspense>
    </div>
  );
}
