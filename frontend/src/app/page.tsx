"use client";

import AudioPlayer from "@/components/AudioPlayer";
import Navbar from "@/components/Navbar";
import NewNoteHero from "@/components/NewNoteHero";
import NotesHistory from "@/components/NotesHistory";
import ProcessingStatusBadge from "@/components/ProcessingStatusBadge";
import SummaryViewer from "@/components/SummaryViewer";
import TranscriptViewer from "@/components/TranscriptViewer";
import { apiClient } from "@/lib/axios";
import type { AudioNote } from "@/types/note";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PanelLeftOpen, Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import React, { Suspense, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

function NoteWorkspaceSkeleton() {
  return (
    <div className="h-full flex flex-col w-full max-w-[1600px] mx-auto px-6 py-4 space-y-4 overflow-hidden animate-pulse">
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-5 overflow-hidden items-stretch">
        {/* Left Column: Audio Player skeleton + Summary skeleton */}
        <div className="lg:col-span-7 flex flex-col space-y-4 h-full overflow-hidden pr-1">
          {/* Audio Player Skeleton */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-neutral-100" />
                <div className="space-y-1.5">
                  <div className="h-4 w-40 rounded-md bg-neutral-100" />
                  <div className="h-3 w-24 rounded-md bg-neutral-100" />
                </div>
              </div>
              <div className="h-8 w-8 rounded-lg bg-neutral-100" />
            </div>
            <div className="h-2 w-full rounded-full bg-neutral-100" />
          </div>

          {/* AI Summary Skeleton */}
          <div className="flex-1 rounded-2xl border border-neutral-200 bg-white p-5 space-y-4 flex flex-col">
            <div className="flex items-center justify-between">
              <div className="h-5 w-28 rounded-md bg-neutral-100" />
              <div className="h-7 w-7 rounded-lg bg-neutral-100" />
            </div>
            <div className="space-y-2.5 pt-2">
              <div className="h-3.5 w-full rounded-md bg-neutral-100" />
              <div className="h-3.5 w-[92%] rounded-md bg-neutral-100" />
              <div className="h-3.5 w-[85%] rounded-md bg-neutral-100" />
            </div>
            <div className="space-y-2 pt-3">
              <div className="h-4 w-32 rounded-md bg-neutral-100" />
              <div className="h-3.5 w-[75%] rounded-md bg-neutral-100" />
              <div className="h-3.5 w-[80%] rounded-md bg-neutral-100" />
            </div>
          </div>
        </div>

        {/* Right Column: Transcript Skeleton */}
        <div className="lg:col-span-5 h-full rounded-2xl border border-neutral-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-5 w-24 rounded-md bg-neutral-100" />
            <div className="h-7 w-7 rounded-lg bg-neutral-100" />
          </div>
          <div className="h-8 w-full rounded-xl bg-neutral-100" />
          <div className="space-y-2.5 pt-2">
            <div className="h-3.5 w-full rounded-md bg-neutral-100" />
            <div className="h-3.5 w-[95%] rounded-md bg-neutral-100" />
            <div className="h-3.5 w-[90%] rounded-md bg-neutral-100" />
            <div className="h-3.5 w-[88%] rounded-md bg-neutral-100" />
            <div className="h-3.5 w-[93%] rounded-md bg-neutral-100" />
            <div className="h-3.5 w-[70%] rounded-md bg-neutral-100" />
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const urlSlugOrId =
    searchParams.get("slug") || searchParams.get("note") || searchParams.get("noteId") || undefined;

  const [isMounted, setIsMounted] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string | undefined>(urlSlugOrId);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const notifiedStatusRef = useRef<Record<string, string>>({});

  // Sync state when URL searchParams slug/noteId changes (e.g. browser history navigation)
  useEffect(() => {
    if (urlSlugOrId !== undefined) {
      setSelectedNoteId(urlSlugOrId);
    }
  }, [urlSlugOrId]);

  // Handle client mount hydration, localStorage fallback, and mobile initial state
  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      setIsSidebarOpen(false);
    }
    if (!urlSlugOrId && typeof window !== "undefined") {
      const storedSlugOrId =
        localStorage.getItem("lastSelectedNoteSlug") || localStorage.getItem("lastSelectedNoteId");
      if (storedSlugOrId) {
        setSelectedNoteId(storedSlugOrId);
        const newUrl = `${window.location.pathname}?slug=${storedSlugOrId}`;
        window.history.replaceState(null, "", newUrl);
      }
    }
  }, [urlSlugOrId]);

  // Lock background touch and scrolling on mobile when sidebar is open
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (isSidebarOpen && window.innerWidth < 640) {
        document.body.style.overflow = "hidden";
        document.body.style.touchAction = "none";
      } else {
        document.body.style.overflow = "";
        document.body.style.touchAction = "";
      }
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    };
  }, [isSidebarOpen]);

  // Query past notes list
  const {
    data: notes = [],
    isLoading: isLoadingNotes,
    refetch: refetchNotes,
  } = useQuery<AudioNote[]>({
    queryKey: ["notes"],
    queryFn: async () => {
      const res = await apiClient.get<AudioNote[]>("/notes");
      return res.data;
    },
  });

  // Query selected note details with real-time polling while processing
  const { data: selectedNote, isLoading: isLoadingSelectedNote } = useQuery<AudioNote>({
    queryKey: ["note", selectedNoteId],
    queryFn: async () => {
      if (!selectedNoteId) return null as any;
      const res = await apiClient.get<AudioNote>(`/notes/${selectedNoteId}`);
      return res.data;
    },
    enabled: !!selectedNoteId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status && status !== "COMPLETED" && status !== "FAILED") {
        return 2000; // Poll every 2 seconds while processing ASR/LLM
      }
      return false;
    },
  });

  // Helper to update selectedNoteId and sync with localStorage and URL using slug
  const updateSelectedNoteId = (noteOrIdentifier?: AudioNote | string) => {
    let identifier: string | undefined;
    if (typeof noteOrIdentifier === "string") {
      identifier = noteOrIdentifier;
    } else if (noteOrIdentifier) {
      identifier = noteOrIdentifier.slug || noteOrIdentifier.id;
    }

    setSelectedNoteId(identifier);
    if (typeof window !== "undefined") {
      if (identifier) {
        localStorage.setItem("lastSelectedNoteSlug", identifier);
        const newUrl = `${window.location.pathname}?slug=${identifier}`;
        window.history.replaceState(null, "", newUrl);
      } else {
        localStorage.removeItem("lastSelectedNoteSlug");
        localStorage.removeItem("lastSelectedNoteId");
        window.history.replaceState(null, "", window.location.pathname);
      }
    }
  };

  // Toast notifications on processing state transition
  useEffect(() => {
    if (!selectedNote) return;
    const noteId = selectedNote.id;
    const currentStatus = selectedNote.status;

    if (!notifiedStatusRef.current[noteId]) {
      notifiedStatusRef.current[noteId] = currentStatus;
      return;
    }

    const prevStatus = notifiedStatusRef.current[noteId];
    if (prevStatus !== currentStatus) {
      notifiedStatusRef.current[noteId] = currentStatus;

      if (currentStatus === "COMPLETED") {
        toast.success("AI Summarization completed successfully!");
        queryClient.invalidateQueries({ queryKey: ["notes"] });
      } else if (currentStatus === "FAILED") {
        toast.error(`Processing failed: ${selectedNote.error_message || "Unknown error"}`);
        queryClient.invalidateQueries({ queryKey: ["notes"] });
      }
    }
  }, [selectedNote, queryClient]);

  const [noteToDelete, setNoteToDelete] = useState<{ id: string; title?: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleUploadSuccess = (newNote: AudioNote) => {
    updateSelectedNoteId(newNote);
    queryClient.invalidateQueries({ queryKey: ["notes"] });
  };

  const handleNewNote = () => {
    updateSelectedNoteId(undefined);
  };

  const promptDeleteNote = (noteId: string, noteTitle?: string) => {
    setNoteToDelete({ id: noteId, title: noteTitle });
  };

  const confirmDeleteNote = async () => {
    if (!noteToDelete) return;
    setIsDeleting(true);
    const noteId = noteToDelete.id;
    try {
      await apiClient.delete(`/notes/${noteId}`);
      toast.success("Note deleted");

      if (
        selectedNote?.id === noteId ||
        selectedNote?.slug === selectedNoteId ||
        selectedNoteId === noteId
      ) {
        updateSelectedNoteId(undefined);
      }

      queryClient.invalidateQueries({ queryKey: ["notes"] });
      setNoteToDelete(null);
    } catch (_err) {
      toast.error("Failed to delete note");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRetryNote = async (noteId: string) => {
    setIsRetrying(true);
    try {
      await apiClient.post(`/notes/${noteId}/retry`);
      toast.success("Retrying note processing...");
      queryClient.invalidateQueries({ queryKey: ["note", selectedNoteId] });
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Failed to retry note";
      toast.error(msg);
    } finally {
      setIsRetrying(false);
    }
  };

  // Audio stream URL resolver
  const getAudioFullUrl = (urlPath: string) => {
    if (!urlPath) return "";
    if (urlPath.startsWith("http")) return urlPath;
    const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
    return `${base.replace(/\/api\/v1\/?$/, "")}${urlPath}`;
  };

  const activeNote = selectedNote;

  return (
    <div className="flex h-[100dvh] w-full max-w-full overflow-hidden bg-white text-neutral-900 font-sans">
      {/* Sidebar: Full Desktop / Off-Canvas Mobile Drawer */}
      <aside
        className={`h-[100dvh] max-h-[100dvh] border-r border-neutral-800/80 bg-[#171717] transition-all duration-200 z-30 shrink-0 ${
          isSidebarOpen
            ? "fixed inset-y-0 left-0 w-80 max-w-[85vw] sm:static sm:w-64 sm:max-w-none shadow-2xl sm:shadow-none"
            : "hidden sm:flex sm:w-14"
        }`}
      >
        {isSidebarOpen ? (
          <div className="w-80 max-w-[85vw] sm:w-64 sm:max-w-none h-full flex flex-col overflow-hidden">
            <NotesHistory
              notes={notes}
              selectedNoteId={selectedNote?.id || selectedNoteId}
              onSelectNote={(note) => {
                updateSelectedNoteId(note);
                if (typeof window !== "undefined" && window.innerWidth < 640) {
                  setIsSidebarOpen(false);
                }
              }}
              onNewNote={() => {
                handleNewNote();
                if (typeof window !== "undefined" && window.innerWidth < 640) {
                  setIsSidebarOpen(false);
                }
              }}
              onDeleteNote={promptDeleteNote}
              isLoading={isLoadingNotes}
              onRefresh={refetchNotes}
              onToggleSidebar={() => setIsSidebarOpen(false)}
            />
          </div>
        ) : (
          /* Collapsed Mini Rail */
          <div className="w-14 h-full flex flex-col items-center py-3 space-y-3 shrink-0 select-none">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-800 hover:text-white transition cursor-pointer"
              title="Open sidebar"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleNewNote}
              className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-800 hover:text-white transition cursor-pointer"
              title="New note"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        )}
      </aside>

      {/* Mobile Drawer Backdrop Overlay */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setIsSidebarOpen(false);
          }}
          role="button"
          tabIndex={0}
          aria-label="Close sidebar backdrop"
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-20 sm:hidden transition-opacity cursor-pointer touch-none"
        />
      )}

      {/* Main Content Workspace */}
      <div className="relative flex flex-1 flex-col h-full max-h-[100dvh] overflow-hidden min-w-0">
        {/* Floating Sidebar Toggle Button on mobile only when active note is displayed and sidebar is closed */}
        {activeNote && !isSidebarOpen && (
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="sm:hidden absolute top-3.5 left-3.5 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 backdrop-blur-xs border border-neutral-200 shadow-xs text-neutral-700 hover:text-neutral-900 transition cursor-pointer"
            title="Open sidebar"
            aria-label="Open sidebar"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        )}

        {/* Minimal Nav Switcher only on empty hero state */}
        {!activeNote && (
          <Navbar
            showNavSwitcher={true}
            onToggleSidebar={() => setIsSidebarOpen(true)}
            isSidebarOpen={isSidebarOpen}
          />
        )}

        <main className="flex-1 min-h-0 overflow-y-auto bg-white flex flex-col">
          {selectedNoteId && isLoadingSelectedNote ? (
            /* Skeleton Loading state while fetching selected note */
            <NoteWorkspaceSkeleton />
          ) : !isMounted && !selectedNoteId ? (
            /* Initial skeleton loading state until client mount */
            <NoteWorkspaceSkeleton />
          ) : !activeNote ? (
            /* Empty Hero Upload State */
            <NewNoteHero onUploadSuccess={handleUploadSuccess} />
          ) : (
            /* Active Selected Note View Workspace */
            <div className="flex-1 overflow-y-auto lg:overflow-hidden px-4 pt-14 pb-6 sm:p-6">
              <div className="h-full flex flex-col w-full max-w-[1600px] mx-auto space-y-4">
                {/* 2-Column Main Workspace Grid (Stacks on mobile, 2-column on desktop) */}
                <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                  {/* Left Column: Async Loader -> Audio File -> AI Summary */}
                  <div className="lg:col-span-7 flex flex-col space-y-4 lg:h-full lg:overflow-hidden pr-0 lg:pr-1">
                    {/* 1. Async Status Loader Badge (Only shown while processing or on error) */}
                    {activeNote.status !== "COMPLETED" && (
                      <div className="shrink-0">
                        <ProcessingStatusBadge
                          status={activeNote.status}
                          errorMessage={activeNote.error_message}
                          hasTranscript={!!activeNote.transcript}
                          onRetry={() => handleRetryNote(activeNote.id)}
                          isRetrying={isRetrying}
                        />
                      </div>
                    )}

                    {/* 2. Audio File Player */}
                    <div className="shrink-0">
                      <AudioPlayer
                        audioUrl={getAudioFullUrl(activeNote.file_url)}
                        title={activeNote.title}
                        createdAt={activeNote.created_at}
                        fileSizeBytes={activeNote.file_size_bytes}
                        onDelete={() => promptDeleteNote(activeNote.id, activeNote.title)}
                      />
                    </div>

                    {/* 3. AI Summary - Generous height on mobile, full-height on desktop */}
                    <div className="min-h-[380px] lg:min-h-0 lg:flex-1 lg:h-full flex flex-col">
                      <SummaryViewer summary={activeNote.summary} />
                    </div>
                  </div>

                  {/* Right Column: Dedicated to Transcript - Increased height on mobile */}
                  <div className="lg:col-span-5 min-h-[540px] lg:min-h-0 lg:h-full flex flex-col">
                    <TranscriptViewer transcript={activeNote.transcript} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Delete Confirmation Modal */}
      {noteToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs transition-opacity select-none"
          onClick={() => !isDeleting && setNoteToDelete(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape" && !isDeleting) setNoteToDelete(null);
          }}
          role="button"
          tabIndex={0}
          aria-label="Close delete modal"
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl space-y-4 cursor-default"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-neutral-900">Delete note?</h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-neutral-800 break-words">
                  “{noteToDelete.title || "this note"}”
                </span>
                ? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setNoteToDelete(null)}
                className="px-3.5 py-1.5 text-xs font-medium rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeleteNote}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<NoteWorkspaceSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
