"use client";

interface Props {
  criteria: string[];
  onChange: (criteria: string[]) => void;
}

export function SuccessCriteriaEditor({ criteria, onChange }: Props) {
  function handleAdd() {
    onChange([...criteria, ""]);
  }

  function handleRemove(index: number) {
    onChange(criteria.filter((_, i) => i !== index));
  }

  function handleChange(index: number, value: string) {
    onChange(criteria.map((c, i) => (i === index ? value : c)));
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Success Criteria
      </label>
      {criteria.map((criterion, i) => (
        <div key={i} className="flex gap-2">
          <input
            type="text"
            value={criterion}
            onChange={(e) => handleChange(i, e.target.value)}
            placeholder={`Criterion ${i + 1}`}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={() => handleRemove(i)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={handleAdd}
        className="rounded-md border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-600 hover:border-gray-400 hover:text-gray-800"
      >
        + Add Criterion
      </button>
    </div>
  );
}
