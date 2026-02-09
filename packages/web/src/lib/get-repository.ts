import type { RequirementRepository } from "./repository";
import { LocalRequirementRepository } from "./local-repository";
import type { SpecificationRepository } from "./specification-repository";
import { LocalSpecificationRepository } from "./local-specification-repository";

let instance: RequirementRepository | null = null;
let specInstance: SpecificationRepository | null = null;

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

export function getSpecificationRepository(): SpecificationRepository {
  if (specInstance) {
    return specInstance;
  }

  const dataSource = process.env.REQORD_DATA_SOURCE ?? "local";

  switch (dataSource) {
    case "local":
      specInstance = new LocalSpecificationRepository();
      break;
    default:
      throw new Error(`Unknown REQORD_DATA_SOURCE: ${dataSource}`);
  }

  return specInstance;
}
