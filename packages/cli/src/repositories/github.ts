import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

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
  const escapedTitle = options.title.replace(/"/g, '\\"');
  const escapedBody = options.body.replace(/"/g, '\\"');

  let cmd = `gh pr create --title "${escapedTitle}" --body "${escapedBody}" --head ${options.head}`;
  if (options.base) {
    cmd += ` --base ${options.base}`;
  }
  if (options.draft) {
    cmd += " --draft";
  }

  await execAsync(cmd);

  const { stdout } = await execAsync(`gh pr view ${options.head} --json number,url`);
  const data = JSON.parse(stdout);
  return { number: data.number, url: data.url };
}

export async function getPullRequest(prNumber: number): Promise<PrInfo & { state: string }> {
  const { stdout } = await execAsync(`gh pr view ${prNumber} --json number,url,state`);
  const data = JSON.parse(stdout);
  return { number: data.number, url: data.url, state: data.state };
}
