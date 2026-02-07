"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { RequirementSchema } from "@reqord/shared";
import { getRepository } from "./get-repository";

export type ActionResult = {
  success: boolean;
  error?: string;
};

export async function createRequirement(formData: FormData): Promise<ActionResult> {
  const repo = getRepository();

  const title = formData.get("title") as string;
  const status = formData.get("status") as string;
  const priority = formData.get("priority") as string;
  const formatType = formData.get("formatType") as string;
  const estimatedComplexity = formData.get("estimatedComplexity") as string | null;
  const estimatedHours = formData.get("estimatedHours") as string | null;
  const description = formData.get("description") as string | null;
  const successCriteriaRaw = formData.get("successCriteria") as string | null;
  const blockedByRaw = formData.get("blockedBy") as string | null;
  const blocksRaw = formData.get("blocks") as string | null;
  const relatedToRaw = formData.get("relatedTo") as string | null;

  // User story fields
  const userStoryAs = formData.get("userStoryAs") as string | null;
  const userStoryIWant = formData.get("userStoryIWant") as string | null;
  const userStorySoThat = formData.get("userStorySoThat") as string | null;

  // EARS fields
  const earsType = formData.get("earsType") as string | null;
  const earsTrigger = formData.get("earsTrigger") as string | null;
  const earsCondition = formData.get("earsCondition") as string | null;
  const earsAction = formData.get("earsAction") as string | null;
  const earsResponse = formData.get("earsResponse") as string | null;

  const id = await repo.generateNextId();
  const now = new Date().toISOString();

  const successCriteria = successCriteriaRaw
    ? JSON.parse(successCriteriaRaw) as string[]
    : [];
  const blockedBy = blockedByRaw ? JSON.parse(blockedByRaw) as string[] : [];
  const blocks = blocksRaw ? JSON.parse(blocksRaw) as string[] : [];
  const relatedTo = relatedToRaw ? JSON.parse(relatedToRaw) as string[] : [];

  let format: Record<string, unknown>;
  switch (formatType) {
    case "user-story":
      format = {
        type: "user-story",
        userStory: {
          as: userStoryAs ?? "",
          iWant: userStoryIWant ?? "",
          soThat: userStorySoThat ?? "",
        },
      };
      break;
    case "ears":
      format = {
        type: "ears",
        ears: {
          type: earsType ?? "",
          trigger: earsTrigger || undefined,
          condition: earsCondition || undefined,
          action: earsAction ?? "",
          response: earsResponse || undefined,
        },
      };
      break;
    default:
      format = { type: "free-form" };
      break;
  }

  const raw = {
    id,
    version: "1.0.0",
    title,
    status,
    priority,
    createdAt: now,
    updatedAt: now,
    versionHistory: [],
    files: { description: `${id}/description.md` },
    successCriteria,
    format,
    dependencies: { blockedBy, blocks, relatedTo },
    estimatedComplexity: estimatedComplexity || undefined,
    estimatedHours: estimatedHours ? Number(estimatedHours) : undefined,
  };

  const result = RequirementSchema.safeParse(raw);
  if (!result.success) {
    return { success: false, error: result.error.message };
  }

  await repo.save(result.data);

  if (description?.trim()) {
    await repo.saveDescription(id, description);
  }

  revalidatePath("/requirements");
  redirect(`/requirements/${id}`);
}

export async function updateRequirement(formData: FormData): Promise<ActionResult> {
  const repo = getRepository();

  const id = formData.get("id") as string;
  const existing = await repo.findById(id);
  if (!existing) {
    return { success: false, error: `Requirement ${id} not found` };
  }

  const title = formData.get("title") as string;
  const status = formData.get("status") as string;
  const priority = formData.get("priority") as string;
  const formatType = formData.get("formatType") as string;
  const estimatedComplexity = formData.get("estimatedComplexity") as string | null;
  const estimatedHours = formData.get("estimatedHours") as string | null;
  const description = formData.get("description") as string | null;
  const successCriteriaRaw = formData.get("successCriteria") as string | null;
  const blockedByRaw = formData.get("blockedBy") as string | null;
  const blocksRaw = formData.get("blocks") as string | null;
  const relatedToRaw = formData.get("relatedTo") as string | null;

  // User story fields
  const userStoryAs = formData.get("userStoryAs") as string | null;
  const userStoryIWant = formData.get("userStoryIWant") as string | null;
  const userStorySoThat = formData.get("userStorySoThat") as string | null;

  // EARS fields
  const earsType = formData.get("earsType") as string | null;
  const earsTrigger = formData.get("earsTrigger") as string | null;
  const earsCondition = formData.get("earsCondition") as string | null;
  const earsAction = formData.get("earsAction") as string | null;
  const earsResponse = formData.get("earsResponse") as string | null;

  const now = new Date().toISOString();
  const successCriteria = successCriteriaRaw
    ? JSON.parse(successCriteriaRaw) as string[]
    : [];
  const blockedBy = blockedByRaw ? JSON.parse(blockedByRaw) as string[] : [];
  const blocks = blocksRaw ? JSON.parse(blocksRaw) as string[] : [];
  const relatedTo = relatedToRaw ? JSON.parse(relatedToRaw) as string[] : [];

  let format: Record<string, unknown>;
  switch (formatType) {
    case "user-story":
      format = {
        type: "user-story",
        userStory: {
          as: userStoryAs ?? "",
          iWant: userStoryIWant ?? "",
          soThat: userStorySoThat ?? "",
        },
      };
      break;
    case "ears":
      format = {
        type: "ears",
        ears: {
          type: earsType ?? "",
          trigger: earsTrigger || undefined,
          condition: earsCondition || undefined,
          action: earsAction ?? "",
          response: earsResponse || undefined,
        },
      };
      break;
    default:
      format = { type: "free-form" };
      break;
  }

  const raw = {
    ...existing,
    title,
    status,
    priority,
    updatedAt: now,
    successCriteria,
    format,
    dependencies: { blockedBy, blocks, relatedTo },
    estimatedComplexity: estimatedComplexity || undefined,
    estimatedHours: estimatedHours ? Number(estimatedHours) : undefined,
  };

  const result = RequirementSchema.safeParse(raw);
  if (!result.success) {
    return { success: false, error: result.error.message };
  }

  await repo.save(result.data);

  if (description != null) {
    await repo.saveDescription(id, description);
  }

  revalidatePath("/requirements");
  revalidatePath(`/requirements/${id}`);
  redirect(`/requirements/${id}`);
}

export async function deleteRequirement(id: string): Promise<ActionResult> {
  const repo = getRepository();

  const existing = await repo.findById(id);
  if (!existing) {
    return { success: false, error: `Requirement ${id} not found` };
  }

  await repo.deleteById(id);

  revalidatePath("/requirements");
  redirect("/requirements");
}
