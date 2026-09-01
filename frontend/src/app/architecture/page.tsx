'use client';

import { ArrowUpRight, Github } from 'lucide-react';
import Navbar from '@/components/Navbar';

export default function ArchitecturePage() {
  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 w-full py-8 sm:py-12 space-y-10 sm:space-y-12">
        {/* Header with Title and GitHub Button */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            Upload to Transcript Flow
          </h1>
          <a
            href="https://github.com/Shoaib-Imrann/voice-notes"
            target="_blank"
            rel="noopener noreferrer"
            className="h-9 px-2.5 sm:px-3.5 rounded-full flex items-center justify-center gap-1.5 bg-white border border-neutral-200/80 hover:bg-neutral-50 text-neutral-700 hover:text-neutral-900 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition shrink-0 ml-3 text-xs font-medium"
            title="GitHub Repository"
            aria-label="GitHub Repository"
          >
            <Github className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">GitHub</span>
            <ArrowUpRight className="hidden sm:inline h-3.5 w-3.5 text-neutral-400" />
          </a>
        </div>

        {/* 6 Flow Boxes (ONLY THIS SECTION HAS FULL WIDTH) */}
        <div className="w-full px-4 sm:px-8 lg:px-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 w-full">
            <div className="rounded-xl border border-neutral-200/90 bg-neutral-50/50 p-3.5 space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                Step 1
              </span>
              <h3 className="text-xs font-semibold text-neutral-900">
                Validation
              </h3>
              <p className="text-[11px] text-neutral-500 font-sans leading-relaxed">
                Checks format, size (&lt;15MB), and duration (&lt;10 min).
              </p>
            </div>

            <div className="rounded-xl border border-neutral-200/90 bg-neutral-50/50 p-3.5 space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                Step 2
              </span>
              <h3 className="text-xs font-semibold text-neutral-900">
                Storage & DB
              </h3>
              <p className="text-[11px] text-neutral-500 font-sans leading-relaxed">
                Uploads to Supabase Storage & saves row in PostgreSQL.
              </p>
            </div>

            <div className="rounded-xl border border-neutral-200/90 bg-neutral-50/50 p-3.5 space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                Step 3
              </span>
              <h3 className="text-xs font-semibold text-neutral-900">
                Speech Slicing
              </h3>
              <p className="text-[11px] text-neutral-500 font-sans leading-relaxed">
                Splits on natural pauses into 8–12s speech segments.
              </p>
            </div>

            <div className="rounded-xl border border-neutral-200/90 bg-neutral-50/50 p-3.5 space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                Step 4
              </span>
              <h3 className="text-xs font-semibold text-neutral-900">
                Gnani STT
              </h3>
              <p className="text-[11px] text-neutral-500 font-sans leading-relaxed">
                Transcribes chunks via Prisma ASR & stitches transcript.
              </p>
            </div>

            <div className="rounded-xl border border-neutral-200/90 bg-neutral-50/50 p-3.5 space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                Step 5
              </span>
              <h3 className="text-xs font-semibold text-neutral-900">
                Gemini AI
              </h3>
              <p className="text-[11px] text-neutral-500 font-sans leading-relaxed">
                Generates executive summary and key takeaways.
              </p>
            </div>

            <div className="rounded-xl border border-neutral-200/90 bg-neutral-50/50 p-3.5 space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                Step 6
              </span>
              <h3 className="text-xs font-semibold text-neutral-900">
                Memory Cleanup
              </h3>
              <p className="text-[11px] text-neutral-500 font-sans leading-relaxed">
                Purges RAM via gc.collect() & deletes temp files.
              </p>
            </div>
          </div>
        </div>

        {/* Core Sections (Centered readable column) */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-8 text-sm text-neutral-600 leading-relaxed">
          {/* Section 1: Long Audio & Silence-Aware Chunking */}
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-neutral-900">
              Silence-Aware Long-Audio Segmentation
            </h2>
            <p>
              Gnani STT&apos;s REST endpoint is optimized for short speech
              utterances and enforces a strict 30-second hard limit. To prevent
              cutting words midway and avoid API rejections, the backend uses{' '}
              <code className="text-xs bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-800 font-mono">
                pydub.silence.split_on_silence
              </code>{' '}
              to detect natural breath pauses (&gt; 350ms).
            </p>
            <p>
              Pauses are grouped into optimal{' '}
              <strong>8–12 second speech chunks</strong>, normalized to 16kHz
              16-bit Mono PCM. If continuous fast speech has no pauses, a hard
              10-second safety split prevents any chunk from exceeding limits.
              If any chunk returns empty text, an adaptive half-segment
              sub-chunk retry recovers 100% of the audio speech.
            </p>
          </section>

          {/* Section 2: Sync vs Background Work & Memory Optimization */}
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-neutral-900">
              Sync vs. Background Work & Memory Efficiency
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 text-neutral-600">
              <li>
                <strong className="text-neutral-900">Synchronous:</strong>{' '}
                Checks format, size (&lt;15MB), and duration (&lt;10 min),
                uploads to Supabase Storage, inserts the DB row, and returns
                HTTP 201 instantly.
              </li>
              <li>
                <strong className="text-neutral-900">Background Worker:</strong>{' '}
                Handles audio segmentation, sequential Gnani STT calls, Gemini
                LLM summarization, and disk cleanup.
              </li>
              <li>
                <strong className="text-neutral-900">RAM Management:</strong>{' '}
                Explicit garbage collection (
                <code className="text-xs bg-neutral-100 px-1 py-0.5 rounded font-mono">
                  gc.collect()
                </code>
                ) and immediate chunk WAV deletion keep Python memory below
                120MB, preventing Render Out-Of-Memory (512MB) restarts.
              </li>
            </ul>
          </section>

          {/* Section 3: Storage */}
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-neutral-900">
              Storage
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 text-neutral-600">
              <li>
                <strong className="text-neutral-900">Audio Files:</strong>{' '}
                Stored permanently in a public Supabase Storage bucket.
              </li>
              <li>
                <strong className="text-neutral-900">Database:</strong> Note
                metadata, status, transcripts, and AI summaries are saved in
                Supabase PostgreSQL with clean RESTful slug routing (
                <code className="text-xs bg-neutral-100 px-1 py-0.5 rounded font-mono">
                  /notes/:slug
                </code>
                ).
              </li>
              <li>
                <strong className="text-neutral-900">Server Disk:</strong> Audio
                files are only stored temporarily on ephemeral disk during
                active processing, and deleted immediately after.
              </li>
            </ul>
          </section>

          {/* Section 4: Failure & Crash Recovery */}
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-neutral-900">
              Failure Handling & Crash Recovery
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 text-neutral-600">
              <li>
                <strong className="text-neutral-900">
                  Startup Crash Recovery:
                </strong>{' '}
                FastAPI lifespan hooks scan the database on container reboot to
                rescue any tasks interrupted by server restarts, marking them as
                failed with an immediate Retry prompt.
              </li>
              <li>
                <strong className="text-neutral-900">
                  Rate-Limit Backoff:
                </strong>{' '}
                Handles Gnani HTTP 429 rate limits with exponential retry pauses
                without dropping the processing pipeline.
              </li>
              <li>
                <strong className="text-neutral-900">Isolated Retry:</strong> If
                transcription succeeded but summarization failed, clicking Retry
                skips ASR and only re-runs the Gemini LLM call.
              </li>
              <li>
                <strong className="text-neutral-900">
                  Client Disconnects:
                </strong>{' '}
                Processing runs server-side independently once uploaded,
                persisting state regardless of client network status.
              </li>
            </ul>
          </section>

          {/* Section 5: Future Improvements */}
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-neutral-900">
              Future Improvements
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 text-neutral-600">
              <li>
                <strong className="text-neutral-900">
                  Semantic Vector Search:
                </strong>{' '}
                Search past notes by concept (e.g. searching &quot;pricing&quot;
                finds notes discussing budget) using pgvector embeddings.
              </li>
              <li>
                <strong className="text-neutral-900">WebSockets / SSE:</strong>{' '}
                Replace 2-second HTTP polling with real-time push events for
                instant status updates.
              </li>
              <li>
                <strong className="text-neutral-900">
                  Task Queue (Celery + Redis):
                </strong>{' '}
                Move background processing to dedicated worker nodes for high
                traffic volume.
              </li>
              <li>
                <strong className="text-neutral-900">
                  Multilingual Indic Language Picker:
                </strong>{' '}
                Add an audio language selector to transcribe in Hindi, Kannada,
                Tamil, Telugu, or Marathi using Gnani&apos;s language models.
              </li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}
