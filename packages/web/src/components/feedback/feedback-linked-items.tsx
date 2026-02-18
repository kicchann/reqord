import React from "react";
import Link from "next/link";
import type { FeedbackLinkedTo } from "@reqord/shared";

export function FeedbackLinkedItems({
  linkedTo,
  requirementTitles,
  specificationTitles,
}: {
  linkedTo: FeedbackLinkedTo;
  requirementTitles: Record<string, string>;
  specificationTitles: Record<string, string>;
}) {
  const hasAny =
    linkedTo.requirements.length > 0 ||
    linkedTo.createdRequirements.length > 0 ||
    linkedTo.specifications.length > 0 ||
    linkedTo.createdSpecifications.length > 0 ||
    (linkedTo.resolved &&
      (linkedTo.resolved.requirements.length > 0 ||
        linkedTo.resolved.specifications.length > 0));

  if (!hasAny) return null;

  return (
    <div className="flex flex-wrap gap-1" data-testid="feedback-linked-items">
      {linkedTo.requirements.map((id) => (
        <Link
          key={`req-${id}`}
          href={`/requirements/${id}`}
          className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700 hover:bg-blue-100"
          data-testid="linked-requirement"
        >
          {requirementTitles[id] ?? id}
        </Link>
      ))}
      {linkedTo.createdRequirements.map((id) => (
        <Link
          key={`created-req-${id}`}
          href={`/requirements/${id}`}
          className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700 hover:bg-green-100"
          data-testid="created-requirement"
        >
          {requirementTitles[id] ?? id}
          <span className="rounded bg-green-200 px-1 text-green-800">created</span>
        </Link>
      ))}
      {linkedTo.specifications.map((id) => (
        <Link
          key={`spec-${id}`}
          href={`/specifications/${id}`}
          className="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-xs text-purple-700 hover:bg-purple-100"
          data-testid="linked-specification"
        >
          {specificationTitles[id] ?? id}
        </Link>
      ))}
      {linkedTo.createdSpecifications.map((id) => (
        <Link
          key={`created-spec-${id}`}
          href={`/specifications/${id}`}
          className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 hover:bg-emerald-100"
          data-testid="created-specification"
        >
          {specificationTitles[id] ?? id}
          <span className="rounded bg-emerald-200 px-1 text-emerald-800">created</span>
        </Link>
      ))}
      {linkedTo.resolved?.requirements.map((id) => (
        <Link
          key={`resolved-req-${id}`}
          href={`/requirements/${id}`}
          className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-200"
          data-testid="resolved-requirement"
        >
          {requirementTitles[id] ?? id}
          <span className="rounded bg-gray-300 px-1 text-gray-700">resolved</span>
        </Link>
      ))}
      {linkedTo.resolved?.specifications.map((id) => (
        <Link
          key={`resolved-spec-${id}`}
          href={`/specifications/${id}`}
          className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-200"
          data-testid="resolved-specification"
        >
          {specificationTitles[id] ?? id}
          <span className="rounded bg-gray-300 px-1 text-gray-700">resolved</span>
        </Link>
      ))}
    </div>
  );
}
