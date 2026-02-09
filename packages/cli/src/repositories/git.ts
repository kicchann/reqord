import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

async function git(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", args, { cwd });
  return stdout.trimEnd();
}

export async function createBranch(cwd: string, name: string): Promise<void> {
  await git(cwd, ["branch", name]);
}

export async function checkout(cwd: string, branchName: string): Promise<void> {
  await git(cwd, ["checkout", branchName]);
}

export async function add(cwd: string, files: string[]): Promise<void> {
  await git(cwd, ["add", ...files]);
}

export async function commit(cwd: string, message: string): Promise<void> {
  await git(cwd, ["commit", "-m", message]);
}

export async function push(cwd: string, branchName: string): Promise<void> {
  await git(cwd, ["push", "-u", "origin", branchName]);
}

export async function getCurrentBranch(cwd: string): Promise<string> {
  return git(cwd, ["rev-parse", "--abbrev-ref", "HEAD"]);
}

export async function getCurrentCommitHash(cwd: string): Promise<string> {
  return git(cwd, ["rev-parse", "--short", "HEAD"]);
}
