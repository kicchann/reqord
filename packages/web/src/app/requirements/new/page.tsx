import { getAllRequirements } from "@/lib/data";
import { RequirementForm } from "@/components/requirement/requirement-form";

export const metadata = {
  title: "New Requirement - Reqord",
};

export const dynamic = "force-dynamic";

export default async function NewPage() {
  const allRequirements = await getAllRequirements();

  return <RequirementForm mode="create" allRequirements={allRequirements} />;
}
