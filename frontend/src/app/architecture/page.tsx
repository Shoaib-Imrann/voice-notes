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
                25s Slicing
              </h3>
              <p className="text-[11px] text-neutral-500 font-sans leading-relaxed">
                FFmpeg splits audio into 25-second WAV segments.
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
                Sends chunks to Gnani STT & stitches the transcript.
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
                Generates overview and key takeaways from transcript.
              </p>
            </div>

            <div className="rounded-xl border border-neutral-200/90 bg-neutral-50/50 p-3.5 space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                Step 6
              </span>
              <h3 className="text-xs font-semibold text-neutral-900">
                Cleanup
              </h3>
              <p className="text-[11px] text-neutral-500 font-sans leading-relaxed">
                Marks note completed & deletes temp files from disk.
              </p>
            </div>
          </div>
        </div>

        {/* Core Sections (Centered readable column) */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-8 text-sm text-neutral-600 leading-relaxed">
          {/* Section 2: Long Audio */}
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-neutral-900">
              Long-Audio Handling
            </h2>
            <p>
              To transcribe audio files longer than 25 seconds, the backend
              splits the audio into 25-second WAV segments using FFmpeg and
              PyDub.
            </p>
            <p>
              Each 25-second chunk is sent to Gnani STT one by one. The server
              then stitches all the returned text pieces together into one
              complete, formatted transcript.
            </p>
          </section>

          {/* Section 2: Sync vs Background */}
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-neutral-900">
              Sync vs. Background Work
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 text-neutral-600">
              <li>
                <strong className="text-neutral-900">Synchronous:</strong>{' '}
                Checks file format and duration (under 10 minutes), uploads the
                audio file to Supabase Storage, creates the database record, and
                immediately returns HTTP 201.
              </li>
              <li>
                <strong className="text-neutral-900">Background Tasks:</strong>{' '}
                A background worker handles the heavy operations: audio slicing,
                Gnani STT calls, Gemini AI summarization, and disk cleanup.
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
                details, transcripts, and AI summaries are saved in Supabase
                PostgreSQL.
              </li>
              <li>
                <strong className="text-neutral-900">Server Disk:</strong> Audio
                files are only stored temporarily on the server while actively
                processing, and deleted immediately after.
              </li>
            </ul>
          </section>

          {/* Section 4: Failure Handling */}
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-neutral-900">
              Failure Handling
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 text-neutral-600">
              <li>
                <strong className="text-neutral-900">
                  Client Disconnects:
                </strong>{' '}
                Processing runs server-side independently once uploaded,
                persisting state regardless of client network status.
              </li>
              <li>
                <strong className="text-neutral-900">Validation:</strong> Files
                over 10 minutes or corrupted audio are rejected immediately
                before database insertion.
              </li>
              <li>
                <strong className="text-neutral-900">Error Visibility:</strong>{' '}
                API timeouts or failures are captured and displayed with a Retry
                option.
              </li>
              <li>
                <strong className="text-neutral-900">Isolated Retry:</strong> If
                transcription succeeded but summarization failed, Retry only
                re-runs the LLM call.
              </li>
            </ul>
          </section>

          {/* Section 5: What I Would Improve */}
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-neutral-900">
              What I Would Improve
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 text-neutral-600">
              <li>
                <strong className="text-neutral-900">
                  Silence-Based Chunking:
                </strong>{' '}
                Split audio during natural breath pauses rather than fixed
                25-second intervals to prevent words from getting cut in half.
              </li>
              <li>
                <strong className="text-neutral-900">Semantic Search:</strong>{' '}
                Search past notes by meaning and topic (e.g. searching "pricing"
                finds notes discussing "costs and budget") rather than only
                exact keyword matches.
              </li>
              <li>
                <strong className="text-neutral-900">WebSockets:</strong>{' '}
                Replace 2-second HTTP polling with real-time push events for
                instant status updates.
              </li>
              <li>
                <strong className="text-neutral-900">
                  Task Queue (Celery + Redis):
                </strong>{' '}
                Move background processing to dedicated worker nodes for
                high-volume traffic.
              </li>
              <li>
                <strong className="text-neutral-900">
                  Indic Language Support:
                </strong>{' '}
                Add language selection so users can transcribe in Hindi,
                Kannada, Tamil, or Telugu using Gnani's multilingual models.
              </li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}
