import * as specRepo from "../repositories/specification.js";
import * as reqRepo from "../repositories/requirement.js";
import * as contextRepo from "../repositories/project-context.js";

export interface ValidationRuleResult {
  ruleId: string;
  ruleName: string;
  severity: "error" | "warning" | "info";
  status: "pass" | "fail";
  message?: string;
  location?: { line: number; content: string };
}

export interface DesignValidation {
  specId: string;
  rules: ValidationRuleResult[];
  passed: number;
  warnings: number;
  errors: number;
  validatedAt: string;
}

const REQUIRED_SECTIONS = [
  "設計概要",
  "アーキテクチャ",
  "コンポーネント設計",
  "テスト方針",
];

function checkDesignSections(design: string): ValidationRuleResult {
  const sectionPattern = /^##\s+(?:\d+\.\s+)?(.+)/gm;
  const foundSections: string[] = [];
  let match;
  while ((match = sectionPattern.exec(design)) !== null) {
    foundSections.push(match[1].trim());
  }

  const missing = REQUIRED_SECTIONS.filter(
    (s) => !foundSections.some((f) => f.includes(s)),
  );

  if (missing.length === 0) {
    return {
      ruleId: "design-sections",
      ruleName: "セクション構成",
      severity: "warning",
      status: "pass",
    };
  }

  return {
    ruleId: "design-sections",
    ruleName: "セクション構成",
    severity: "warning",
    status: "fail",
    message: `必須セクションが不足: ${missing.join(", ")}`,
  };
}

function checkTestStrategy(design: string): ValidationRuleResult {
  const hasTestSection = /##\s+(?:\d+\.\s+)?テスト方針/.test(design);
  const hasUnitTest = /ユニットテスト|unit\s*test/i.test(design);
  const hasIntegrationTest = /統合テスト|integration\s*test/i.test(design);

  if (hasTestSection && (hasUnitTest || hasIntegrationTest)) {
    return {
      ruleId: "test-strategy",
      ruleName: "テスト方針記載",
      severity: "info",
      status: "pass",
    };
  }

  return {
    ruleId: "test-strategy",
    ruleName: "テスト方針記載",
    severity: "info",
    status: "fail",
    message: hasTestSection
      ? "テスト方針セクションにユニットテスト/統合テストの記載がありません"
      : "テスト方針セクションがありません",
  };
}

function checkArchLayer(design: string, technical: unknown): ValidationRuleResult {
  // Check that design.md mentions architectural layers consistent with technical.yaml
  // This is a basic check: look for layer-like patterns (Command, Service, Repository)
  const layerPatterns = ["command", "service", "repository"];
  const hasLayerStructure = layerPatterns.some(
    (p) => design.toLowerCase().includes(p),
  );

  if (hasLayerStructure) {
    return {
      ruleId: "arch-layer",
      ruleName: "レイヤー整合性",
      severity: "error",
      status: "pass",
    };
  }

  return {
    ruleId: "arch-layer",
    ruleName: "レイヤー整合性",
    severity: "error",
    status: "fail",
    message: "設計にレイヤー構成の記載がありません",
  };
}

function checkArchDependency(design: string): ValidationRuleResult {
  // Check for reverse dependency patterns (Service importing from Command layer)
  const lines = design.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Detect service-layer importing from command-layer
    if (
      /services?\/.*import.*commands?\//i.test(line) ||
      /from\s+['"].*commands?\//i.test(line)
    ) {
      if (
        /services?\//.test(line) &&
        !/commands?\/.*services?\//i.test(line)
      ) {
        return {
          ruleId: "arch-dependency",
          ruleName: "依存方向",
          severity: "error",
          status: "fail",
          message: "Service層からCommand層への参照が検出されました",
          location: { line: i + 1, content: line.trim() },
        };
      }
    }
  }

  return {
    ruleId: "arch-dependency",
    ruleName: "依存方向",
    severity: "error",
    status: "pass",
  };
}

