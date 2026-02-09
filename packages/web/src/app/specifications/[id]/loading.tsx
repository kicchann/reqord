export default function Loading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-6 w-32 rounded bg-gray-200" />
      <div className="h-8 w-96 rounded bg-gray-200" />
      <div className="flex gap-2">
        <div className="h-6 w-16 rounded-full bg-gray-200" />
        <div className="h-6 w-16 rounded-full bg-gray-200" />
      </div>
      <div className="h-24 w-full rounded bg-gray-200" />
      <div className="h-48 w-full rounded bg-gray-200" />
    </div>
  );
}
