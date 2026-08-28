import Navbar from "@/components/Navbar";
import React from "react";

export default function ArchitecturePage() {
  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12 space-y-10">
        {/* Header */}
        <div className="space-y-1.5 border-b border-neutral-100 pb-6">
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">System Architecture</h1>
          <p className="text-xs text-neutral-500 leading-relaxed max-w-xl">
            Technical documentation for the Audio Notes platform. Covers upload pipeline, 25s audio
            chunking, storage strategy, async workers, and error resilience.
          </p>
        </div>

        {/* Minimal High-Level Pipeline Flow */}
        <div className="rounded-xl border border-neutral-200/70 bg-neutral-50/50 p-4 space-y-2">
          <p className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">
            Pipeline Architecture
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-neutral-700">
            <span className="bg-white border border-neutral-200 px-2.5 py-1 rounded-md shadow-2xs font-semibold">
              Next.js Frontend
            </span>
            <span className="text-neutral-300">&rarr;</span>
            <span className="bg-white border border-neutral-200 px-2.5 py-1 rounded-md shadow-2xs font-semibold">
              FastAPI Gateway
            </span>
            <span className="text-neutral-300">&rarr;</span>
            <span className="bg-white border border-neutral-200 px-2.5 py-1 rounded-md shadow-2xs font-semibold">
              25s Chunking Engine
            </span>
            <span className="text-neutral-300">&rarr;</span>
            <span className="bg-white border border-neutral-200 px-2.5 py-1 rounded-md shadow-2xs font-semibold">
              Gnani STT API
            </span>
            <span className="text-neutral-300">&rarr;</span>
            <span className="bg-white border border-neutral-200 px-2.5 py-1 rounded-md shadow-2xs font-semibold">
              Gemini LLM
            </span>
          </div>
        </div>

        {/* 1. Long-Audio Handling & Chunking Engine */}
        <section className="space-y-2.5">
          <h2 className="text-xs font-bold text-neutral-900 uppercase tracking-wider border-l-2 border-neutral-900 pl-3">
            1. Long-Audio Handling & Chunking Engine
          </h2>
          <div className="text-xs text-neutral-600 leading-relaxed space-y-2 font-sans pl-3">
            <p>
              Gnani's STT Vachana v3 REST API (
              <code className="font-mono text-[11px] bg-neutral-100 px-1 py-0.5 rounded text-neutral-900">
                https://api.vachana.ai/stt/v3
              </code>
              ) enforces a duration limit per HTTP request (
              <code className="font-mono text-[11px] text-neutral-800">
                MAX_AUDIO_DURATION_EXCEEDED
              </code>
              ).
            </p>
            <p>To process audio recordings from 2 to 10 minutes:</p>
            <ul className="list-disc pl-4 space-y-1.5 text-neutral-600">
              <li>
                <strong className="text-neutral-900">25-Second Chunking:</strong> The backend splits
                recordings into 25-second WAV segments using{" "}
                <code className="font-mono text-[11px] bg-neutral-100 px-1 py-0.5 rounded">
                  pydub
                </code>{" "}
                and{" "}
                <code className="font-mono text-[11px] bg-neutral-100 px-1 py-0.5 rounded">
                  ffmpeg
                </code>
                .
              </li>
              <li>
                <strong className="text-neutral-900">Rate-Limit Backoff:</strong> Chunks are
                processed sequentially with a 0.4s safety delay and 3-attempt exponential backoff
                retry on HTTP 429 rate limits.
              </li>
              <li>
                <strong className="text-neutral-900">Transcript Reassembly:</strong> Segment outputs
                are concatenated into a unified transcript string before passing to Gemini LLM.
              </li>
            </ul>
          </div>
        </section>

        {/* 2. File Storage & Database */}
        <section className="space-y-2.5">
          <h2 className="text-xs font-bold text-neutral-900 uppercase tracking-wider border-l-2 border-neutral-900 pl-3">
            2. File Storage & Database
          </h2>
          <div className="text-xs text-neutral-600 leading-relaxed font-sans pl-3">
            <ul className="list-disc pl-4 space-y-1.5 text-neutral-600">
              <li>
                <strong className="text-neutral-900">Supabase PostgreSQL:</strong> Persists note
                metadata, status lifecycle (<code className="font-mono text-[11px]">UPLOADED</code>{" "}
                &rarr; <code className="font-mono text-[11px]">PROCESSING_ASR</code> &rarr;{" "}
                <code className="font-mono text-[11px]">PROCESSING_LLM</code> &rarr;{" "}
                <code className="font-mono text-[11px]">COMPLETED</code> /{" "}
                <code className="font-mono text-[11px]">FAILED</code>), transcripts, structured JSON
                summaries, and URL slugs (
                <code className="font-mono text-[11px]">?slug=title-07a3ce58</code>).
              </li>
              <li>
                <strong className="text-neutral-900">Supabase Storage:</strong> Stores uploaded
                audio files in the <code className="font-mono text-[11px]">audio-notes</code> bucket
                for stateless production deployments, falling back to local{" "}
                <code className="font-mono text-[11px]">uploads/</code> for offline development.
              </li>
            </ul>
          </div>
        </section>

        {/* 3. Synchronous vs. Asynchronous Execution */}
        <section className="space-y-2.5">
          <h2 className="text-xs font-bold text-neutral-900 uppercase tracking-wider border-l-2 border-neutral-900 pl-3">
            3. Synchronous vs. Asynchronous Execution
          </h2>
          <div className="text-xs text-neutral-600 leading-relaxed font-sans pl-3">
            <ul className="list-disc pl-4 space-y-1.5 text-neutral-600">
              <li>
                <strong className="text-neutral-900">
                  Sync Phase (
                  <code className="font-mono text-[11px]">POST /api/v1/notes/upload</code>):
                </strong>{" "}
                Validates file format (.mp3, .wav, .m4a, .ogg, .webm, .aac, .flac), max size (15MB),
                and corrupt file header integrity. Writes initial DB record (
                <code className="font-mono text-[11px]">status="UPLOADED"</code>) and returns HTTP
                201 Created immediately.
              </li>
              <li>
                <strong className="text-neutral-900">Async Phase (FastAPI BackgroundTasks):</strong>{" "}
                Dispatches <code className="font-mono text-[11px]">process_audio_note_task</code> to
                handle audio duration checks, chunking, Gnani ASR, and Gemini LLM summarization
                asynchronously.
              </li>
            </ul>
          </div>
        </section>

        {/* 4. Visible Failure & Error Resilience */}
        <section className="space-y-2.5">
          <h2 className="text-xs font-bold text-neutral-900 uppercase tracking-wider border-l-2 border-neutral-900 pl-3">
            4. Visible Failure & Error Resilience
          </h2>
          <div className="text-xs text-neutral-600 leading-relaxed font-sans pl-3">
            <ul className="list-disc pl-4 space-y-1.5 text-neutral-600">
              <li>
                <strong className="text-neutral-900">Corrupt Files:</strong> Decodes binary streams
                via <code className="font-mono text-[11px]">pydub</code>. Fails loudly with{" "}
                <code className="font-mono text-[11px]">
                  ValueError("Corrupted or unreadable audio file.")
                </code>{" "}
                and renders a visible red status line.
              </li>
              <li>
                <strong className="text-neutral-900">API Timeouts & Model Fallbacks:</strong>{" "}
                Catches <code className="font-mono text-[11px]">httpx.TimeoutException</code> with
                exponential retries. Fallback chain for Gemini LLM (
                <code className="font-mono text-[11px]">gemini-3.6-flash</code> &rarr;{" "}
                <code className="font-mono text-[11px]">gemini-2.5-flash-lite</code> &rarr;{" "}
                <code className="font-mono text-[11px]">gemini-2.5-pro</code>).
              </li>
              <li>
                <strong className="text-neutral-900">Smart Re-Summarization:</strong> If ASR
                completed but LLM failed, clicking{" "}
                <strong className="text-neutral-900">Retry</strong> skips ASR and re-executes only
                Gemini LLM summarization.
              </li>
            </ul>
          </div>
        </section>

        {/* 5. Proposed Future Improvements */}
        <section className="space-y-2.5">
          <h2 className="text-xs font-bold text-neutral-900 uppercase tracking-wider border-l-2 border-neutral-900 pl-3">
            5. Proposed Future Improvements
          </h2>
          <div className="text-xs text-neutral-600 leading-relaxed font-sans pl-3">
            <ul className="list-disc pl-4 space-y-1.5 text-neutral-600">
              <li>
                <strong className="text-neutral-900">WebSockets / SSE:</strong> Replace HTTP polling
                with push notifications for sub-second status updates.
              </li>
              <li>
                <strong className="text-neutral-900">Celery & Redis:</strong> Offload task
                processing to distributed worker nodes for high-concurrency workloads.
              </li>
              <li>
                <strong className="text-neutral-900">Indic Code-Switching:</strong> Add language
                selection dropdown for Gnani's Indic STT models (Hindi, Kannada, Tamil, Telugu,
                Marathi).
              </li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
