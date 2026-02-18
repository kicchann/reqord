"use client";

import { useSyncExternalStore } from "react";
import { Tabs } from "@/components/ui/tabs";
import { MarkdownRenderer } from "./markdown-renderer";

type RequirementTabsProps = {
  successCriteria: string[];
  description: string | null;
};

const TABS = [
  { id: "criteria", label: "Success Criteria" },
  { id: "description", label: "Description" },
];

const TAB_IDS = new Set(TABS.map((tab) => tab.id));
const DEFAULT_TAB = "criteria";

function getHashTab(): string {
  const hash = window.location.hash.slice(1);
  return TAB_IDS.has(hash) ? hash : DEFAULT_TAB;
}

const subscribeHash = (callback: () => void) => {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
};

export function RequirementTabs({
  successCriteria,
  description,
}: RequirementTabsProps) {
  const activeTab = useSyncExternalStore(subscribeHash, getHashTab, () => DEFAULT_TAB);

  const handleTabChange = (tabId: string) => {
    window.location.hash = tabId;
  };

  return (
    <div className="space-y-4">
      <Tabs tabs={TABS} activeTab={activeTab} onTabChange={handleTabChange} />
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        {activeTab === "criteria" && (
          successCriteria.length > 0 ? (
            <ol className="list-decimal list-inside space-y-1 text-sm">
              {successCriteria.map((criterion, i) => (
                <li key={i}>{criterion}</li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-gray-500">No success criteria defined</p>
          )
        )}
        {activeTab === "description" && (
          description ? (
            <MarkdownRenderer content={description} />
          ) : (
            <p className="text-sm text-gray-500">No description</p>
          )
        )}
      </div>
    </div>
  );
}
