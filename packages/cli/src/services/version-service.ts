import { execSync } from "node:child_process";
import type { Requirement, Status } from "@reqord/shared";
import type { VersionHistoryEntry } from "@reqord/shared";

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
 * Parse semantic version string into components
 */
export function parseVersion(version: string): { major: number; minor: number; patch: number } {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Invalid version format: ${version}`);
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
}

/**
 * Format version components into semantic version string
 */
export function formatVersion(major: number, minor: number, patch: number): string {
  return `${major}.${minor}.${patch}`;
}

/**
 * Determine next version based on changes between requirements
 */
export function determineNextVersion(before: Requirement, after: Requirement): string {
  // If both are draft, no version increment
  if (before.status === "draft" && after.status === "draft") {
    return before.version;
  }

  const { major, minor, patch } = parseVersion(before.version);

  // Check for major changes (status change)
  if (before.status !== after.status) {
    return formatVersion(major + 1, 0, 0);
  }

  // Check for minor changes (title, format, dependencies, successCriteria)
  const hasMinorChange =
    hasChanged(before.title, after.title) ||
    hasChanged(before.format, after.format) ||
    hasChanged(before.dependencies, after.dependencies) ||
    hasChanged(before.successCriteria, after.successCriteria);

  if (hasMinorChange) {
    return formatVersion(major, minor + 1, 0);
  }

  // Check for patch changes (priority only)
  if (before.priority !== after.priority) {
    return formatVersion(major, minor, patch + 1);
  }

  // No changes detected
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
    return "";
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
    ["draft", ["pending_approval"]],
    ["pending_approval", ["approved", "draft"]],
    ["approved", ["implemented", "deprecated", "pending_approval"]],
    ["implemented", ["pending_approval"]],
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
 * Determine if requirement should revert to pending_approval due to content changes
 */
export function shouldRevertToPendingApproval(
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
