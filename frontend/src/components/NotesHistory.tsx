'use client';

import {
  AlertTriangle,
  FileAudio,
  Loader2,
  PanelLeftClose,
  Plus,
  RotateCw,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { AudioNote } from '@/types/note';

interface Props {
  notes: AudioNote[];
  selectedNoteId?: string;
  onSelectNote: (note: AudioNote) => void;
  onNewNote: () => void;
  onDeleteNote: (noteId: string, noteTitle?: string) => void;
  isLoading: boolean;
  isError?: boolean;
  onRefresh: () => void;
  onToggleSidebar?: () => void;
}

export default function NotesHistory({
  notes,
  selectedNoteId,
  onSelectNote,
  onNewNote,
  onDeleteNote,
  isLoading = false,
  isError = false,
  onRefresh,
  onToggleSidebar,
}: Props) {
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    top: number;
    left: number;
  } | null>(null);

  // Set of note IDs that have been opened / seen by the user
  const [seenNoteIds, setSeenNoteIds] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('seen_audio_note_ids');
        if (stored) {
          return new Set(JSON.parse(stored));
        }
      } catch {}
    }
    return new Set();
  });

  // On first session visit, mark all existing completed notes as already seen so they don't show unread dots
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('seen_audio_note_ids');
      if (!stored && notes.length > 0) {
        const initialCompletedIds = notes
          .filter((n) => n.status === 'COMPLETED')
          .map((n) => n.id);
        const newSet = new Set(initialCompletedIds);
        setSeenNoteIds(newSet);
        localStorage.setItem(
          'seen_audio_note_ids',
          JSON.stringify(Array.from(newSet))
        );
      }
    } catch {}
  }, [notes]);

  // Mark the currently active selected note as seen
  useEffect(() => {
    if (!selectedNoteId) return;
    const activeNote = notes.find(
      (n) => n.id === selectedNoteId || (n.slug && n.slug === selectedNoteId)
    );
    if (activeNote && activeNote.status === 'COMPLETED') {
      setSeenNoteIds((prev) => {
        if (!prev.has(activeNote.id)) {
          const next = new Set(prev);
          next.add(activeNote.id);
          try {
            localStorage.setItem(
              'seen_audio_note_ids',
              JSON.stringify(Array.from(next))
            );
          } catch {}
          return next;
        }
        return prev;
      });
    }
  }, [selectedNoteId, notes]);

  const markNoteAsSeenAndSelect = (note: AudioNote) => {
    if (note.status === 'COMPLETED') {
      setSeenNoteIds((prev) => {
        const next = new Set(prev);
        next.add(note.id);
        try {
          localStorage.setItem(
            'seen_audio_note_ids',
            JSON.stringify(Array.from(next))
          );
        } catch {}
        return next;
      });
    }
    onSelectNote(note);
  };

  // Close popover when clicking anywhere outside or scrolling
  useEffect(() => {
    const handleGlobalClick = () => {
      setDeleteTarget(null);
    };
    if (deleteTarget) {
      window.addEventListener('click', handleGlobalClick);
      window.addEventListener('scroll', handleGlobalClick, true);
    }
    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('scroll', handleGlobalClick, true);
    };
  }, [deleteTarget]);

  // Sort notes descending by created_at (newest on top)
  const sortedNotes = useMemo(() => {
    return [...notes].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [notes]);

  const formatDuration = (secs?: number) => {
    if (!secs || secs <= 0) return '';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#171717] text-neutral-200 select-none">
      {/* Clean Single-Word Header */}
      <div className="p-3 border-b border-neutral-800/80 flex items-center justify-between shrink-0">
        <span className="font-semibold text-sm text-neutral-200 tracking-tight pl-1">
          Voice Notes
        </span>

        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white transition cursor-pointer"
            title="Close sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* New Note Button */}
      <div className="p-3 pb-2 shrink-0">
        <button
          type="button"
          onClick={onNewNote}
          className="flex w-full items-center gap-2 rounded-xl border border-neutral-700/60 bg-neutral-800/70 px-3 py-2.5 text-xs font-medium text-white shadow-xs transition hover:bg-neutral-700/80 cursor-pointer"
        >
          <Plus className="h-4 w-4 text-neutral-300" />
          <span>New Note</span>
        </button>
      </div>

      {/* Notes List Sorted Descending */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2 py-2 space-y-1">
        {isLoading ? (
          <div className="space-y-2 px-1 animate-pulse">
            <div className="h-10 bg-neutral-800/60 rounded-xl w-full" />
            <div className="h-10 bg-neutral-800/60 rounded-xl w-full" />
            <div className="h-10 bg-neutral-800/60 rounded-xl w-full" />
          </div>
        ) : isError ? (
          <div className="mx-1 my-3 p-3 rounded-xl border border-red-500/30 bg-red-950/20 text-center space-y-2">
            <div className="flex items-center justify-center gap-1.5 text-red-400 text-xs font-semibold">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>Server Offline</span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-tight">
              Backend is unreachable or starting up.
            </p>
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium transition cursor-pointer border border-neutral-700"
            >
              <RotateCw className="h-3 w-3" />
              <span>Retry</span>
            </button>
          </div>
        ) : sortedNotes.length === 0 ? (
          <div className="py-8 text-center text-xs text-neutral-500">
            No recordings yet.
          </div>
        ) : (
          sortedNotes.map((note) => {
            const isSelected =
              note.id === selectedNoteId ||
              (note.slug && note.slug === selectedNoteId);
            const duration = formatDuration(note.duration_seconds);

            return (
              <div
                key={note.id}
                onClick={() => markNoteAsSeenAndSelect(note)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    markNoteAsSeenAndSelect(note);
                  }
                }}
                role="button"
                tabIndex={0}
                className={`group flex items-center justify-between rounded-xl px-2.5 py-2 cursor-pointer transition text-xs ${
                  isSelected
                    ? 'bg-neutral-800 text-white font-medium shadow-xs'
                    : 'text-neutral-400 hover:bg-neutral-800/60 hover:text-neutral-200'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-1">
                  <FileAudio
                    className={`h-4 w-4 shrink-0 ${
                      isSelected
                        ? 'text-white'
                        : 'text-neutral-500 group-hover:text-neutral-300'
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium leading-tight">
                      {note.title}
                    </p>
                    {duration && (
                      <span className="text-[10px] text-neutral-500 font-sans">
                        {duration}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right End: Status Indicator (Loader on processing, Blue dot on unread complete, Red dot on fail) & Sliding Delete Icon on Hover */}
                <div className="relative flex items-center justify-center w-6 h-6 shrink-0">
                  {/* Status Indicator (visible by default, fades out smoothly on hover) */}
                  <div
                    className={`flex items-center justify-center transition-all duration-200 ${
                      deleteTarget?.id === note.id
                        ? 'opacity-0 scale-75 pointer-events-none'
                        : 'opacity-100 group-hover:opacity-0 group-hover:scale-75'
                    }`}
                  >
                    {note.status === 'FAILED' ? (
                      <span
                        className="inline-flex h-2 w-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]"
                        title="Processing failed — click to retry"
                      />
                    ) : note.status === 'COMPLETED' ? (
                      !seenNoteIds.has(note.id) && !isSelected ? (
                        <span
                          className="inline-flex h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.6)]"
                          title="New: Processing completed! Click to view."
                        />
                      ) : null
                    ) : (
                      <span
                        title={
                          note.status === 'PROCESSING_ASR'
                            ? 'Transcribing audio...'
                            : note.status === 'PROCESSING_LLM'
                              ? 'Generating AI summary...'
                              : 'Processing in background...'
                        }
                        className="flex items-center justify-center"
                      >
                        <Loader2 className="h-3 w-3 text-neutral-300 animate-spin" />
                      </span>
                    )}
                  </div>

                  {/* Delete Button (slides in from right on hover) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (deleteTarget?.id === note.id) {
                        setDeleteTarget(null);
                      } else {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setDeleteTarget({
                          id: note.id,
                          top: rect.top + rect.height / 2,
                          left: rect.right + 12,
                        });
                      }
                    }}
                    className={`absolute inset-0 m-auto flex items-center justify-center rounded-md p-1 transition-all duration-200 cursor-pointer ${
                      deleteTarget?.id === note.id
                        ? 'opacity-100 translate-x-0 text-red-400 bg-neutral-700/70'
                        : 'opacity-0 translate-x-1.5 group-hover:opacity-100 group-hover:translate-x-0 text-neutral-400 hover:text-red-400 hover:bg-neutral-700/50'
                    }`}
                    title="Delete Note"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Speech Bubble Popover Outside the Sidebar */}
      {deleteTarget && (
        <div
          style={{
            top: `${deleteTarget.top}px`,
            left: `${deleteTarget.left}px`,
          }}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          role="presentation"
          className="fixed -translate-y-1/2 z-50 w-44 rounded-xl border border-neutral-700 bg-[#222222] p-2.5 shadow-2xl space-y-2 text-left animate-in fade-in zoom-in-95 duration-100 select-none"
        >
          {/* Pointer arrow pointing LEFT towards the sidebar trash button */}
          <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 h-3 w-3 rotate-45 border-l border-b border-neutral-700 bg-[#222222]" />

          <p className="relative z-10 text-[11px] font-medium text-neutral-200 leading-tight">
            Delete this note?
          </p>
          <div className="relative z-10 flex items-center justify-end gap-1.5 pt-0.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTarget(null);
              }}
              className="px-2 py-1 text-[10px] font-medium text-neutral-400 hover:text-white rounded-md hover:bg-neutral-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteNote(deleteTarget.id);
                setDeleteTarget(null);
              }}
              className="px-2.5 py-1 text-[10px] font-semibold bg-red-600 hover:bg-red-700 text-white rounded-md transition shadow-xs cursor-pointer"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
