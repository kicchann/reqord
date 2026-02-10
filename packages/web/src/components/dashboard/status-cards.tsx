import React from "react";
import { StatusCard } from "./status-card";
import type { CategorySummary } from "@/lib/dashboard-data";

type StatusCardsProps = {
  requirements: CategorySummary;
  specifications: CategorySummary;
};

export function StatusCards({
  requirements,
  specifications,
}: StatusCardsProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <StatusCard
        title="Requirements"
        total={requirements.total}
        breakdown={requirements.breakdown}
      />
      <StatusCard
        title="Specifications"
        total={specifications.total}
        breakdown={specifications.breakdown}
      />
    </div>
  );
}
