"use client";

import React, { useState, useMemo } from "react";
import type { FeedbackEntry } from "@reqord/shared";
import { FeedbackFilters, type FeedbackFilterState } from "./feedback-filters";
import { FeedbackTable } from "./feedback-table";

export function FeedbackClientView({
  feedbacks,
  requirementTitles,
  specificationTitles,
}: {
  feedbacks: FeedbackEntry[];
  requirementTitles: Record<string, string>;
  specificationTitles: Record<string, string>;
}) {
  const [filters, setFilters] = useState<FeedbackFilterState>({});

  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter((fb) => {
      if (filters.type && fb.type !== filters.type) return false;
      if (filters.severity && fb.severity !== filters.severity) return false;
      if (filters.status && fb.status !== filters.status) return false;
      return true;
    });
  }, [feedbacks, filters]);

  return (
    <div className="space-y-4" data-testid="feedback-client-view">
      <FeedbackFilters activeFilters={filters} onFilterChange={setFilters} />
      <FeedbackTable
        feedbacks={filteredFeedbacks}
        requirementTitles={requirementTitles}
        specificationTitles={specificationTitles}
      />
    </div>
  );
}
