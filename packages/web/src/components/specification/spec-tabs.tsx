"use client";

import React, { useState } from "react";
import type { ImplementationIssue, VersionHistoryEntry } from "@reqord/shared";
import { Tabs } from "@/components/ui/tabs";
import { TabDesign } from "./tab-design";
import { TabResearch } from "./tab-research";
import { TabCoverage } from "./tab-coverage";
import { TabIssues } from "./tab-issues";
import { TabHistory } from "./tab-history";

type SpecTabsProps = {
  design: string | null;
  research: string | null;
  successCriteria: string[] | null;
  issues: ImplementationIssue[] | null;
  versionHistory: VersionHistoryEntry[];
};

const TABS = [
  { id: "design", label: "Design" },
  { id: "research", label: "Research" },
  { id: "coverage", label: "Coverage" },
  { id: "issues", label: "Issues" },
  { id: "history", label: "History" },
];

const TAB_IDS = new Set(TABS.map((tab) => tab.id));
const DEFAULT_TAB = "design";

function getInitialTab(): string {
  if (typeof window === "undefined") {
    return DEFAULT_TAB;
  }
  const hash = window.location.hash.slice(1);
  return TAB_IDS.has(hash) ? hash : DEFAULT_TAB;
}

export function SpecTabs({
  design,
  research,
  successCriteria,
  issues,
  versionHistory,
}: SpecTabsProps) {
  const [activeTab, setActiveTab] = useState(getInitialTab);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    // Update URL hash
    if (typeof window !== "undefined") {
      window.location.hash = tabId;
    }
  };

  return (
    <div className="space-y-4">
      <Tabs tabs={TABS} activeTab={activeTab} onTabChange={handleTabChange} />
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        {activeTab === "design" && <TabDesign content={design} />}
        {activeTab === "research" && <TabResearch content={research} />}
        {activeTab === "coverage" && <TabCoverage successCriteria={successCriteria} />}
        {activeTab === "issues" && <TabIssues issues={issues} />}
        {activeTab === "history" && <TabHistory versionHistory={versionHistory} />}
      </div>
    </div>
  );
}
