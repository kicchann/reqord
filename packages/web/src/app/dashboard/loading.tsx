export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* Health Score Skeleton */}
      <div className="h-48 animate-pulse rounded-lg border border-gray-200 bg-gray-100"></div>

      {/* Progress Section Skeleton */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="h-32 animate-pulse rounded-lg border border-gray-200 bg-gray-100"></div>
        <div className="h-32 animate-pulse rounded-lg border border-gray-200 bg-gray-100"></div>
        <div className="h-32 animate-pulse rounded-lg border border-gray-200 bg-gray-100"></div>
      </div>

      {/* Status Cards Skeleton */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="h-48 animate-pulse rounded-lg border border-gray-200 bg-gray-100"></div>
        <div className="h-48 animate-pulse rounded-lg border border-gray-200 bg-gray-100"></div>
      </div>
    </div>
  );
}
