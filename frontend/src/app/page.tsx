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
import { Loader2, PanelLeftOpen, Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import React, { useState, useEffect, useRef, Suspense } from "react";
import { toast } from "sonner";

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

  // Handle client mount hydration and localStorage fallback
  useEffect(() => {
    setIsMounted(true);
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

  // Handle toast notifications upon status transitions
  useEffect(() => {
    if (!selectedNote || !selectedNote.id) return;

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

  const handleUploadSuccess = (newNote: AudioNote) => {
    updateSelectedNoteId(newNote);
    queryClient.invalidateQueries({ queryKey: ["notes"] });
  };

  const handleNewNote = () => {
    updateSelectedNoteId(undefined);
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await apiClient.delete(`/notes/${noteId}`);
      toast.success("Note deleted");

      queryClient.removeQueries({ queryKey: ["note", noteId] });
      await queryClient.invalidateQueries({ queryKey: ["notes"] });

      if (selectedNoteId === noteId || (selectedNote && selectedNote.id === noteId)) {
        updateSelectedNoteId(undefined);
      }
    } catch {
      toast.error("Failed to delete note");
    }
  };

  const handleRetryNote = async (noteId: string) => {
    setIsRetrying(true);
    try {
      const res = await apiClient.post<AudioNote>(`/notes/${noteId}/retry`);
      toast.info(
        res.data.transcript ? "Retrying Gemini AI summarization..." : "Retrying note processing...",
      );
      await queryClient.invalidateQueries({ queryKey: ["note", selectedNoteId] });
      await queryClient.invalidateQueries({ queryKey: ["notes"] });
    } catch {
      toast.error("Failed to retry note processing");
    } finally {
      setIsRetrying(false);
    }
  };

  const getAudioFullUrl = (url: string) => {
    if (url.startsWith("http")) return url;
    const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    return `${base}${url}`;
  };

  const activeNote = selectedNoteId ? selectedNote : null;

  return (
    <div className="flex h-screen overflow-hidden bg-white text-neutral-900 font-sans">
      {/* ChatGPT Style Collapsible Left Sidebar (Fullscreen on Mobile, 280px or 56px Rail on Desktop) */}
      <aside
        className={`h-full bg-[#171717] border-r border-neutral-800 transition-all duration-200 ease-in-out shrink-0 overflow-hidden ${
          isSidebarOpen
            ? "fixed inset-0 z-40 w-full sm:static sm:w-72 opacity-100"
            : "w-0 sm:w-14 opacity-100"
        }`}
      >
        {isSidebarOpen ? (
          <div className="w-full sm:w-72 h-full">
            <NotesHistory
              notes={notes}
              selectedNoteId={selectedNoteId}
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
              onDeleteNote={handleDeleteNote}
              isLoading={isLoadingNotes}
              onRefresh={refetchNotes}
              onToggleSidebar={() => setIsSidebarOpen(false)}
            />
          </div>
        ) : (
          /* ChatGPT-Style Collapsed Mini Rail */
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

      {/* Main Content Workspace */}
      <div className="relative flex flex-1 flex-col overflow-hidden min-w-0">
        <Navbar showNavSwitcher={!activeNote} />

        <main className="flex-1 overflow-y-auto bg-white">
          {selectedNoteId && isLoadingSelectedNote ? (
            /* Quiet Loading state while fetching selected note */
            <div className="h-full w-full flex items-center justify-center bg-white">
              <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
            </div>
          ) : !isMounted && !selectedNoteId ? (
            /* Initial quiet loading state until client mount checks localStorage */
            <div className="h-full w-full flex items-center justify-center bg-white">
              <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
            </div>
          ) : !activeNote ? (
            /* Centered ChatGPT-style Empty Hero Upload State */
            <NewNoteHero onUploadSuccess={handleUploadSuccess} />
          ) : (
            /* Active Selected Note View Workspace */
            <div className="h-full flex flex-col w-full max-w-[1600px] mx-auto px-6 py-4 space-y-4 overflow-hidden">
              {/* 2-Column Main Workspace Grid (Takes remaining viewport height) */}
              <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-5 overflow-hidden items-stretch">
                {/* Left Column: Async Loader -> Audio File -> AI Summary */}
                <div className="lg:col-span-7 flex flex-col space-y-4 h-full overflow-hidden pr-1">
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
                      onDelete={() => handleDeleteNote(activeNote.id)}
                    />
                  </div>

                  {/* 3. AI Summary (Fills remaining height so bottom border aligns with Transcript) */}
                  <div className="flex-1 min-h-0">
                    <SummaryViewer summary={activeNote.summary} />
                  </div>
                </div>

                {/* Right Column: Completely Dedicated to Transcript (Fits full height) */}
                <div className="lg:col-span-5 h-full overflow-hidden">
                  <TranscriptViewer transcript={activeNote.transcript} />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen flex items-center justify-center bg-white">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
