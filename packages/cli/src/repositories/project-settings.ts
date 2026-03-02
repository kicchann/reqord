import { SETTINGS_DIR } from "@reqord/shared";
import * as fs from "./file-system.js";

const SETTING_FILENAME = "setting.yaml";

function getSettingPath(cwd: string): string {
  return fs.joinPath(fs.getReqordDir(cwd, SETTINGS_DIR), SETTING_FILENAME);
}

export async function readRawProjectSettings(cwd: string): Promise<unknown> {
  const settingPath = getSettingPath(cwd);
  if (!(await fs.exists(settingPath))) {
    return {};
  }
  const raw = await fs.readYAML<unknown>(settingPath);
  if (raw === null || raw === undefined) {
    return {};
  }
  return raw;
}
