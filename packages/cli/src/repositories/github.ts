import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface CreatePrOptions {
  title: string;
  body: string;
  base?: string;
  head: string;
  draft?: boolean;
}

export interface PrInfo {
  number: number;
  url: string;
}

export async function createPullRequest(options: CreatePrOptions): Promise<PrInfo> {
  const args = [
    "pr", "create",
    "--title", options.title,
    "--body-file", "-",
    "--head", options.head,
  ];
  if (options.base) {
    args.push("--base", options.base);
  }
  if (options.draft) {
    args.push("--draft");
  }

  // Pass body via stdin to avoid shell escaping issues
  await new Promise<void>((resolve, reject) => {
    const proc = spawn("gh", args);
    proc.stdin.write(options.body);
    proc.stdin.end();
    let stderr = "";
    proc.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`gh pr create failed (code ${code}): ${stderr}`));
    });
    proc.on("error", reject);
  });

  // Get the PR info from the branch
  const { stdout } = await execFileAsync("gh", [
    "pr", "view", options.head,
    "--json", "number,url",
  ]);
  const data = JSON.parse(stdout);
  return { number: data.number, url: data.url };
}

export async function createIssueComment(
  issueNumber: number,
  body: string,
): Promise<void> {
  const args = ["issue", "comment", String(issueNumber), "--body-file", "-"];
  await new Promise<void>((resolve, reject) => {
    const proc = spawn("gh", args);
    proc.stdin.write(body);
    proc.stdin.end();
    let stderr = "";
    proc.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`gh issue comment failed (code ${code}): ${stderr}`));
    });
    proc.on("error", reject);
  });
}

export async function createPrComment(
  prNumber: number,
  body: string,
): Promise<void> {
  const args = ["pr", "comment", String(prNumber), "--body-file", "-"];
  await new Promise<void>((resolve, reject) => {
    const proc = spawn("gh", args);
    proc.stdin.write(body);
    proc.stdin.end();
    let stderr = "";
    proc.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`gh pr comment failed (code ${code}): ${stderr}`));
    });
    proc.on("error", reject);
  });
}

export async function getPullRequest(prNumber: number): Promise<PrInfo & { state: string }> {
  const { stdout } = await execFileAsync("gh", [
    "pr", "view", String(prNumber),
    "--json", "number,url,state",
  ]);
  const data = JSON.parse(stdout);
  return { number: data.number, url: data.url, state: data.state };
}
