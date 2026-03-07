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
    <div className="space-y-6 py-2">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>

      {/* Overview zone: Project Health + Progress */}
      <div className="space-y-4">
        <ProjectHealth score={data.healthScore} />
        <ProgressSection
          requirements={data.requirements}
          specifications={data.specifications}
          issues={data.issues}
        />
      </div>

      {/* Action zone: Warnings */}
      {data.warnings.length > 0 && (
        <div className="mt-10">
          <WarningAlerts warnings={data.warnings} />
        </div>
      )}

      {/* Action zone: Critical Path */}
      {data.criticalPath !== null && (
        <div className="mt-10">
          <CriticalPathDisplay items={data.criticalPath} />
        </div>
      )}

      {/* Detail zone: Status Cards */}
      <div className="mt-10">
        <StatusCards
          requirements={data.requirements}
          specifications={data.specifications}
        />
      </div>
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
