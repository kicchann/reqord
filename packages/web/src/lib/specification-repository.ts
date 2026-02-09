import type { Specification } from "@reqord/shared";

export interface SpecificationRepository {
  findAll(): Promise<Specification[]>;
  findById(id: string): Promise<Specification | null>;
  loadDesign(id: string): Promise<string | null>;
  findByRequirementId(requirementId: string): Promise<Specification[]>;
}
