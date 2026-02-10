import {
  CONTEXT_DIR,
  REQUIREMENTS_DIR,
  SPECIFICATIONS_DIR,
  SETTINGS_DIR,
  TEMPLATES_DIR,
  RULES_DIR,
  ASSETS_DIR,
  DOMAIN_DIR,
  ISSUE_TEMPLATES_DIR,
} from "@reqord/shared";
import * as fs from "../repositories/file-system.js";
import {
  DEFAULT_REQUIREMENT_DESCRIPTION_TEMPLATE,
  DEFAULT_REQUIREMENT_QUALITY_RULES,
} from "../utils/templates.js";

export interface InitResult {
  created: string[];
  alreadyExists: boolean;
}

export async function initProject(cwd: string): Promise<InitResult> {
  const reqordRoot = fs.getReqordDir(cwd);

  if (await fs.exists(reqordRoot)) {
    return { created: [], alreadyExists: true };
  }

  const created: string[] = [];

  const dirs = [
    fs.joinPath(reqordRoot, CONTEXT_DIR, DOMAIN_DIR),
    fs.joinPath(reqordRoot, REQUIREMENTS_DIR),
    fs.joinPath(reqordRoot, SPECIFICATIONS_DIR),
    fs.joinPath(reqordRoot, SETTINGS_DIR, TEMPLATES_DIR, ISSUE_TEMPLATES_DIR),
    fs.joinPath(reqordRoot, SETTINGS_DIR, RULES_DIR),
    fs.joinPath(reqordRoot, ASSETS_DIR),
  ];

  for (const dir of dirs) {
    await fs.mkdirp(dir);
    created.push(dir);
  }

  // Write default templates
  const templatePath = fs.joinPath(
    reqordRoot,
    SETTINGS_DIR,
    TEMPLATES_DIR,
    "requirement-description.md",
  );
  await fs.writeText(templatePath, DEFAULT_REQUIREMENT_DESCRIPTION_TEMPLATE);
  created.push(templatePath);

  // Write default rules
  const rulesPath = fs.joinPath(
    reqordRoot,
    SETTINGS_DIR,
    RULES_DIR,
    "requirement-quality.md",
  );
  await fs.writeText(rulesPath, DEFAULT_REQUIREMENT_QUALITY_RULES);
  created.push(rulesPath);

  // Write .gitkeep for empty dirs
  const gitkeepDirs = [
    fs.joinPath(reqordRoot, SPECIFICATIONS_DIR),
    fs.joinPath(reqordRoot, ASSETS_DIR),
  ];
  for (const dir of gitkeepDirs) {
    await fs.writeText(fs.joinPath(dir, ".gitkeep"), "");
  }

  return { created, alreadyExists: false };
}
