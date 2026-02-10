import React from "react";
import type { GanttTask } from "@/lib/gantt-data";
import { GANTT_CONSTANTS, STATE_COLORS } from "./gantt-constants";

type GanttBarProps = {
  task: GanttTask;
  y: number;
  hourWidth: number;
  leftLabelWidth: number;
  onHover?: (task: GanttTask | null) => void;
  onClick?: (task: GanttTask) => void;
};

export function GanttBar({
  task,
  y,
  hourWidth,
  leftLabelWidth,
  onHover,
  onClick,
}: GanttBarProps) {
  const x = task.startOffset * hourWidth + leftLabelWidth;
  const width = task.estimatedHours * hourWidth;
  const fill = STATE_COLORS[task.state] || STATE_COLORS.open;

  const handleMouseEnter = () => {
    onHover?.(task);
  };

  const handleMouseLeave = () => {
    onHover?.(null);
  };

  const handleClick = () => {
    onClick?.(task);
  };

  return (
    <g
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      <rect
        x={x}
        y={y}
        width={width}
        height={GANTT_CONSTANTS.BAR_HEIGHT}
        rx={4}
        fill={fill}
      />
      <text
        x={x + 8}
        y={y + GANTT_CONSTANTS.BAR_HEIGHT / 2}
        dominantBaseline="middle"
        fontSize="14"
        fill="white"
        fontWeight="500"
      >
        {task.title}
      </text>
    </g>
  );
}
