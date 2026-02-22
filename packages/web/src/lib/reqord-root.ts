import { REQORD_DIR, SPECIFICATIONS_DIR, ISSUES_DIR } from "@reqord/shared";
import * as fs from "./file-system";

let cachedRoot: string | null = null;

export function getReqordRoot(): string {
  if (cachedRoot) {
    return cachedRoot;
  }

  const envRoot = process.env.REQORD_ROOT;
  if (!envRoot) {
    throw new Error(
      "REQORD_ROOT environment variable is not set. " +
        "Set it to the project root containing .reqord/ directory.",
    );
  }

  cachedRoot = envRoot;
  return cachedRoot;
}

export function getRequirementsDir(): string {
  return fs.joinPath(getReqordRoot(), REQORD_DIR, "requirements");
}

export function getSpecificationsDir(): string {
  return fs.joinPath(getReqordRoot(), REQORD_DIR, SPECIFICATIONS_DIR);
}

export function getIssuesDir(): string {
  return fs.joinPath(getReqordRoot(), REQORD_DIR, ISSUES_DIR);
}
