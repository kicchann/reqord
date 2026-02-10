import { Suspense } from "react";
import { getDashboardData } from "@/lib/dashboard-data";
import { ProjectHealth } from "@/components/dashboard/project-health";
import { ProgressSection } from "@/components/dashboard/progress-section";
import { StatusCards } from "@/components/dashboard/status-cards";
import { WarningAlerts } from "@/components/dashboard/warning-alerts";
import { CriticalPathDisplay } from "@/components/dashboard/critical-path-display";
import Loading from "./loading";

async function DashboardContent() {
  const data = await getDashboardData();

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>

      {/* Project Health */}
      <ProjectHealth score={data.healthScore} />

      {/* Progress Section */}
      <ProgressSection
        requirements={data.requirements}
        specifications={data.specifications}
        issues={data.issues}
      />

      {/* Status Cards */}
      <StatusCards
        requirements={data.requirements}
        specifications={data.specifications}
      />

      {/* Warnings */}
      {data.warnings.length > 0 && <WarningAlerts warnings={data.warnings} />}

      {/* Critical Path */}
      {data.criticalPath !== null && (
        <CriticalPathDisplay items={data.criticalPath} />
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<Loading />}>
      <DashboardContent />
    </Suspense>
  );
}
