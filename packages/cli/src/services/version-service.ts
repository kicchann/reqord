import { execSync } from "node:child_process";
import type { Requirement, Specification, Status, VersionHistoryEntry } from "@reqord/shared";

/**
 * Compare two values for equality, using JSON serialization for objects
 */
function hasChanged(before: unknown, after: unknown): boolean {
  if (typeof before === "object" || typeof after === "object") {
    return JSON.stringify(before) !== JSON.stringify(after);
  }
  return before !== after;
}

/**
 * Parse X.Y version string into components
 */
export function parseVersion(version: string): { major: number; minor: number } {
  const match = version.match(/^(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Invalid version format: ${version}. Must be X.Y format`);
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
  };
}

/**
 * Format version components into X.Y version string
 */
export function formatVersion(major: number, minor: number): string {
  return `${major}.${minor}`;
}

/**
 * Apply explicit version bump to a version string
 */
export function applyVersionBump(
  currentVersion: string,
  bumpType: "major" | "patch",
): string {
  const { major, minor } = parseVersion(currentVersion);
  switch (bumpType) {
    case "major":
      return formatVersion(major + 1, 0);
    case "patch":
      return formatVersion(major, minor + 1);
  }
}

/**
 * Determine next version based on changes between requirements
 *
 * Version is always preserved here. Version changes are handled
 * explicitly by the reqord req draft command.
 */
export function determineNextVersion(before: Requirement, _after: Requirement): string {
  return before.version;
}

/**
 * Get current git commit hash
 */
export function getCurrentGitCommit(): string {
  try {
    const result = execSync("git rev-parse --short HEAD", {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return result.trim();
  } catch {
    return "unknown";
  }
}

/**
 * Create version history entry
 */
export function createHistoryEntry(
  requirement: Requirement,
  options?: { gitCommit?: string; summary?: string },
): VersionHistoryEntry {
  const now = new Date().toISOString();
  const gitCommit = options?.gitCommit ?? getCurrentGitCommit();
  const summary = options?.summary ?? "Requirement updated";

  const entry: VersionHistoryEntry = {
    version: requirement.version,
    status: requirement.status,
    gitCommit,
    changedAt: now,
    summary,
  };

  // Add approval metadata if status is approved
  if (requirement.status === "approved") {
    entry.approvedAt = now;
    entry.approvedBy = [];
  }

  return entry;
}

/**
 * Get allowed state transitions map
 */
export function getStateTransitions(): Map<Status, Status[]> {
  return new Map([
    ["draft", ["approved"]],
    ["approved", ["implemented", "draft"]],
    ["implemented", ["draft"]],
    ["deprecated", []],
  ]);
}

/**
 * Check if status transition is valid
 */
export function isValidTransition(from: Status, to: Status): boolean {
  const transitions = getStateTransitions();
  const allowedTransitions = transitions.get(from) ?? [];
  return allowedTransitions.includes(to);
}

/**
 * Determine if requirement should revert to draft due to content changes
 */
export function shouldRevertToDraft(
  currentStatus: Status,
  hasContentChanges: boolean,
): boolean {
  return (currentStatus === "approved" || currentStatus === "implemented") && hasContentChanges;
}

/**
 * Generate change summary from requirement differences
 */
export function generateChangeSummary(before: Requirement, after: Requirement): string {
  const changes: string[] = [];

  if (hasChanged(before.status, after.status)) {
    changes.push(`Status changed from ${before.status} to ${after.status}`);
  }

  if (hasChanged(before.title, after.title)) {
    changes.push("Title updated");
  }

  if (hasChanged(before.format, after.format)) {
    changes.push("Format updated");
  }

  if (hasChanged(before.dependencies, after.dependencies)) {
    changes.push("Dependencies updated");
  }

  if (hasChanged(before.successCriteria, after.successCriteria)) {
    changes.push("Success criteria updated");
  }

  if (hasChanged(before.priority, after.priority)) {
    changes.push("Priority updated");
  }

  return changes.length > 0 ? changes.join(", ") : "Requirement updated";
}

/**
 * Count supplementary file differences between two Specification snapshots
 */
function countSupplementaryDiff(before: Specification, after: Specification): { added: number; removed: number } {
  const beforeSet = new Set(before.files.supplementary);
  const afterSet = new Set(after.files.supplementary);

  let added = 0;
  for (const file of afterSet) {
    if (!beforeSet.has(file)) {
      added++;
    }
  }

  let removed = 0;
  for (const file of beforeSet) {
    if (!afterSet.has(file)) {
      removed++;
    }
  }

  return { added, removed };
}

/**
 * Determine next version based on changes between specifications
 *
 * Version is always preserved here. Version changes are handled
 * explicitly by the reqord spec draft command.
 */
export function determineNextVersionForSpec(before: Specification, _after: Specification): string {
  return before.version;
}

/**
 * Generate change summary from specification differences
 *
 * Note: Status changes are NOT included here to prevent duplicate messages,
 * as they are already handled by the caller (specification-service.ts).
 */
export function generateSpecChangeSummary(before: Specification, after: Specification): string {
  const changes: string[] = [];

  const { added, removed } = countSupplementaryDiff(before, after);

  if (added > 0) {
    changes.push(`${added} supplementary file(s) added`);
  }

  if (removed > 0) {
    changes.push(`${removed} supplementary file(s) removed`);
  }

  if (before.files.design !== after.files.design) {
    changes.push("Design file path updated");
  }

  if (hasChanged(before.flags, after.flags)) {
    changes.push("Flags updated");
  }

  return changes.length > 0 ? changes.join(", ") : "Specification updated";
}
