import type { Status } from "../schemas/common.js";

export const STATUS_TRANSITIONS: Record<Status, Status[]> = {
  draft: ["approved", "deprecated"],
  approved: ["implemented", "deprecated"],
  implemented: ["deprecated"],
  deprecated: [],
};

export function isValidTransition(from: Status, to: Status): boolean {
  return STATUS_TRANSITIONS[from].includes(to);
}

export function getAvailableTransitions(current: Status): Status[] {
  return STATUS_TRANSITIONS[current];
}
