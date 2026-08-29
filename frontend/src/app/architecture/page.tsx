"use client";

import Navbar from "@/components/Navbar";
import React from "react";

export default function ArchitecturePage() {
  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 space-y-8 sm:space-y-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
              System Architecture
            </h1>
            <p className="text-sm text-neutral-500 leading-relaxed">
              How Audio Notes processes long audio recordings into structured summaries.
            </p>
          </div>
          <a
            href="https://github.com/Shoaib-Imrann/voice-notes"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-800 transition w-fit"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span>GitHub Repository</span>
          </a>
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
