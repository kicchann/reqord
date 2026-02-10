"use client";

import React, { useState } from "react";
import { Tabs } from "@/components/ui/tabs";
import { TabDesign } from "./tab-design";
import { TabResearch } from "./tab-research";

type SpecTabsProps = {
  design: string | null;
  research: string | null;
};

const TABS = [
  { id: "design", label: "Design" },
  { id: "research", label: "Research" },
];

function getInitialTab(): string {
  if (typeof window !== "undefined") {
    const hash = window.location.hash.slice(1);
    if (hash === "design" || hash === "research") {
      return hash;
    }
  }
  return "design";
}

export function SpecTabs({ design, research }: SpecTabsProps) {
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
      </div>
    </div>
  );
}
