import React from "react";

type GanttHeaderProps = {
  timelineEnd: number;
  hourWidth: number;
  leftLabelWidth: number;
};

export function GanttHeader({
  timelineEnd,
  hourWidth,
  leftLabelWidth,
}: GanttHeaderProps) {
  const markers: number[] = [];
  for (let hour = 0; hour <= timelineEnd; hour += 4) {
    markers.push(hour);
  }

  return (
    <g>
      {markers.map((hour) => {
        const x = leftLabelWidth + hour * hourWidth;
        return (
          <g key={hour}>
            <line
              x1={x}
              y1={0}
              x2={x}
              y2={10}
              stroke="#d1d5db"
              strokeWidth={1}
            />
            <text
              x={x}
              y={25}
              textAnchor="middle"
              fontSize="12"
              fill="#6b7280"
            >
              {hour}h
            </text>
          </g>
        );
      })}
    </g>
  );
}
