"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { Requirement } from "@reqord/shared";
import { createRequirement, updateRequirement, type ActionResult } from "@/lib/actions";
import { SuccessCriteriaEditor } from "./success-criteria-editor";
import { DependencyEditor } from "./dependency-editor";
import { MarkdownEditor } from "./markdown-editor";

type Mode = "create" | "edit";

interface Props {
  mode: Mode;
  requirement?: Requirement;
  description?: string | null;
  allRequirements: Requirement[];
}

const INITIAL_STATE: ActionResult = { success: true };

export function RequirementForm({ mode, requirement, description, allRequirements }: Props) {
  const action = mode === "create" ? createRequirement : updateRequirement;
  const [state, formAction, isPending] = useActionState(
    async (_prev: ActionResult, formData: FormData) => action(formData),
    INITIAL_STATE,
  );

  const [title, setTitle] = useState(requirement?.title ?? "");
  const [status, setStatus] = useState<string>(requirement?.status ?? "draft");
  const [priority, setPriority] = useState<string>(requirement?.priority ?? "medium");
  const [formatType, setFormatType] = useState<string>(requirement?.format.type ?? "free-form");
  const [estimatedComplexity, setEstimatedComplexity] = useState(
    requirement?.estimatedComplexity ?? "",
  );
  const [estimatedHours, setEstimatedHours] = useState(
    requirement?.estimatedHours?.toString() ?? "",
  );
  const [successCriteria, setSuccessCriteria] = useState<string[]>(
    requirement?.successCriteria ?? [],
  );
  const [blockedBy, setBlockedBy] = useState<string[]>(
    requirement?.dependencies.blockedBy ?? [],
  );
  const [blocks, setBlocks] = useState<string[]>(
    requirement?.dependencies.blocks ?? [],
  );
  const [relatedTo, setRelatedTo] = useState<string[]>(
    requirement?.dependencies.relatedTo ?? [],
  );
  const [descriptionText, setDescriptionText] = useState(description ?? "");

  // User Story
  const [userStoryAs, setUserStoryAs] = useState(
    requirement?.format.type === "user-story" ? requirement.format.userStory.as : "",
  );
  const [userStoryIWant, setUserStoryIWant] = useState(
    requirement?.format.type === "user-story" ? requirement.format.userStory.iWant : "",
  );
  const [userStorySoThat, setUserStorySoThat] = useState(
    requirement?.format.type === "user-story" ? requirement.format.userStory.soThat : "",
  );

  // EARS
  const [earsType, setEarsType] = useState(
    requirement?.format.type === "ears" ? requirement.format.ears.type : "",
  );
  const [earsTrigger, setEarsTrigger] = useState(
    requirement?.format.type === "ears" ? (requirement.format.ears.trigger ?? "") : "",
  );
  const [earsCondition, setEarsCondition] = useState(
    requirement?.format.type === "ears" ? (requirement.format.ears.condition ?? "") : "",
  );
  const [earsAction, setEarsAction] = useState(
    requirement?.format.type === "ears" ? requirement.format.ears.action : "",
  );
  const [earsResponse, setEarsResponse] = useState(
    requirement?.format.type === "ears" ? (requirement.format.ears.response ?? "") : "",
  );

  const cancelHref = mode === "edit" ? `/requirements/${requirement!.id}` : "/requirements";

  return (
    <form action={formAction} className="space-y-6">
      {mode === "edit" ? <input type="hidden" name="id" value={requirement!.id} /> : null}

      {/* Hidden JSON fields */}
      <input type="hidden" name="successCriteria" value={JSON.stringify(successCriteria)} />
      <input type="hidden" name="blockedBy" value={JSON.stringify(blockedBy)} />
      <input type="hidden" name="blocks" value={JSON.stringify(blocks)} />
      <input type="hidden" name="relatedTo" value={JSON.stringify(relatedTo)} />
      <input type="hidden" name="description" value={descriptionText} />
      <input type="hidden" name="formatType" value={formatType} />

      {/* User Story hidden fields */}
      <input type="hidden" name="userStoryAs" value={userStoryAs} />
      <input type="hidden" name="userStoryIWant" value={userStoryIWant} />
      <input type="hidden" name="userStorySoThat" value={userStorySoThat} />

      {/* EARS hidden fields */}
      <input type="hidden" name="earsType" value={earsType} />
      <input type="hidden" name="earsTrigger" value={earsTrigger} />
      <input type="hidden" name="earsCondition" value={earsCondition} />
      <input type="hidden" name="earsAction" value={earsAction} />
      <input type="hidden" name="earsResponse" value={earsResponse} />

      {!state.success ? (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}

      {/* Breadcrumb */}
      <p className="text-sm text-gray-500">
        <Link href="/requirements" className="hover:text-blue-600">
          Requirements
        </Link>
        {mode === "edit" ? (
          <>
            {" / "}
            <Link href={`/requirements/${requirement!.id}`} className="hover:text-blue-600">
              {requirement!.id}
            </Link>
            {" / Edit"}
          </>
        ) : (
          " / New"
        )}
      </p>

      <h1 className="text-2xl font-bold">
        {mode === "create" ? "New Requirement" : `Edit ${requirement!.id}`}
      </h1>

      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Status + Priority + Complexity */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700">
            Status
          </label>
          <select
            id="status"
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm"
          >
            <option value="draft">Draft</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="deprecated">Deprecated</option>
          </select>
        </div>

        <div>
          <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
            Priority
          </label>
          <select
            id="priority"
            name="priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="estimatedComplexity"
            className="block text-sm font-medium text-gray-700"
          >
            Complexity
          </label>
          <select
            id="estimatedComplexity"
            name="estimatedComplexity"
            value={estimatedComplexity}
            onChange={(e) => setEstimatedComplexity(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm"
          >
            <option value="">-</option>
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
            <option value="xlarge">XLarge</option>
          </select>
        </div>
      </div>

      {/* Estimated Hours */}
      <div className="max-w-xs">
        <label htmlFor="estimatedHours" className="block text-sm font-medium text-gray-700">
          Estimated Hours
        </label>
        <input
          id="estimatedHours"
          name="estimatedHours"
          type="number"
          step="0.5"
          min="0"
          value={estimatedHours}
          onChange={(e) => setEstimatedHours(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Optional"
        />
      </div>

      {/* Format Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Format</label>
        <div className="mt-1 flex gap-4">
          {(["free-form", "user-story", "ears"] as const).map((ft) => (
            <label key={ft} className="flex items-center gap-1.5 text-sm">
              <input
                type="radio"
                name="_formatType"
                value={ft}
                checked={formatType === ft}
                onChange={() => setFormatType(ft)}
                className="border-gray-300"
              />
              {ft === "free-form" ? "Free Form" : ft === "user-story" ? "User Story" : "EARS"}
            </label>
          ))}
        </div>
      </div>

      {/* User Story Fields */}
      {formatType === "user-story" ? (
        <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h3 className="text-sm font-medium text-gray-700">User Story</h3>
          <div>
            <label className="block text-sm text-gray-600">As a</label>
            <input
              type="text"
              value={userStoryAs}
              onChange={(e) => setUserStoryAs(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600">I want</label>
            <input
              type="text"
              value={userStoryIWant}
              onChange={(e) => setUserStoryIWant(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600">So that</label>
            <input
              type="text"
              value={userStorySoThat}
              onChange={(e) => setUserStorySoThat(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
      ) : null}

      {/* EARS Fields */}
      {formatType === "ears" ? (
        <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h3 className="text-sm font-medium text-gray-700">EARS</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm text-gray-600">Type</label>
              <input
                type="text"
                value={earsType}
                onChange={(e) => setEarsType(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600">Trigger</label>
              <input
                type="text"
                value={earsTrigger}
                onChange={(e) => setEarsTrigger(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600">Condition</label>
              <input
                type="text"
                value={earsCondition}
                onChange={(e) => setEarsCondition(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600">Action</label>
              <input
                type="text"
                value={earsAction}
                onChange={(e) => setEarsAction(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm text-gray-600">Response</label>
              <input
                type="text"
                value={earsResponse}
                onChange={(e) => setEarsResponse(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="Optional"
              />
            </div>
          </div>
        </div>
      ) : null}

      {/* Success Criteria */}
      <SuccessCriteriaEditor criteria={successCriteria} onChange={setSuccessCriteria} />

      {/* Dependencies */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700">Dependencies</h3>
        <DependencyEditor
          label="Blocked By"
          selected={blockedBy}
          onChange={setBlockedBy}
          allRequirements={allRequirements}
          excludeId={requirement?.id}
        />
        <DependencyEditor
          label="Blocks"
          selected={blocks}
          onChange={setBlocks}
          allRequirements={allRequirements}
          excludeId={requirement?.id}
        />
        <DependencyEditor
          label="Related To"
          selected={relatedTo}
          onChange={setRelatedTo}
          allRequirements={allRequirements}
          excludeId={requirement?.id}
        />
      </div>

      {/* Description */}
      <MarkdownEditor value={descriptionText} onChange={setDescriptionText} />

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? "Saving..." : mode === "create" ? "Create" : "Save"}
        </button>
        <Link
          href={cancelHref}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
