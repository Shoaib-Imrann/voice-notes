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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-red-200 bg-red-50/80 text-xs text-red-700 font-sans shadow-xs">
        <div className="flex items-start gap-2.5 min-w-0">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
          <div className="space-y-1 min-w-0">
            <span className="font-semibold text-red-900 block text-xs">Processing Failed</span>
            <p className="text-red-700 leading-relaxed break-words text-xs font-normal">
              {errorMessage || "An unexpected error occurred during audio processing."}
            </p>
          </div>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            disabled={isRetrying}
            className="flex items-center justify-center gap-1.5 shrink-0 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium text-xs transition cursor-pointer shadow-xs disabled:opacity-50"
          >
            {isRetrying ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" />
            )}
            <span>{hasTranscript ? "Retry Summary" : "Retry Transcription"}</span>
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
