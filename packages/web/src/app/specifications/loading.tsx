export default function Loading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 w-48 rounded bg-gray-200" />
      {/* Filter bar skeleton */}
      <div className="flex gap-3">
        <div className="h-10 w-64 rounded-md bg-gray-200" />
        <div className="h-10 w-32 rounded-md bg-gray-200" />
      </div>
      {/* Table skeleton */}
      <div className="overflow-hidden rounded-lg border border-gray-200">
        {/* Table header skeleton */}
        <div className="flex gap-4 border-b-2 border-gray-200 bg-gray-50 px-4 py-3">
          <div className="h-4 w-16 rounded bg-gray-300" />
          <div className="h-4 w-48 rounded bg-gray-300" />
          <div className="h-4 w-32 rounded bg-gray-300" />
          <div className="h-4 w-20 rounded bg-gray-300" />
          <div className="h-4 w-16 rounded bg-gray-300" />
          <div className="h-4 w-24 rounded bg-gray-300" />
        </div>
        {/* Table rows skeleton */}
        <div className="divide-y divide-gray-200">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="flex gap-4 px-4 py-3.5">
              <div className="h-4 w-24 rounded bg-gray-200" />
              <div className="h-4 w-64 rounded bg-gray-200" />
              <div className="h-4 w-32 rounded bg-gray-200" />
              <div className="h-5 w-20 rounded-full bg-gray-200" />
              <div className="h-4 w-12 rounded bg-gray-200" />
              <div className="h-4 w-20 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
