import { Suspense } from "react";
import Link from "next/link";
import { getAllRequirements } from "@/lib/data";
import { RequirementTable } from "@/components/requirement/requirement-table";
import Loading from "./loading";

export const metadata = {
  title: "Requirements - Reqord",
};

export const dynamic = "force-dynamic";

async function RequirementList() {
  const requirements = await getAllRequirements();
  return <RequirementTable requirements={requirements} />;
}

export default function RequirementsPage() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Requirements</h1>
        <Link
          href="/requirements/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Requirement
        </Link>
      </div>
      <Suspense fallback={<Loading />}>
        <RequirementList />
      </Suspense>
    </div>
  );
}
