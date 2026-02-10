import React from "react";

type GanttGroupProps = {
  label: string;
  y: number;
  width: number;
};

export function GanttGroup({ label, y, width }: GanttGroupProps) {
  return (
    <g>
      <rect x={0} y={y} width={width} height={28} fill="#f3f4f6" />
      <text
        x={8}
        y={y + 14}
        dominantBaseline="middle"
        fontSize="14"
        fontWeight="600"
        fill="#374151"
      >
        {label}
      </text>
    </g>
  );
}
