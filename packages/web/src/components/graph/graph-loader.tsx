"use client";

import dynamic from "next/dynamic";
import type { Requirement } from "@reqord/shared";

const DependencyGraph = dynamic(
  () =>
    import("./dependency-graph").then((mod) => mod.DependencyGraph),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse h-96 rounded-lg bg-gray-200" />
    ),
  },
);

export function GraphLoader({ requirements }: { requirements: Requirement[] }) {
  return <DependencyGraph requirements={requirements} />;
}
