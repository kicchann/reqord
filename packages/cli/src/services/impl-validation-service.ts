import * as specRepo from "../repositories/specification.js";
import * as fs from "../repositories/file-system.js";

export interface IssueCheckResult {
  total: number;
  completed: number;
  issues: Array<{
    number: number;
    title: string;
    state: "open" | "in_progress" | "closed";
    priority?: string;
  }>;
}

export interface ComponentCheckResult {
  total: number;
  exists: number;
  components: Array<{
    path: string;
    exists: boolean;
    description?: string;
  }>;
}

export interface TestCheckResult {
  total: number;
  exists: number;
  tests: Array<{
    path: string;
    exists: boolean;
    type: "unit" | "integration";
  }>;
}

export interface ImplValidation {
  specId: string;
  requirementId: string;
  issueCheck: IssueCheckResult;
  componentCheck: ComponentCheckResult;
  testCheck: TestCheckResult;
  overallStatus: "complete" | "partial" | "not-started";
  validatedAt: string;
}

export interface DesignPaths {
  components: Array<{ path: string; description: string }>;
  tests: Array<{ path: string; type: "unit" | "integration" }>;
}

export function parseDesignPaths(designContent: string): DesignPaths {
  const components: Array<{ path: string; description: string }> = [];
  const tests: Array<{ path: string; type: "unit" | "integration" }> = [];
  const seenPaths = new Set<string>();

  function addComponent(path: string, desc: string) {
    const normalized = path.replace(/^\//, "");
    // Guard against path traversal (e.g. "../../../etc/passwd")
    if (normalized.includes("..") || /^[a-zA-Z]:/.test(normalized)) return;
    if (!seenPaths.has(normalized) && /\.tsx?$/.test(normalized)) {
      seenPaths.add(normalized);
      if (normalized.includes(".test.") || normalized.includes(".spec.")) {
        tests.push({
          path: normalized,
          type: normalized.includes("integration") ? "integration" : "unit",
        });
      } else {
        components.push({ path: normalized, description: desc });
      }
    }
  }

  // Extract paths from section headings: ### 3.1 Title (`path.ts`)
  const headingPattern = /###\s+[\d.]+\s+(.+?)\s*\(`([^`]+\.tsx?)`\)/g;
  let match;
  while ((match = headingPattern.exec(designContent)) !== null) {
    addComponent(match[2], match[1]);
  }

  // Extract inline backtick paths: `packages/cli/src/services/foo.ts`
  const inlinePattern = /`((?:packages\/|src\/)[^`]+\.tsx?)`/g;
  while ((match = inlinePattern.exec(designContent)) !== null) {
    addComponent(match[1], "");
  }

  // Extract from architecture diagrams: services/foo-service.ts    (new)
  const archPattern = /^\s+([\w\-./]+\.tsx?)\s/gm;
  while ((match = archPattern.exec(designContent)) !== null) {
    const path = match[1];
    // Only include if it looks like a relative file path
    if (path.includes("/") && !path.startsWith("http")) {
      addComponent(path, "");
    }
  }

  // Generate test paths from components that don't already have test files
  for (const comp of components) {
    const ext = comp.path.endsWith(".tsx") ? ".test.tsx" : ".test.ts";
    const testPath = comp.path.replace(/\.tsx?$/, ext);
    if (!seenPaths.has(testPath)) {
      seenPaths.add(testPath);
      tests.push({ path: testPath, type: "unit" });
    }
  }

  return { components, tests };
}

export function determineOverallStatus(
  issueCheck: IssueCheckResult,
  componentCheck: ComponentCheckResult,
  testCheck: TestCheckResult,
): "complete" | "partial" | "not-started" {
  const issueComplete =
    issueCheck.total === 0 || issueCheck.completed === issueCheck.total;
  const componentComplete =
    componentCheck.total === 0 ||
    componentCheck.exists === componentCheck.total;
  const testComplete =
    testCheck.total === 0 || testCheck.exists === testCheck.total;

  if (issueComplete && componentComplete && testComplete) return "complete";
  // "not-started" = no files exist AND no issues completed.
  // If all totals are 0, the "complete" check above catches it first.
  if (
    componentCheck.exists === 0 &&
    testCheck.exists === 0 &&
    issueCheck.completed === 0
  )
    return "not-started";
  return "partial";
}

export async function validateImplementation(
  cwd: string,
  specId: string,
): Promise<ImplValidation> {
  const spec = await specRepo.findByIdOrThrow(cwd, specId);
  const design = await specRepo.loadFile(cwd, specId, "design.md");

  // Issue check (spec.implementation is no longer used; issues come from tasks.yaml)
  const issueCheck: IssueCheckResult = { total: 0, completed: 0, issues: [] };

  // If design.md is missing, we cannot validate — treat as not-started
  if (!design) {
    return {
      specId,
      requirementId: spec.requirementId,
      issueCheck,
      componentCheck: { total: 0, exists: 0, components: [] },
      testCheck: { total: 0, exists: 0, tests: [] },
      overallStatus: "not-started",
      validatedAt: new Date().toISOString(),
    };
  }

  // Parse design.md for component and test paths
  const designPaths = parseDesignPaths(design);

  // Component existence check
  const componentCheck: ComponentCheckResult = {
    total: designPaths.components.length,
    exists: 0,
    components: [],
  };
  for (const comp of designPaths.components) {
    const fullPath = fs.joinPath(cwd, comp.path);
    const fileExists = await fs.exists(fullPath);
    componentCheck.components.push({
      path: comp.path,
      exists: fileExists,
      description: comp.description || undefined,
    });
    if (fileExists) componentCheck.exists++;
  }

  // Test existence check
  const testCheck: TestCheckResult = {
    total: designPaths.tests.length,
    exists: 0,
    tests: [],
  };
  for (const test of designPaths.tests) {
    const fullPath = fs.joinPath(cwd, test.path);
    const fileExists = await fs.exists(fullPath);
    testCheck.tests.push({
      path: test.path,
      exists: fileExists,
      type: test.type,
    });
    if (fileExists) testCheck.exists++;
  }

  return {
    specId,
    requirementId: spec.requirementId,
    issueCheck,
    componentCheck,
    testCheck,
    overallStatus: determineOverallStatus(issueCheck, componentCheck, testCheck),
    validatedAt: new Date().toISOString(),
  };
}

export interface ImplementConsistencyWarning {
  type: "spec-not-implemented" | "issue-not-closed";
  message: string;
  details: {
    id: string;
    currentStatus: string;
  };
}

export interface ImplementConsistencyResult {
  warnings: ImplementConsistencyWarning[];
}

export async function checkImplementConsistency(
  cwd: string,
  reqId: string,
): Promise<ImplementConsistencyResult> {
  const specs = await specRepo.findAll(cwd);
  const relatedSpecs = specs.filter((s) => s.requirementId === reqId);
  const warnings: ImplementConsistencyWarning[] = [];

  for (const spec of relatedSpecs) {
    if (spec.status !== "implemented") {
      warnings.push({
        type: "spec-not-implemented",
        message: `${spec.id} status is ${spec.status} (not implemented)`,
        details: { id: spec.id, currentStatus: spec.status },
      });
    }

    // spec.implementation is no longer used; issue status comes from tasks.yaml
  }

  return { warnings };
}
