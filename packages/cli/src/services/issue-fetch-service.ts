import * as specRepo from "../repositories/specification.js";
import * as githubClient from "./github-client.js";
import * as fs from "../repositories/file-system.js";
import { parseSpecTag, type SpecTagMetadata } from "../utils/spec-tag-parser.js";
import { TasksIndexSchema, REQORD_DIR, ISSUES_DIR } from "@reqord/shared";
import type { TaskEntry } from "@reqord/shared";
import path from "node:path";

export interface FetchOptions {
  specId?: string;
  dryRun?: boolean;
}

export interface SpecFetchResult {
  specId: string;
  issueCount: number;
  totalEstimatedHours: number;
  previousIssueCount: number;
  updated: boolean;
}

export interface OrphanIssue {
  number: number;
  title: string;
  specId: string;
}

export interface FetchResult {
  specsUpdated: SpecFetchResult[];
  issuesWithoutSpec: OrphanIssue[];
  totalIssuesFetched: number;
  totalIssuesWithTag: number;
}

interface ParsedIssue {
  number: number;
  title: string;
  state: "open" | "closed";
  metadata: SpecTagMetadata;
}

async function loadTasksYaml(
  cwd: string,
): Promise<{ title: string; tasks: TaskEntry[] }> {
  const tasksPath = path.join(cwd, REQORD_DIR, ISSUES_DIR, "tasks.yaml");
  const raw = await fs.readYAML(tasksPath).catch(() => null);
  if (!raw) return { title: "Tasks", tasks: [] };
  const parsed = TasksIndexSchema.safeParse(raw);
  if (!parsed.success) return { title: "Tasks", tasks: [] };
  return parsed.data;
}

async function saveTasksYaml(
  cwd: string,
  data: { title: string; tasks: TaskEntry[] },
): Promise<void> {
  const tasksPath = path.join(cwd, REQORD_DIR, ISSUES_DIR, "tasks.yaml");
  await fs.writeYAML(tasksPath, data);
}

export async function fetchIssues(
  cwd: string,
  options?: FetchOptions,
): Promise<FetchResult> {
  const allIssues = await githubClient.listAllIssues("all", 500);
  const repoUrl = await githubClient.getRepoUrl();

  const parsedIssues: ParsedIssue[] = [];
  for (const issue of allIssues) {
    if (!issue.body) continue;
    const metadata = parseSpecTag(issue.body);
    if (metadata) {
      parsedIssues.push({
        number: issue.number,
        title: issue.title,
        state: issue.state,
        metadata,
      });
    }
  }

  const groupedBySpec = new Map<string, ParsedIssue[]>();
  for (const parsed of parsedIssues) {
    const specId = parsed.metadata.specificationId;
    if (!groupedBySpec.has(specId)) {
      groupedBySpec.set(specId, []);
    }
    groupedBySpec.get(specId)!.push(parsed);
  }

  if (options?.specId) {
    const filtered = new Map<string, ParsedIssue[]>();
    if (groupedBySpec.has(options.specId)) {
      filtered.set(options.specId, groupedBySpec.get(options.specId)!);
    }
    groupedBySpec.clear();
    for (const [k, v] of filtered) {
      groupedBySpec.set(k, v);
    }
  }

  const specsUpdated: SpecFetchResult[] = [];
  const issuesWithoutSpec: OrphanIssue[] = [];

  const tasksIndex = await loadTasksYaml(cwd);

  for (const [specId, issues] of groupedBySpec) {
    const spec = await specRepo.findById(cwd, specId);

    if (!spec) {
      for (const issue of issues) {
        issuesWithoutSpec.push({
          number: issue.number,
          title: issue.title,
          specId,
        });
      }
      continue;
    }

    const previousIssueCount = tasksIndex.tasks.filter((t) =>
      t.linkedTo.specifications.includes(specId),
    ).length;

    const totalEstimatedHours = issues.reduce(
      (sum, issue) => sum + (issue.metadata.estimatedHours ?? 0),
      0,
    );

    for (const issue of issues) {
      const existingIdx = tasksIndex.tasks.findIndex(
        (t) => t.number === issue.number,
      );
      const taskEntry: TaskEntry = {
        number: issue.number,
        title: issue.title,
        url: `${repoUrl}/issues/${issue.number}`,
        linkedTo: { specifications: [specId] },
        priority: issue.metadata.priority ?? "P2",
        status: issue.state as "open" | "closed",
        estimatedHours: issue.metadata.estimatedHours,
        syncedAt: new Date().toISOString(),
      };

      if (existingIdx >= 0) {
        tasksIndex.tasks[existingIdx] = taskEntry;
      } else {
        tasksIndex.tasks.push(taskEntry);
      }
    }

    specsUpdated.push({
      specId,
      issueCount: issues.length,
      totalEstimatedHours,
      previousIssueCount,
      updated: !options?.dryRun,
    });
  }

  if (!options?.dryRun && specsUpdated.length > 0) {
    await saveTasksYaml(cwd, tasksIndex);
  }

  return {
    specsUpdated,
    issuesWithoutSpec,
    totalIssuesFetched: allIssues.length,
    totalIssuesWithTag: parsedIssues.length,
  };
}
