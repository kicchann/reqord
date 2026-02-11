import type { FeedbackType, FeedbackSeverity } from "@reqord/shared";

export interface ReqordFeedbackComment {
  type?: FeedbackType;
  severity?: FeedbackSeverity;
  linkedTo: {
    requirements: string[];
    createdRequirements: string[];
    specifications: string[];
    createdSpecifications: string[];
  };
}

const COMMENT_PATTERN = /<!-- reqord:feedback\s+([\s\S]*?)-->/;

export function parseReqordComment(body: string): ReqordFeedbackComment | null {
  const match = COMMENT_PATTERN.exec(body);
  if (!match) return null;

  try {
    const json = match[1].trim();
    const data = JSON.parse(json);
    const raw = data.linkedTo ?? {};
    const result: ReqordFeedbackComment = {
      linkedTo: {
        requirements: Array.isArray(raw.requirements) ? raw.requirements : [],
        createdRequirements: Array.isArray(raw.createdRequirements) ? raw.createdRequirements : [],
        specifications: Array.isArray(raw.specifications) ? raw.specifications : [],
        createdSpecifications: Array.isArray(raw.createdSpecifications) ? raw.createdSpecifications : [],
      },
    };
    if (data.type) result.type = data.type;
    if (data.severity) result.severity = data.severity;
    return result;
  } catch {
    return null;
  }
}

export function buildReqordComment(metadata: ReqordFeedbackComment): string {
  const obj: Record<string, unknown> = {};
  if (metadata.type) obj.type = metadata.type;
  if (metadata.severity) obj.severity = metadata.severity;
  obj.linkedTo = metadata.linkedTo;
  return `<!-- reqord:feedback ${JSON.stringify(obj)} -->`;
}

export function upsertReqordComment(
  body: string,
  metadata: ReqordFeedbackComment,
): string {
  const comment = buildReqordComment(metadata);

  if (COMMENT_PATTERN.test(body)) {
    return body.replace(COMMENT_PATTERN, comment);
  }

  if (body.length === 0) return comment;
  return `${body}\n\n${comment}`;
}
