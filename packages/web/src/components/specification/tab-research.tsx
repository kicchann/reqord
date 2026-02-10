"use client";

import React from "react";
import { MarkdownRenderer } from "@/components/requirement/markdown-renderer";

export function TabResearch({ content }: { content: string | null }) {
  if (content === null) {
    return (
      <div className="py-8 text-center text-gray-500">
        Research document not available
      </div>
    );
  }

  return <MarkdownRenderer content={content} />;
}
