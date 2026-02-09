import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export interface GitHubIssueLabel {
  name: string;
}

export interface GitHubIssueRaw {
  number: number;
  title: string;
  state: string;
  labels: GitHubIssueLabel[];
  createdAt: string;
  body?: string;
}

export interface GitHubIssue {
  number: number;
  title: string;
  state: "open" | "closed";
  labels: string[];
  createdAt: string;
  body?: string;
}

function normalizeIssue(raw: GitHubIssueRaw): GitHubIssue {
  return {
    number: raw.number,
    title: raw.title,
    state: raw.state === "CLOSED" ? "closed" : "open",
    labels: raw.labels.map((l) => l.name),
    createdAt: raw.createdAt,
    body: raw.body,
  };
}

export async function listFeedbackIssues(): Promise<GitHubIssue[]> {
  const { stdout } = await execAsync(
    "gh issue list --label feedback --json number,title,state,labels,createdAt --limit 1000",
  );
  const raw: GitHubIssueRaw[] = JSON.parse(stdout);
  return raw.map(normalizeIssue);
}

export async function getIssue(issueNumber: number): Promise<GitHubIssue> {
  const { stdout } = await execAsync(
    `gh issue view ${issueNumber} --json number,title,state,labels,createdAt,body`,
  );
  const raw: GitHubIssueRaw = JSON.parse(stdout);
  return normalizeIssue(raw);
}

const SAFE_LABEL_PATTERN = /^[a-zA-Z0-9_:\-./]+$/;

export async function addLabelsToIssue(
  issueNumber: number,
  labels: string[],
): Promise<void> {
  for (const label of labels) {
    if (!SAFE_LABEL_PATTERN.test(label)) {
      throw new Error(`Invalid label format: ${label}`);
    }
  }
  const labelStr = labels.join(",");
  await execAsync(
    `gh issue edit ${issueNumber} --add-label "${labelStr}"`,
  );
}

export async function closeIssue(
  issueNumber: number,
  comment?: string,
): Promise<void> {
  let cmd = `gh issue close ${issueNumber}`;
  if (comment) {
    const escaped = comment.replace(/"/g, '\\"');
    cmd += ` --comment "${escaped}"`;
  }
  await execAsync(cmd);
}
