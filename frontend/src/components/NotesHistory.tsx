"use client";

import type { AudioNote } from "@/types/note";
import { FileAudio, PanelLeftClose, Plus, Trash2 } from "lucide-react";
import React, { useMemo } from "react";

interface Props {
  notes: AudioNote[];
  selectedNoteId?: string;
  onSelectNote: (note: AudioNote) => void;
  onNewNote: () => void;
  onDeleteNote: (noteId: string, noteTitle?: string) => void;
  isLoading: boolean;
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
  onToggleSidebar,
}: Props) {
  // Group notes by relative time (Today, Yesterday, Previous 7 Days, Older)
  const groupedNotes = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;
    const sevenDaysAgo = today - 7 * 86400000;

    const groups: { [key: string]: AudioNote[] } = {
      Today: [],
      Yesterday: [],
      "Previous 7 Days": [],
      Older: [],
    };

    for (const note of notes) {
      const createdTime = new Date(note.created_at).getTime();
      if (createdTime >= today) {
        groups.Today.push(note);
      } else if (createdTime >= yesterday) {
        groups.Yesterday.push(note);
      } else if (createdTime >= sevenDaysAgo) {
        groups["Previous 7 Days"].push(note);
      } else {
        groups.Older.push(note);
      }
    }

    return groups;
  }, [notes]);

  const formatDuration = (secs?: number) => {
    if (!secs || secs <= 0) return "";
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

      {/* Notes List Grouped by Date */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2 py-3 space-y-4">
        {isLoading ? (
          <div className="space-y-2 px-1 animate-pulse">
            <div className="h-3 w-16 bg-neutral-800 rounded-md mb-2.5" />
            <div className="h-10 bg-neutral-800/60 rounded-xl w-full" />
            <div className="h-10 bg-neutral-800/60 rounded-xl w-full" />
            <div className="h-10 bg-neutral-800/60 rounded-xl w-full" />
          </div>
        ) : notes.length === 0 ? (
          <div className="py-8 text-center text-xs text-neutral-500">No recordings yet.</div>
        ) : (
          Object.entries(groupedNotes).map(([groupTitle, groupNotes]) => {
            if (groupNotes.length === 0) return null;

            return (
              <div key={groupTitle} className="space-y-1">
                <div className="px-2 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
                  {groupTitle}
                </div>
                {groupNotes.map((note) => {
                  const isSelected =
                    note.id === selectedNoteId || (note.slug && note.slug === selectedNoteId);
                  const duration = formatDuration(note.duration_seconds);

                  return (
                    <div
                      key={note.id}
                      onClick={() => onSelectNote(note)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          onSelectNote(note);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      className={`group flex items-center justify-between rounded-xl px-2.5 py-2 cursor-pointer transition text-xs ${
                        isSelected
                          ? "bg-neutral-800 text-white font-medium shadow-xs"
                          : "text-neutral-400 hover:bg-neutral-800/60 hover:text-neutral-200"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-1">
                        <FileAudio
                          className={`h-4 w-4 shrink-0 ${
                            isSelected
                              ? "text-white"
                              : "text-neutral-500 group-hover:text-neutral-300"
                          }`}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium leading-tight">{note.title}</p>
                          {duration && (
                            <span className="text-[10px] text-neutral-500 font-sans">
                              {duration}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteNote(note.id, note.title);
                        }}
                        className="opacity-0 group-hover:opacity-100 rounded-md p-1 text-neutral-400 hover:text-red-400 hover:bg-neutral-700/50 transition shrink-0"
                        title="Delete Note"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
