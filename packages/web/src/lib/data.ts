import type { Requirement } from "@reqord/shared";
import { getRepository } from "./get-repository";

export async function getAllRequirements(): Promise<Requirement[]> {
  const repo = getRepository();
  return repo.findAll();
}

export async function getRequirementById(
  id: string,
): Promise<Requirement | null> {
  const repo = getRepository();
  return repo.findById(id);
}

export async function getRequirementDescription(
  id: string,
): Promise<string | null> {
  const repo = getRepository();
  return repo.loadDescription(id);
}
