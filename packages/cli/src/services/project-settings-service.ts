import { ProjectSettingsSchema } from "@reqord/shared";
import type { ProjectSettings } from "@reqord/shared";
import * as projectSettingsRepo from "../repositories/project-settings.js";

export async function loadProjectSettings(cwd: string): Promise<ProjectSettings> {
  let raw: unknown = {};
  try {
    raw = await projectSettingsRepo.readRawProjectSettings(cwd);
  } catch (error) {
    console.warn(
      `[reqord] Could not read setting.yaml: ${error instanceof Error ? error.message : String(error)}. Using default settings.`,
    );
    return getDefaultProjectSettings();
  }
  const result = ProjectSettingsSchema.safeParse(raw);
  if (!result.success) {
    console.warn(
      `[reqord] Invalid setting.yaml: ${result.error.message}. Using default settings.`,
    );
    return getDefaultProjectSettings();
  }
  return result.data;
}

export function getDefaultProjectSettings(): ProjectSettings {
  return ProjectSettingsSchema.parse({});
}
