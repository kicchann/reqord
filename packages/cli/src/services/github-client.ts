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

export interface GitHubIssueDetail extends GitHubIssue {
  updatedAt: string;
  closedAt: string | null;
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

export async function listIssuesByLabel(
  labels: string[],
  state: "open" | "closed" | "all" = "all",
): Promise<GitHubIssue[]> {
  const labelArg = labels.map((l) => `--label ${l}`).join(" ");
  const { stdout } = await execAsync(
    `gh issue list ${labelArg} --state ${state} --json number,title,state,labels,createdAt,body --limit 1000`,
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

export async function getIssueDetail(issueNumber: number): Promise<GitHubIssueDetail> {
  const { stdout } = await execAsync(
    `gh issue view ${issueNumber} --json number,title,state,labels,createdAt,body,updatedAt,closedAt`,
  );
  const raw = JSON.parse(stdout);
  return {
    ...normalizeIssue(raw),
    updatedAt: raw.updatedAt,
    closedAt: raw.closedAt ?? null,
  };
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

export interface CreateIssueOptions {
  title: string;
  body: string;
  labels: string[];
}

export interface CreatedIssue {
  number: number;
  url: string;
}

export async function createIssue(
  options: CreateIssueOptions,
): Promise<CreatedIssue> {
  return new Promise((resolve, reject) => {
    const args = [
      "issue",
      "create",
      "--title",
      options.title,
      "--label",
      options.labels.join(","),
      "--body-file",
      "-",
    ];

    const proc = spawn("gh", args);
    proc.stdin.write(options.body);
    proc.stdin.end();

    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString(); });
    proc.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });
    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`gh issue create failed (code ${code}): ${stderr}`));
        return;
      }
      // gh issue create outputs the URL like: https://github.com/owner/repo/issues/123
      const match = stdout.trim().match(/https:\/\/github\.com\/[^/]+\/[^/]+\/issues\/(\d+)/);
      if (!match) {
        reject(new Error(`Failed to extract issue URL from gh output: ${stdout}`));
        return;
      }
      resolve({
        number: parseInt(match[1], 10),
        url: match[0],
      });
    });
    proc.on("error", reject);
  });
}
