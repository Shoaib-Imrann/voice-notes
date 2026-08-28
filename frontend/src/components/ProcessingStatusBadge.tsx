"use client";

import type { NoteStatus } from "@/types/note";
import { AlertCircle, Loader2, RotateCcw } from "lucide-react";
import React from "react";

interface Props {
  status: NoteStatus;
  errorMessage?: string | null;
  hasTranscript?: boolean;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export default function ProcessingStatusBadge({
  status,
  errorMessage,
  hasTranscript,
  onRetry,
  isRetrying,
}: Props) {
  if (status === "COMPLETED") {
    return null;
  }

  if (status === "FAILED") {
    return (
      <div className="flex items-center justify-between gap-3 py-1.5 px-1 text-xs text-red-600 font-sans select-none">
        <div className="flex items-center gap-2 min-w-0">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
          <span className="truncate">{errorMessage || "Processing failed."}</span>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            disabled={isRetrying}
            className="flex items-center gap-1.5 shrink-0 text-xs font-medium text-neutral-900 hover:text-neutral-600 disabled:opacity-50 transition cursor-pointer"
          >
            {isRetrying ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" />
            )}
            <span>{hasTranscript ? "Retry summary" : "Retry"}</span>
          </button>
        )}
      </div>
    );
  }

  const getStatusText = () => {
    switch (status) {
      case "UPLOADED":
        return "Audio uploaded";
      case "PROCESSING_ASR":
        return "Transcribing audio with Gnani Vachana STT v3...";
      case "PROCESSING_LLM":
      case "SUMMARIZING":
        return "Summarizing with Gemini 3.6 Flash...";
      default:
        return "Processing...";
    }
  };

  return (
    <div className="flex items-center gap-2.5 py-1.5 px-1 text-xs text-neutral-500 font-sans select-none">
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neutral-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-neutral-700" />
      </span>
      <span>{getStatusText()}</span>
    </div>
  );
}
