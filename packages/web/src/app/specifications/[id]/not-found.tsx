import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <h2 className="text-2xl font-bold text-gray-900">Specification Not Found</h2>
      <p className="mt-2 text-gray-600">
        The specification you&apos;re looking for does not exist.
      </p>
      <Link
        href="/specifications"
        className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Back to Specifications
      </Link>
    </div>
  );
}
