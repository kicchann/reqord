import type { Specification } from "@reqord/shared";
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

export interface ValidateSpecDesignResult {
  validation: DesignValidation;
  spec: Specification;
}

// Each entry: "English|日本語" - supports both heading variants in design.md
const REQUIRED_SECTIONS = [
  "Design Overview|設計概要",
  "Architecture|アーキテクチャ",
  "Component Design|コンポーネント設計",
  "Test Plan|テスト方針",
];

function checkDesignSections(design: string): ValidationRuleResult {
  const sectionPattern = /^##\s+(?:\d+\.\s+)?(.+)/gm;
  const foundSections: string[] = [];
  let match;
  while ((match = sectionPattern.exec(design)) !== null) {
    foundSections.push(match[1].trim());
  }

  const missing = REQUIRED_SECTIONS.filter(
    (s) => {
      const variants = s.split("|");
      return !foundSections.some((f) => variants.some((v) => f.includes(v)));
    },
  );

  if (missing.length === 0) {
    return {
      ruleId: "design-sections",
      ruleName: "Section structure",
      severity: "warning",
      status: "pass",
    };
  }

  return {
    ruleId: "design-sections",
    ruleName: "Section structure",
    severity: "warning",
    status: "fail",
    message: `Required sections missing: ${missing.map((s) => s.split("|")[0]).join(", ")}`,
  };
}

function checkTestStrategy(design: string): ValidationRuleResult {
  const hasTestSection = /##\s+(?:\d+\.\s+)?(?:テスト方針|Test Plan)/i.test(design);
  const hasUnitTest = /ユニットテスト|unit\s*test/i.test(design);
  const hasIntegrationTest = /統合テスト|integration\s*test/i.test(design);

  if (hasTestSection && (hasUnitTest || hasIntegrationTest)) {
    return {
      ruleId: "test-strategy",
      ruleName: "Test strategy description",
      severity: "warning",
      status: "pass",
    };
  }

  return {
    ruleId: "test-strategy",
    ruleName: "Test strategy description",
    severity: "warning",
    status: "fail",
    message: hasTestSection
      ? "Test Plan section does not mention unit test/integration test"
      : "Test Plan section is missing",
  };
}

function checkArchLayer(design: string, _technical: unknown): ValidationRuleResult {
  // Check that design.md mentions architectural layers consistent with technical.yaml
  // This is a basic check: look for layer-like patterns (Command, Service, Repository)
  const layerPatterns = ["command", "service", "repository"];
  const hasLayerStructure = layerPatterns.some(
    (p) => design.toLowerCase().includes(p),
  );

  if (hasLayerStructure) {
    return {
      ruleId: "arch-layer",
      ruleName: "Layer consistency",
      severity: "warning",
      status: "pass",
    };
  }

  return {
    ruleId: "arch-layer",
    ruleName: "Layer consistency",
    severity: "warning",
    status: "fail",
    message: "Design does not describe layer structure",
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
          ruleName: "Dependency direction",
          severity: "warning",
          status: "fail",
          message: "Reference from Service layer to Command layer detected",
          location: { line: i + 1, content: line.trim() },
        };
      }
    }
  }

  return {
    ruleId: "arch-dependency",
    ruleName: "Dependency direction",
    severity: "warning",
    status: "pass",
  };
}

function checkNamingConvention(
  design: string,
  _structure: unknown,
): ValidationRuleResult {
  // Check for consistent naming patterns in the design
  // Look for component names that follow kebab-case for files
  const filePatterns = design.match(/`([^`]+\.[a-zA-Z0-9]+)`/g) ?? [];

  // Check file naming: should be kebab-case
  const badFileNames = filePatterns.filter((f) => {
    const name = f.replace(/`/g, "").split(".")[0];
    return /[A-Z]/.test(name); // PascalCase or camelCase in file names
  });

  if (badFileNames.length > 0) {
    return {
      ruleId: "naming-convention",
      ruleName: "Naming convention",
      severity: "info",
      status: "fail",
      message: `File names not in kebab-case: ${badFileNames.join(", ")}`,
    };
  }

  return {
    ruleId: "naming-convention",
    ruleName: "Naming convention",
    severity: "info",
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
      ruleName: "Dependency conflict",
      severity: "error",
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
      ruleName: "Dependency conflict",
      severity: "error",
      status: "fail",
      message: `Missing specification for dependent requirements: ${missingSpecDeps.join(", ")}`,
    };
  }

  return {
    ruleId: "dep-conflict",
    ruleName: "Dependency conflict",
    severity: "error",
    status: "pass",
  };
}

export async function validateSpecDesign(
  cwd: string,
  specId: string,
): Promise<ValidateSpecDesignResult> {
  const spec = await specRepo.findByIdOrThrow(cwd, specId);
  const design = await specRepo.loadFile(cwd, specId, "design.md");

  if (!design) {
    return {
      validation: {
        specId,
        rules: [
          {
            ruleId: "design-exists",
            ruleName: "Design document exists",
            severity: "error",
            status: "fail",
            message: "design.md not found",
          },
        ],
        passed: 0,
        warnings: 0,
        errors: 1,
        validatedAt: new Date().toISOString(),
      },
      spec,
    };
  }

  // Load project context (optional) - errors are caught to avoid interrupting validation
  let technical: unknown = null;
  try {
    technical = await contextRepo.loadContextFile(cwd, "technical");
  } catch (err) {
    console.warn(
      `Warning: Failed to parse technical.yaml: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  let structure: unknown = null;
  try {
    structure = await contextRepo.loadContextFile(cwd, "structure");
  } catch (err) {
    console.warn(
      `Warning: Failed to parse structure.yaml: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

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
    validation: {
      specId,
      rules,
      passed,
      warnings,
      errors,
      validatedAt: new Date().toISOString(),
    },
    spec,
  };
}
