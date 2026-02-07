import type { RequirementRepository } from "./repository";
import { LocalRequirementRepository } from "./local-repository";

let instance: RequirementRepository | null = null;

export function getRepository(): RequirementRepository {
  if (instance) {
    return instance;
  }

  const dataSource = process.env.REQORD_DATA_SOURCE ?? "local";

  switch (dataSource) {
    case "local":
      instance = new LocalRequirementRepository();
      break;
    default:
      throw new Error(`Unknown REQORD_DATA_SOURCE: ${dataSource}`);
  }

  return instance;
}
