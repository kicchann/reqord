"use client";

import React from "react";
import { MarkdownRenderer } from "@/components/requirement/markdown-renderer";

export function TabDesign({ content }: { content: string | null }) {
  if (content === null) {
    return (
      <div className="py-8 text-center text-gray-500">
        Design document not available
      </div>
    );
  }

  return <MarkdownRenderer content={content} />;
}
