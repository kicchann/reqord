import chalk from "chalk";

export const STATUS_COLORS: Record<string, (s: string) => string> = {
  draft: chalk.blue,
  pending_approval: chalk.yellow,
  approved: chalk.green,
  implemented: chalk.cyan,
  deprecated: chalk.gray,
};

export const PRIORITY_COLORS: Record<string, (s: string) => string> = {
  high: chalk.red,
  medium: chalk.yellow,
  low: chalk.gray,
};

export const FEEDBACK_STATUS_COLORS: Record<string, (s: string) => string> = {
  open: chalk.green,
  closed: chalk.gray,
};

export function identityColor(s: string): string {
  return s;
}

export function parseIssueNumber(value: string): number {
  const n = parseInt(value, 10);
  if (isNaN(n)) {
    throw new Error("Invalid issue number");
  }
  return n;
}
