export interface SpecTagMetadata {
  specificationId: string;
  priority?: "P0" | "P1" | "P2" | "P3";
  estimatedHours?: number;
}

const SPEC_TAG_PATTERN = /<!-- reqord:specification\s+([\s\S]*?)-->/;

export function parseSpecTag(body: string): SpecTagMetadata | null {
  const match = SPEC_TAG_PATTERN.exec(body);
  if (!match) return null;

  try {
    const json = match[1].trim();
    const data = JSON.parse(json);

    if (!data.specificationId || typeof data.specificationId !== "string") {
      return null;
    }

    const result: SpecTagMetadata = {
      specificationId: data.specificationId,
    };

    if (data.priority && ["P0", "P1", "P2", "P3"].includes(data.priority)) {
      result.priority = data.priority;
    }

    if (typeof data.estimatedHours === "number" && data.estimatedHours > 0) {
      result.estimatedHours = data.estimatedHours;
    }

    return result;
  } catch {
    return null;
  }
}
