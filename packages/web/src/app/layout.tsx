import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reqord",
  description: "Requirements management UI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <Nav />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </body>
    </html>
  );
}
