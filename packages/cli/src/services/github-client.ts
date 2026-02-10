import { spawn } from "node:child_process";

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

function runGh(args: string[], options?: { stdin?: string }): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn("gh", args);
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString(); });
    proc.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });

    if (options?.stdin !== undefined) {
      proc.stdin.write(options.stdin);
      proc.stdin.end();
    }

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`gh ${args[0]} ${args[1] ?? ""} failed (code ${code}): ${stderr}`.trim()));
        return;
      }
      resolve(stdout);
    });
    proc.on("error", reject);
  });
}

export async function listFeedbackIssues(): Promise<GitHubIssue[]> {
  const stdout = await runGh([
    "issue", "list",
    "--label", "feedback",
    "--json", "number,title,state,labels,createdAt,body",
    "--limit", "1000",
  ]);
  const raw: GitHubIssueRaw[] = JSON.parse(stdout);
  return raw.map(normalizeIssue);
}

export async function listIssuesByLabel(
  labels: string[],
  state: "open" | "closed" | "all" = "all",
): Promise<GitHubIssue[]> {
  const args = ["issue", "list"];
  for (const label of labels) {
    args.push("--label", label);
  }
  args.push("--state", state, "--json", "number,title,state,labels,createdAt,body", "--limit", "1000");

  const stdout = await runGh(args);
  const raw: GitHubIssueRaw[] = JSON.parse(stdout);
  return raw.map(normalizeIssue);
}

export async function getIssue(issueNumber: number): Promise<GitHubIssue> {
  const stdout = await runGh([
    "issue", "view", String(issueNumber),
    "--json", "number,title,state,labels,createdAt,body",
  ]);
  const raw: GitHubIssueRaw = JSON.parse(stdout);
  return normalizeIssue(raw);
}

export async function getIssueDetail(issueNumber: number): Promise<GitHubIssueDetail> {
  const stdout = await runGh([
    "issue", "view", String(issueNumber),
    "--json", "number,title,state,labels,createdAt,body,updatedAt,closedAt",
  ]);
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
  await runGh(["issue", "edit", String(issueNumber), "--body-file", "-"], { stdin: newBody });
}

export async function closeIssue(
  issueNumber: number,
  comment?: string,
): Promise<void> {
  const args = ["issue", "close", String(issueNumber)];
  if (comment) {
    args.push("--comment", comment);
  }
  await runGh(args);
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

  const stdout = await runGh(args, { stdin: options.body });

  // gh issue create outputs the URL like: https://github.com/owner/repo/issues/123
  const match = stdout.trim().match(/https:\/\/github\.com\/[^/]+\/[^/]+\/issues\/(\d+)/);
  if (!match) {
    throw new Error(`Failed to extract issue URL from gh output: ${stdout}`);
  }
  return {
    number: parseInt(match[1], 10),
    url: match[0],
  };
}
