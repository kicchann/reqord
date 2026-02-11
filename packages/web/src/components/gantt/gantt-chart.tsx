"use client";

import React, { useState } from "react";
import type { GanttData, GanttTask } from "@/lib/gantt-data";
import { GANTT_CONSTANTS } from "./gantt-constants";
import { GanttBar } from "./gantt-bar";
import { GanttHeader } from "./gantt-header";
import { GanttGroup } from "./gantt-group";
import { GanttCriticalPath } from "./gantt-critical-path";
import { GanttLegend } from "./gantt-legend";

type GanttChartProps = {
  data: GanttData;
};

export function GanttChart({ data }: GanttChartProps) {
  const [, setHoveredTask] = useState<GanttTask | null>(null);

  const { LEFT_LABEL_WIDTH, HOUR_WIDTH, HEADER_HEIGHT, ROW_HEIGHT, GROUP_HEADER_HEIGHT, BAR_HEIGHT } = GANTT_CONSTANTS;

  // Calculate SVG dimensions
  let totalRows = 0;
  for (const group of data.groups) {
    totalRows += 1; // group header
    totalRows += group.tasks.length;
  }

  const svgWidth = LEFT_LABEL_WIDTH + data.timelineEnd * HOUR_WIDTH + 40;
  const svgHeight = HEADER_HEIGHT + totalRows * ROW_HEIGHT + 20;

  const handleBarClick = (task: GanttTask) => {
    window.open(task.issueUrl, "_blank", "noopener,noreferrer");
  };

  // Precompute Y positions to avoid mutating variables during render
  const groupLayouts: { groupY: number; taskYs: { taskY: number; barY: number }[] }[] = [];
  let offsetY = HEADER_HEIGHT;
  for (const group of data.groups) {
    const groupY = offsetY;
    offsetY += GROUP_HEADER_HEIGHT;
    const taskYs: { taskY: number; barY: number }[] = [];
    for (let i = 0; i < group.tasks.length; i++) {
      taskYs.push({ taskY: offsetY + (ROW_HEIGHT - BAR_HEIGHT) / 2, barY: offsetY });
      offsetY += ROW_HEIGHT;
    }
    groupLayouts.push({ groupY, taskYs });
  }

  return (
    <div>
      <svg width={svgWidth} height={svgHeight}>
        <GanttHeader
          timelineEnd={data.timelineEnd}
          hourWidth={HOUR_WIDTH}
          leftLabelWidth={LEFT_LABEL_WIDTH}
        />
        {data.groups.map((group, gi) => {
          const layout = groupLayouts[gi];

          return (
            <g key={group.priority}>
              <GanttGroup label={group.label} y={layout.groupY} width={svgWidth} />
              {group.tasks.map((task, ti) => (
                <g key={task.id}>
                  <GanttBar
                    task={task}
                    y={layout.taskYs[ti].taskY}
                    hourWidth={HOUR_WIDTH}
                    leftLabelWidth={LEFT_LABEL_WIDTH}
                    onHover={setHoveredTask}
                    onClick={handleBarClick}
                  />
                  <GanttCriticalPath
                    task={task}
                    y={layout.taskYs[ti].barY + (ROW_HEIGHT - BAR_HEIGHT) / 2}
                    hourWidth={HOUR_WIDTH}
                    leftLabelWidth={LEFT_LABEL_WIDTH}
                  />
                </g>
              ))}
            </g>
          );
        })}
      </svg>
      <GanttLegend />
    </div>
  );
}
