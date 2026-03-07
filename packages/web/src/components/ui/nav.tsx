"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/requirements", label: "Requirements" },
  { href: "/specifications", label: "Specifications" },
  { href: "/feedback", label: "Feedback" },
  { href: "/graph", label: "Graph" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="border-b border-warm-200 bg-warm-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/reqord-logo.svg" alt="Reqord" className="h-10" />
            </Link>
            <div className="flex gap-1">
              {NAV_ITEMS.map(({ href, label }) => {
                const isActive =
                  pathname === href || pathname.startsWith(href + "/");
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-warm-200 text-warm-900 font-semibold"
                        : "text-warm-700 hover:bg-warm-200/60 hover:text-warm-900"
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
