"use client";

import React, { useCallback } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import type { Requirement, Specification } from "@reqord/shared";
import { DrillDownBreadcrumb } from "./drilldown-breadcrumb";

const DependencyGraph = dynamic(
  () => import("./dependency-graph").then((mod) => mod.DependencyGraph),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse h-96 rounded-lg bg-gray-200" />
    ),
  }
);

const DrillDownGraph = dynamic(
  () => import("./drilldown-graph").then((mod) => mod.DrillDownGraph),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse h-96 rounded-lg bg-gray-200" />
    ),
  }
);

type GraphPageClientProps = {
  requirements: Requirement[];
  specifications: Specification[];
  specCountMap: Record<string, number>;
};

export function GraphPageClient({
  requirements,
  specifications,
  specCountMap,
}: GraphPageClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedReqId = searchParams.get("req");

  const handleRequirementClick = useCallback(
    (reqId: string) => {
      router.push(`/graph?req=${reqId}`);
    },
    [router],
  );

  const handleBackToOverview = useCallback(() => {
    router.push("/graph");
  }, [router]);

  if (selectedReqId) {
    const requirement = requirements.find((r) => r.id === selectedReqId);
    if (!requirement) {
      // Invalid req ID → fallback to overview
      return (
        <div>
          <h1 className="mb-4 text-2xl font-bold">Dependency Graph</h1>
          <DependencyGraph
            requirements={requirements}
            specCountMap={specCountMap}
            onRequirementClick={handleRequirementClick}
          />
        </div>
      );
    }

    const relatedSpecs = specifications.filter(
      (s) => s.requirementId === selectedReqId,
    );

    return (
      <div>
        <DrillDownBreadcrumb
          requirementTitle={requirement.title}
          onBack={handleBackToOverview}
        />
        <DrillDownGraph requirement={requirement} specifications={relatedSpecs} />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Dependency Graph</h1>
      <DependencyGraph
        requirements={requirements}
        specCountMap={specCountMap}
        onRequirementClick={handleRequirementClick}
      />
    </div>
  );
}
