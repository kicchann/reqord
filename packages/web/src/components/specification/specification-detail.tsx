import Link from "next/link";
import type { Specification } from "@reqord/shared";
import { StatusBadge } from "@/components/ui/badge";
import { MarkdownRenderer } from "@/components/requirement/markdown-renderer";

export function SpecificationDetail({
  specification,
  design,
  requirementTitle,
}: {
  specification: Specification;
  design: string | null;
  requirementTitle: string | null;
}) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-sm text-gray-500">
          <Link href="/specifications" className="hover:text-blue-600">
            Specifications
          </Link>
          {" / "}
          <span className="font-mono">{specification.id}</span>
        </p>
        <h1 className="mt-1 text-2xl font-bold font-mono">{specification.id}</h1>
      </div>

      {/* Badge */}
      <div className="flex flex-wrap gap-2">
        <StatusBadge status={specification.status} />
      </div>

      {/* Meta */}
      <div className="grid grid-cols-2 gap-4 rounded-lg border border-gray-200 bg-white p-4 text-sm sm:grid-cols-4">
        <div>
          <p className="text-gray-500">Requirement</p>
          <Link
            href={`/requirements/${specification.requirementId}`}
            className="font-mono text-blue-600 hover:underline"
          >
            {specification.requirementId}
          </Link>
          {requirementTitle && (
            <p className="mt-0.5 text-xs text-gray-500 truncate">{requirementTitle}</p>
          )}
        </div>
        <div>
          <p className="text-gray-500">Version</p>
          <p className="font-medium">{specification.version}</p>
        </div>
        <div>
          <p className="text-gray-500">Created</p>
          <p className="font-medium">
            {new Date(specification.createdAt).toLocaleDateString("ja-JP")}
          </p>
        </div>
        <div>
          <p className="text-gray-500">Updated</p>
          <p className="font-medium">
            {new Date(specification.updatedAt).toLocaleDateString("ja-JP")}
          </p>
        </div>
      </div>

      {/* Supplementary Files */}
      {specification.files.supplementary.length > 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">Supplementary Files</h2>
          <ul className="list-inside list-disc space-y-1 text-sm">
            {specification.files.supplementary.map((file) => (
              <li key={file} className="font-mono text-gray-600">{file}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Design (Markdown) */}
      {design ? (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">Design</h2>
          <MarkdownRenderer content={design} />
        </div>
      ) : null}
    </div>
  );
}
