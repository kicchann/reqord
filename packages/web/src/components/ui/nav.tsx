import Link from "next/link";

export function Nav() {
  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/requirements" className="text-lg font-bold text-gray-900">
              Reqord
            </Link>
            <div className="flex gap-4">
              <Link
                href="/dashboard"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Dashboard
              </Link>
              <Link
                href="/requirements"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Requirements
              </Link>
              <Link
                href="/specifications"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Specifications
              </Link>
              <Link
                href="/feedback"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Feedback
              </Link>
              <Link
                href="/graph"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Graph
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
