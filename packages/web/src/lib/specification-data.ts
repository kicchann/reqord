import type { Specification } from "@reqord/shared";
import { getSpecificationRepository } from "./get-repository";

export async function getAllSpecifications(): Promise<Specification[]> {
  const repo = getSpecificationRepository();
  return repo.findAll();
}

export async function getSpecificationById(
  id: string,
): Promise<Specification | null> {
  const repo = getSpecificationRepository();
  return repo.findById(id);
}

export async function getSpecificationDesign(
  id: string,
): Promise<string | null> {
  const repo = getSpecificationRepository();
  return repo.loadDesign(id);
}

export async function getSpecificationsByRequirementId(
  requirementId: string,
): Promise<Specification[]> {
  const repo = getSpecificationRepository();
  return repo.findByRequirementId(requirementId);
}
