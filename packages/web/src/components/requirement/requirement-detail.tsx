import Link from "next/link";
import type { Requirement, Specification } from "@reqord/shared";
import { StatusBadge, PriorityBadge, ComplexityBadge } from "@/components/ui/badge";
import { FlagList } from "@/components/flags/flag-list";
import { MarkdownRenderer } from "./markdown-renderer";
import { DeleteButton } from "./delete-button";

export function RequirementDetail({
  requirement,
  description,
  specifications = [],
}: {
  requirement: Requirement;
  description: string | null;
  specifications?: Specification[];
}) {
  const { dependencies } = requirement;
  const hasDeps =
    dependencies.blockedBy.length > 0 ||
    dependencies.blocks.length > 0 ||
    dependencies.relatedTo.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">
            <Link href="/requirements" className="hover:text-blue-600">
              Requirements
            </Link>
            {" / "}
            <span className="font-mono">{requirement.id}</span>
          </p>
          <h1 className="mt-1 text-2xl font-bold">{requirement.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/requirements/${requirement.id}/edit`}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Edit
          </Link>
          <DeleteButton id={requirement.id} />
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2">
        <StatusBadge status={requirement.status} />
        <PriorityBadge priority={requirement.priority} />
        {requirement.estimatedComplexity ? (
          <ComplexityBadge complexity={requirement.estimatedComplexity} />
        ) : null}
        {requirement.estimatedHours ? (
          <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
            {requirement.estimatedHours}h
          </span>
        ) : null}
      </div>

      {/* Meta */}
      <div className="grid grid-cols-2 gap-4 rounded-lg border border-gray-200 bg-white p-4 text-sm sm:grid-cols-4">
        <div>
          <p className="text-gray-500">Version</p>
          <p className="font-medium">{requirement.version}</p>
        </div>
        <div>
          <p className="text-gray-500">Format</p>
          <p className="font-medium">{requirement.format.type}</p>
        </div>
        <div>
          <p className="text-gray-500">Created</p>
          <p className="font-medium">
            {new Date(requirement.createdAt).toLocaleDateString("ja-JP")}
          </p>
        </div>
        <div>
          <p className="text-gray-500">Updated</p>
          <p className="font-medium">
            {new Date(requirement.updatedAt).toLocaleDateString("ja-JP")}
          </p>
        </div>
      </div>

      {/* Format Details */}
      {requirement.format.type === "user-story" ? (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">User Story</h2>
          <div className="space-y-1 text-sm">
            <p>
              <span className="font-medium text-gray-500">As a</span>{" "}
              {requirement.format.userStory.as}
            </p>
            <p>
              <span className="font-medium text-gray-500">I want</span>{" "}
              {requirement.format.userStory.iWant}
            </p>
            <p>
              <span className="font-medium text-gray-500">So that</span>{" "}
              {requirement.format.userStory.soThat}
            </p>
          </div>
        </div>
      ) : null}

      {requirement.format.type === "ears" ? (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">EARS Format</h2>
          <div className="space-y-1 text-sm">
            <p>
              <span className="font-medium text-gray-500">Type:</span>{" "}
              {requirement.format.ears.type}
            </p>
            {requirement.format.ears.trigger ? (
              <p>
                <span className="font-medium text-gray-500">Trigger:</span>{" "}
                {requirement.format.ears.trigger}
              </p>
            ) : null}
            {requirement.format.ears.condition ? (
              <p>
                <span className="font-medium text-gray-500">Condition:</span>{" "}
                {requirement.format.ears.condition}
              </p>
            ) : null}
            <p>
              <span className="font-medium text-gray-500">Action:</span>{" "}
              {requirement.format.ears.action}
            </p>
            {requirement.format.ears.response ? (
              <p>
                <span className="font-medium text-gray-500">Response:</span>{" "}
                {requirement.format.ears.response}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Success Criteria */}
      {requirement.successCriteria.length > 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">Success Criteria</h2>
          <ul className="list-inside list-disc space-y-1 text-sm">
            {requirement.successCriteria.map((criterion, i) => (
              <li key={i}>{criterion}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Flags */}
      {requirement.flags.length > 0 ? (
        <FlagList flags={requirement.flags} />
      ) : null}

      {/* Dependencies */}
      {hasDeps ? (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">Dependencies</h2>
          <div className="space-y-2 text-sm">
            {dependencies.blockedBy.length > 0 ? (
              <div>
                <span className="font-medium text-gray-500">Blocked by: </span>
                {dependencies.blockedBy.map((id) => (
                  <Link
                    key={id}
                    href={`/requirements/${id}`}
                    className="mr-2 font-mono text-blue-600 hover:underline"
                  >
                    {id}
                  </Link>
                ))}
              </div>
            ) : null}
            {dependencies.blocks.length > 0 ? (
              <div>
                <span className="font-medium text-gray-500">Blocks: </span>
                {dependencies.blocks.map((id) => (
                  <Link
                    key={id}
                    href={`/requirements/${id}`}
                    className="mr-2 font-mono text-blue-600 hover:underline"
                  >
                    {id}
                  </Link>
                ))}
              </div>
            ) : null}
            {dependencies.relatedTo.length > 0 ? (
              <div>
                <span className="font-medium text-gray-500">Related to: </span>
                {dependencies.relatedTo.map((id) => (
                  <Link
                    key={id}
                    href={`/requirements/${id}`}
                    className="mr-2 font-mono text-blue-600 hover:underline"
                  >
                    {id}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Specifications */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-gray-700">Specifications</h2>
        {specifications.length > 0 ? (
          <div className="space-y-1 text-sm">
            {specifications.map((spec) => (
              <div key={spec.id} className="flex items-center gap-2">
                <Link
                  href={`/specifications/${spec.id}`}
                  className="font-mono text-blue-600 hover:underline"
                >
                  {spec.id}
                </Link>
                <StatusBadge status={spec.status} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No specifications</p>
        )}
      </div>

      {/* Description (Markdown) */}
      {description ? (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">Description</h2>
          <MarkdownRenderer content={description} />
        </div>
      ) : null}
    </div>
  );
}
