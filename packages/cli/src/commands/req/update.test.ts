import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Requirement } from "@reqord/shared";

// Mock services BEFORE imports
vi.mock("../../services/requirement-service.js", () => ({
  updateRequirement: vi.fn(),
}));

vi.mock("../../services/project-settings-service.js", () => ({
  loadProjectSettings: vi.fn(),
}));

vi.mock("../../repositories/file-system.js", () => ({
  readText: vi.fn(),
}));

import { updateCommand } from "./update.js";
import { updateRequirement } from "../../services/requirement-service.js";
import { loadProjectSettings } from "../../services/project-settings-service.js";

function makeRequirement(overrides: Partial<Requirement> = {}): Requirement {
  return {
    id: "req-000001",
    version: "1.0",
    title: "Test Requirement",
    status: "draft",
    priority: "medium",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    versionHistory: [],
    files: {
      description: "requirements/req-000001/description.md",
      supplementary: [],
    },
    successCriteria: ["Criterion 1"],
    format: { type: "free-form" },
    dependencies: { blockedBy: [], blocks: [], relatedTo: [] },
    ...overrides,
  };
}

const defaultSettings = {
  invariants: { versioning: true as const, cyclicDependencyCheck: true as const, statusTransitionRules: true as const, schemaValidation: true as const },
  approvalPrerequisites: { designMdCheck: true, descriptionMdCheck: false, customFiles: [] as string[] },
  statusTransitionPr: { draftToApproved: true, approvedToImplemented: false, toDraft: true },
  branchNaming: { toApprovedPrefix: "reqord", toImplementedPrefix: "reqord", toDraftPrefix: "reqord" },
  feedbackValidation: { blockOnUnresolved: false, severityThreshold: "critical" as const },
  autoRevert: { onContentChange: "always" as const },
  consistencyCheck: { specNotImplementedLevel: "warning" as const },
};

describe("updateCommand - settings連携", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = 0;
    // Reset Commander option state
    updateCommand.setOptionValue("title", undefined);
    updateCommand.setOptionValue("status", undefined);
    updateCommand.setOptionValue("priority", undefined);
    updateCommand.setOptionValue("patchFile", undefined);
    updateCommand.setOptionValue("descriptionFile", undefined);
    updateCommand.setOptionValue("major", undefined);
    updateCommand.setOptionValue("patch", undefined);
    updateCommand.setOptionValue("json", undefined);
  });

  it("updateRequirementにsettingsが渡される", async () => {
    const req = makeRequirement({ status: "approved" });
    vi.mocked(loadProjectSettings).mockResolvedValue(defaultSettings);
    vi.mocked(updateRequirement).mockResolvedValue({
      before: req,
      after: { ...req, title: "New Title" },
      descriptionUpdated: false,
      versionChanged: false,
    });

    await updateCommand.parseAsync(["node", "update", "req-000001", "--title", "New Title"]);

    expect(loadProjectSettings).toHaveBeenCalled();
    expect(updateRequirement).toHaveBeenCalledWith(
      expect.any(String),
      "req-000001",
      expect.objectContaining({
        title: "New Title",
        settings: defaultSettings,
      }),
    );
  });

  it("autoRevert.onContentChange=neverの設定がupdateRequirementに渡される", async () => {
    const neverSettings = {
      ...defaultSettings,
      autoRevert: { onContentChange: "never" as const },
    };
    const req = makeRequirement({ status: "approved" });
    vi.mocked(loadProjectSettings).mockResolvedValue(neverSettings);
    vi.mocked(updateRequirement).mockResolvedValue({
      before: req,
      after: req,
      descriptionUpdated: false,
      versionChanged: false,
    });

    await updateCommand.parseAsync(["node", "update", "req-000001", "--title", "New Title"]);

    expect(updateRequirement).toHaveBeenCalledWith(
      expect.any(String),
      "req-000001",
      expect.objectContaining({
        settings: neverSettings,
      }),
    );
  });
});
