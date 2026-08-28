"use client";

import type { StructuredSummary } from "@/types/note";
import { Check, Copy } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";

interface Props {
  summary?: StructuredSummary | string | null;
}

export default function SummaryViewer({ summary }: Props) {
  const [copied, setCopied] = useState(false);

  if (!summary) {
    return (
      <div className="flex flex-col h-full rounded-2xl border border-neutral-200 bg-white p-5 space-y-4 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-5 w-24 rounded-md bg-neutral-100" />
          <div className="h-7 w-7 rounded-lg bg-neutral-100" />
        </div>
        <div className="space-y-2.5 pt-2">
          <div className="h-3.5 w-full rounded-md bg-neutral-100" />
          <div className="h-3.5 w-[90%] rounded-md bg-neutral-100" />
          <div className="h-3.5 w-[75%] rounded-md bg-neutral-100" />
        </div>
        <div className="space-y-2 pt-2">
          <div className="h-4 w-28 rounded-md bg-neutral-100" />
          <div className="h-3.5 w-[85%] rounded-md bg-neutral-100" />
          <div className="h-3.5 w-[60%] rounded-md bg-neutral-100" />
        </div>
      </div>
    );
  }

  let structured: StructuredSummary = {};
  if (typeof summary === "string") {
    try {
      structured = JSON.parse(summary);
    } catch {
      structured = { executive_summary: summary };
    }
  } else {
    structured = summary;
  }

  const handleCopy = () => {
    const textToCopy = `
SUMMARY:
${structured.executive_summary || "N/A"}

TAKEAWAYS:
${structured.key_takeaways?.map((item) => `- ${item}`).join("\n") || "None"}

ACTION ITEMS:
${structured.action_items?.map((item) => `- ${item}`).join("\n") || "None"}
    `.trim();

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    toast.success("Summary copied");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full space-y-3.5 rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xs overflow-y-auto">
      {/* Clean Header Bar matching Transcript */}
      <div className="flex items-center justify-between shrink-0">
        <h3 className="text-lg font-bold text-neutral-900 tracking-tight">AI Summary</h3>

        <button
          type="button"
          onClick={handleCopy}
          className="rounded-lg border border-neutral-200 bg-neutral-50 p-1.5 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition cursor-pointer"
          title={copied ? "Copied" : "Copy summary"}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-600" />
          ) : (
            <Copy className="h-3.5 w-3.5 text-neutral-500" />
          )}
        </button>
      </div>

      {/* Scrollable Summary Body */}
      <div className="flex-1 space-y-3.5 overflow-y-auto pr-1">
        {/* Main Summary Text */}
        {structured.executive_summary && (
          <div className="rounded-xl bg-neutral-50/70 p-4 border border-neutral-100">
            <p className="text-xs sm:text-sm leading-relaxed text-neutral-800 font-sans">
              {structured.executive_summary}
            </p>
          </div>
        )}

        {/* Takeaways */}
        {structured.key_takeaways && structured.key_takeaways.length > 0 && (
          <div className="pt-1">
            <h4 className="text-xs font-bold text-neutral-900 mb-2.5 font-sans">Takeaways</h4>
            <ul className="space-y-3">
              {structured.key_takeaways.map((takeaway) => (
                <li
                  key={takeaway}
                  className="flex items-start gap-2.5 text-xs sm:text-sm text-neutral-700 leading-relaxed"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-900" />
                  <span>{takeaway}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Items */}
        {structured.action_items && structured.action_items.length > 0 && (
          <div className="pt-1">
            <h4 className="text-xs font-bold text-neutral-900 mb-2.5 font-sans">Action Items</h4>
            <ul className="space-y-3">
              {structured.action_items.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-xs sm:text-sm text-neutral-700 leading-relaxed"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-900" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Topic Pills at Bottom */}
      {structured.topics && structured.topics.length > 0 && (
        <div className="pt-2 border-t border-neutral-100 shrink-0">
          <div className="flex flex-wrap items-center gap-1.5">
            {structured.topics.map((topic) => (
              <span
                key={topic}
                className="rounded-lg border border-neutral-200/80 bg-neutral-50 px-2.5 py-1 text-xs font-medium text-neutral-700"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
