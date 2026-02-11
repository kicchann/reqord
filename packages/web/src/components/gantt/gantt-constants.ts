export const GANTT_CONSTANTS = {
  ROW_HEIGHT: 36,
  BAR_HEIGHT: 24,
  LEFT_LABEL_WIDTH: 200,
  HEADER_HEIGHT: 40,
  HOUR_WIDTH: 60,
  GROUP_HEADER_HEIGHT: 28,
} as const;

export const STATE_COLORS: Record<string, string> = {
  closed: "#22c55e", // green
  in_progress: "#3b82f6", // blue
  blocked: "#ef4444", // red
  open: "#9ca3af", // gray (pending)
};
