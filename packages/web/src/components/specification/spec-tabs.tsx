"use client";

import React, { useSyncExternalStore } from "react";
import type { VersionHistoryEntry } from "@reqord/shared";
import { Tabs } from "@/components/ui/tabs";
import { TabDesign } from "./tab-design";
import { TabResearch } from "./tab-research";
import { TabCoverage } from "./tab-coverage";
import { TabIssues, type IssueItem } from "./tab-issues";
import { TabHistory } from "./tab-history";

type SpecTabsProps = {
  design: string | null;
  research: string | null;
  successCriteria: string[] | null;
  issues: IssueItem[] | null;
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

function getHashTab(): string {
  const hash = window.location.hash.slice(1);
  return TAB_IDS.has(hash) ? hash : DEFAULT_TAB;
}

const subscribeHash = (callback: () => void) => {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
};

export function SpecTabs({
  design,
  research,
  successCriteria,
  issues,
  versionHistory,
}: SpecTabsProps) {
  const activeTab = useSyncExternalStore(subscribeHash, getHashTab, () => DEFAULT_TAB);

  const handleTabChange = (tabId: string) => {
    window.location.hash = tabId;
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
