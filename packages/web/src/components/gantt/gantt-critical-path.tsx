import React from "react";
import type { GanttTask } from "@/lib/gantt-data";
import { GANTT_CONSTANTS } from "./gantt-constants";

type GanttCriticalPathProps = {
  task: GanttTask;
  y: number;
  hourWidth: number;
  leftLabelWidth: number;
};

export function GanttCriticalPath({
  task,
  y,
  hourWidth,
  leftLabelWidth,
}: GanttCriticalPathProps) {
  if (!task.isCriticalPath) {
    return null;
  }

  const x = task.startOffset * hourWidth + leftLabelWidth;
  const width = task.estimatedHours * hourWidth;

  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={GANTT_CONSTANTS.BAR_HEIGHT}
      rx={4}
      fill="none"
      stroke="#ef4444"
      strokeWidth={2}
      pointerEvents="none"
    />
  );
}
