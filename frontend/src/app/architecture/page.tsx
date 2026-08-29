"use client";

import Navbar from "@/components/Navbar";
import React from "react";

export default function ArchitecturePage() {
  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 space-y-8 sm:space-y-12">
        {/* Header */}
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            System Architecture
          </h1>
          <p className="text-sm text-neutral-500 leading-relaxed">
            How Audio Notes processes long audio recordings into structured summaries.
          </p>
        </div>

        {/* Minimal Pipeline Flow */}
        <div className="w-full overflow-x-auto rounded-xl bg-neutral-50 border border-neutral-100">
          <div className="flex items-center justify-between gap-2 text-[11px] sm:text-xs text-neutral-600 px-4 py-3 sm:py-4 min-w-max sm:min-w-full">
            <span className="font-medium text-neutral-900 whitespace-nowrap">Upload</span>
            <span className="text-neutral-300 shrink-0 select-none">&rarr;</span>
            <span className="font-medium text-neutral-900 whitespace-nowrap">25s Chunking</span>
            <span className="text-neutral-300 shrink-0 select-none">&rarr;</span>
            <span className="font-medium text-neutral-900 whitespace-nowrap">Gnani STT</span>
            <span className="text-neutral-300 shrink-0 select-none">&rarr;</span>
            <span className="font-medium text-neutral-900 whitespace-nowrap">Gemini LLM</span>
            <span className="text-neutral-300 shrink-0 select-none">&rarr;</span>
            <span className="font-medium text-neutral-900 whitespace-nowrap">Summary</span>
          </div>
        </div>

        {/* Core Sections */}
        <div className="space-y-10 text-sm text-neutral-600 leading-relaxed">
          {/* Section 1 */}
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-neutral-900">Long-Audio Chunking</h2>
            <p>
              Gnani’s speech-to-text API limits individual audio duration per request. To handle
              recordings up to 10 minutes, the backend slices audio into 25-second WAV segments
              using pydub and ffmpeg.
            </p>
            <p>
              Segments are processed sequentially with a brief safety delay and automatic retry on
              rate limits (HTTP 429), then combined into a single unified transcript.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-neutral-900">
              Synchronous vs. Background Execution
            </h2>
            <p>
              The system cleanly divides work between immediate HTTP responses and background
              processing:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-neutral-600">
              <li>
                <strong className="text-neutral-900">Synchronous:</strong> Validates file format and
                size, checks binary header integrity, saves the initial note record with a slug, and
                immediately returns HTTP 201 so the UI stays fast and responsive.
              </li>
              <li>
                <strong className="text-neutral-900">Background:</strong> FastAPI background tasks
                handle audio duration calculation, chunking, Gnani speech-to-text transcription, and
                Gemini structured summarization asynchronously.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-neutral-900">
              Failure Handling
            </h2>
            <p>
              The platform errors across every stage of the pipeline:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-neutral-600">
              <li>
                <strong className="text-neutral-900">Upload & Header Validation:</strong> Immediate HTTP 400 rejection for corrupted files, empty files, or unsupported formats before any processing starts.
              </li>
              <li>
                <strong className="text-neutral-900">Visible Error Badges:</strong> When external services fail (e.g. API timeouts, rate limits, or Cloudflare datacenter IP challenges), the exact failure message is rendered directly on the note card.
              </li>
              <li>
                <strong className="text-neutral-900">Retry Isolation:</strong> If LLM summarization fails after successful ASR transcription, the user can click "Retry Summary" to re-run only the summary without re-transcribing the audio.
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-neutral-900">
              Structured Summarization
            </h2>
            <p>
              Once transcription completes, Gemini analyzes the text and produces a clean JSON
              summary with an executive overview, key takeaways.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-neutral-900">Storage Strategy</h2>
            <p>
              Note metadata, transcripts, and summaries are persisted in Supabase PostgreSQL, while
              uploaded audio files are stored in Supabase Cloud Storage (with automatic fallback to local
              disk for offline development).
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-neutral-900">What I Would Improve</h2>
            <p>
              For a production deployment at scale, several key improvements would enhance speed and
              reliability:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-neutral-600">
              <li>
                <strong className="text-neutral-900">WebSockets / Server-Sent Events:</strong>{" "}
                Replace client-side HTTP polling with real-time push events for instant status
                updates.
              </li>
              <li>
                <strong className="text-neutral-900">Dedicated Task Queue (Celery + Redis):</strong>{" "}
                Offload background tasks from the API server to horizontal worker nodes for heavy
                concurrent audio workloads.
              </li>
              <li>
                <strong className="text-neutral-900">Parallel Chunk Transcription:</strong> Process
                independent audio chunks concurrently with controlled concurrency pools instead of
                strictly sequentially.
              </li>
              <li>
                <strong className="text-neutral-900">Indic Language Support:</strong> Add language
                selection to leverage Gnani’s multilingual Indic speech models (Hindi, Kannada,
                Tamil, Telugu).
              </li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}
