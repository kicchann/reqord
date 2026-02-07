import type { Requirement } from "@reqord/shared";

export interface RequirementRepository {
  findAll(): Promise<Requirement[]>;
  findById(id: string): Promise<Requirement | null>;
  loadDescription(id: string): Promise<string | null>;
  save(requirement: Requirement): Promise<void>;
  saveDescription(id: string, content: string): Promise<void>;
  deleteById(id: string): Promise<void>;
  generateNextId(): Promise<string>;
}
