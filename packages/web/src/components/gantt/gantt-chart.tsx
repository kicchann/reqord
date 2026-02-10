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
    window.open(task.issueUrl, "_blank");
  };

  let currentY = HEADER_HEIGHT;

  return (
    <div>
      <svg width={svgWidth} height={svgHeight}>
        <GanttHeader
          timelineEnd={data.timelineEnd}
          hourWidth={HOUR_WIDTH}
          leftLabelWidth={LEFT_LABEL_WIDTH}
        />
        {data.groups.map((group) => {
          const groupY = currentY;
          currentY += GROUP_HEADER_HEIGHT;

          const taskElements = group.tasks.map((task) => {
            const taskY = currentY + (ROW_HEIGHT - BAR_HEIGHT) / 2;
            const barY = currentY;
            currentY += ROW_HEIGHT;

            return (
              <g key={task.id}>
                <GanttBar
                  task={task}
                  y={taskY}
                  hourWidth={HOUR_WIDTH}
                  leftLabelWidth={LEFT_LABEL_WIDTH}
                  onHover={setHoveredTask}
                  onClick={handleBarClick}
                />
                <GanttCriticalPath
                  task={task}
                  y={barY + (ROW_HEIGHT - BAR_HEIGHT) / 2}
                  hourWidth={HOUR_WIDTH}
                  leftLabelWidth={LEFT_LABEL_WIDTH}
                />
              </g>
            );
          });

          return (
            <g key={group.priority}>
              <GanttGroup label={group.label} y={groupY} width={svgWidth} />
              {taskElements}
            </g>
          );
        })}
      </svg>
      <GanttLegend />
    </div>
  );
}
