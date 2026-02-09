import { exec, spawn } from "node:child_process";
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
    "gh issue list --label feedback --json number,title,state,labels,createdAt,body --limit 1000",
    { maxBuffer: 10 * 1024 * 1024 },
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

export async function updateIssueBody(
  issueNumber: number,
  newBody: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("gh", ["issue", "edit", String(issueNumber), "--body-file", "-"]);
    proc.stdin.write(newBody);
    proc.stdin.end();
    let stderr = "";
    proc.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`gh issue edit failed (code ${code}): ${stderr}`));
    });
    proc.on("error", reject);
  });
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