function checkNamingConvention(
  design: string,
  structure: unknown,
): ValidationRuleResult {
  // Check for consistent naming patterns in the design
  // Look for component names that follow kebab-case for files and PascalCase for types
  const filePatterns = design.match(/`([a-z][a-z0-9-]*\.[a-z]+)`/g) ?? [];
  const typePatterns = design.match(/[A-Z][a-zA-Z]+(?:Schema|Service|Command|Handler|Repository)/g) ?? [];

  // Check file naming: should be kebab-case
  const badFileNames = filePatterns.filter((f) => {
    const name = f.replace(/`/g, "").split(".")[0];
    return /[A-Z]/.test(name); // PascalCase or camelCase in file names
  });

  if (badFileNames.length > 0) {
    return {
      ruleId: "naming-convention",
      ruleName: "命名規則",
      severity: "warning",
      status: "fail",
      message: `ファイル名がkebab-caseでない: ${badFileNames.join(", ")}`,
    };
  }

  return {
    ruleId: "naming-convention",
    ruleName: "命名規則",
    severity: "warning",
    status: "pass",
  };
}

function checkDepConflict(
  specReqId: string,
  allReqs: Array<{ id: string; dependencies?: { blockedBy: string[] } }>,
  allSpecs: Array<{ requirementId: string; status: string }>,
): ValidationRuleResult {
  const req = allReqs.find((r) => r.id === specReqId);
  if (!req || !req.dependencies) {
    return {
      ruleId: "dep-conflict",
      ruleName: "依存関係矛盾",
      severity: "warning",
      status: "pass",
    };
  }

  const missingSpecDeps: string[] = [];
  for (const depId of req.dependencies.blockedBy) {
    const depReq = allReqs.find((r) => r.id === depId);
    if (!depReq) continue;
    // Check if the dependent requirement has a non-deprecated specification
    const hasSpec = allSpecs.some(
      (s) => s.requirementId === depId && s.status !== "deprecated",
    );
    if (!hasSpec) {
      missingSpecDeps.push(depId);
    }
  }

  if (missingSpecDeps.length > 0) {
    return {
      ruleId: "dep-conflict",
      ruleName: "依存関係矛盾",
      severity: "warning",
      status: "fail",
      message: `依存先要件にSpecificationが未作成: ${missingSpecDeps.join(", ")}`,
    };
  }

  return {
    ruleId: "dep-conflict",
    ruleName: "依存関係矛盾",
    severity: "warning",
    status: "pass",
  };
}

export async function validateSpecDesign(
  cwd: string,
  specId: string,
): Promise<DesignValidation> {
  const spec = await specRepo.findByIdOrThrow(cwd, specId);
  const design = await specRepo.loadFile(cwd, specId, "design.md");

  if (!design) {
    return {
      specId,
      rules: [
        {
          ruleId: "design-exists",
          ruleName: "設計文書存在",
          severity: "error",
          status: "fail",
          message: "design.mdが存在しません",
        },
      ],
      passed: 0,
      warnings: 0,
      errors: 1,
      validatedAt: new Date().toISOString(),
    };
  }

  // Load project context (optional)
  const technical = await contextRepo.loadContextFile(cwd, "technical");
  const structure = await contextRepo.loadContextFile(cwd, "structure");
  const allReqs = await reqRepo.findAll(cwd);
  const allSpecs = await specRepo.findAll(cwd);

  const rules: ValidationRuleResult[] = [
    checkArchLayer(design, technical),
    checkArchDependency(design),
    checkNamingConvention(design, structure),
    checkDepConflict(spec.requirementId, allReqs, allSpecs),
    checkDesignSections(design),
    checkTestStrategy(design),
  ];

  const passed = rules.filter((r) => r.status === "pass").length;
  const errors = rules.filter(
    (r) => r.status === "fail" && r.severity === "error",
  ).length;
  const warnings = rules.filter(
    (r) => r.status === "fail" && r.severity === "warning",
  ).length;

  return {
    specId,
    rules,
    passed,
    warnings,
    errors,
    validatedAt: new Date().toISOString(),
  };
}
