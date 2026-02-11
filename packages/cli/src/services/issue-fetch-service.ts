import type { Implementation, ImplementationIssue } from "@reqord/shared";
import * as specRepo from "../repositories/specification.js";
import * as githubClient from "./github-client.js";
import { parseSpecTag, type SpecTagMetadata } from "../utils/spec-tag-parser.js";
import { calculateProgress } from "../utils/progress-calculator.js";

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

export async function fetchIssues(
  cwd: string,
  options?: FetchOptions,
): Promise<FetchResult> {
  // 1. Fetch all issues from GitHub
  const allIssues = await githubClient.listAllIssues("all", 500);
  const repoUrl = await githubClient.getRepoUrl();

  // 2. Parse spec tags from issue bodies
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

  // 3. Group by specId
  const groupedBySpec = new Map<string, ParsedIssue[]>();
  for (const parsed of parsedIssues) {
    const specId = parsed.metadata.specificationId;
    if (!groupedBySpec.has(specId)) {
      groupedBySpec.set(specId, []);
    }
    groupedBySpec.get(specId)!.push(parsed);
  }

  // 4. Filter by specId if specified
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

  // 5. Check which specs exist locally and build results
  const specsUpdated: SpecFetchResult[] = [];
  const issuesWithoutSpec: OrphanIssue[] = [];

  for (const [specId, issues] of groupedBySpec) {
    const spec = await specRepo.findById(cwd, specId);

    if (!spec) {
      // Spec doesn't exist locally — these are orphan issues
      for (const issue of issues) {
        issuesWithoutSpec.push({
          number: issue.number,
          title: issue.title,
          specId,
        });
      }
      continue;
    }

    const previousIssueCount = spec.implementation?.issues.length ?? 0;

    // Build Implementation object
    const implIssues: ImplementationIssue[] = issues.map((issue) => ({
      number: issue.number,
      title: issue.title,
      url: `${repoUrl}/issues/${issue.number}`,
      priority: issue.metadata.priority ?? "P2",
      status: issue.state as "open" | "closed",
    }));

    const totalEstimatedHours = issues.reduce(
      (sum, issue) => sum + (issue.metadata.estimatedHours ?? 0),
      0,
    );

    const progress = calculateProgress(implIssues);

    const implementation: Implementation = {
      issues: implIssues,
      totalEstimatedHours,
      createdAt: spec.implementation?.createdAt ?? new Date().toISOString(),
      progress: {
        ...progress,
        lastSyncedAt: new Date().toISOString(),
      },
    };

    if (!options?.dryRun) {
      spec.implementation = implementation;
      spec.updatedAt = new Date().toISOString();
      await specRepo.save(cwd, spec);
    }

    specsUpdated.push({
      specId,
      issueCount: issues.length,
      totalEstimatedHours,
      previousIssueCount,
      updated: !options?.dryRun,
    });
  }

  return {
    specsUpdated,
    issuesWithoutSpec,
    totalIssuesFetched: allIssues.length,
    totalIssuesWithTag: parsedIssues.length,
  };
}
