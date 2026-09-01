'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, PanelLeftOpen, Plus, RotateCw } from 'lucide-react';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import AudioPlayer from '@/components/AudioPlayer';
import Navbar from '@/components/Navbar';
import NewNoteHero from '@/components/NewNoteHero';
import NotesHistory from '@/components/NotesHistory';
import ProcessingStatusBadge from '@/components/ProcessingStatusBadge';
import SummaryViewer from '@/components/SummaryViewer';
import TranscriptViewer from '@/components/TranscriptViewer';
import { apiClient } from '@/lib/axios';
import type { AudioNote } from '@/types/note';

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
            <div className="h-5 w-28 rounded-md bg-neutral-100" />
            <div className="h-7 w-7 rounded-lg bg-neutral-100" />
          </div>
          <div className="space-y-2.5 pt-2">
            <div className="h-3.5 w-full rounded-md bg-neutral-100" />
            <div className="h-3.5 w-[96%] rounded-md bg-neutral-100" />
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
  const params = useParams();
  const searchParams = useSearchParams();
  const routeSlug = typeof params?.slug === 'string' ? params.slug : undefined;
  const urlSlugOrId =
    routeSlug ||
    searchParams.get('slug') ||
    searchParams.get('note') ||
    searchParams.get('noteId') ||
    undefined;

  const [isMounted, setIsMounted] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string | undefined>(
    urlSlugOrId
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const notifiedStatusRef = useRef<Record<string, string>>({});

  // Sync state when URL params or slug change (e.g. browser back/forward navigation)
  useEffect(() => {
    if (urlSlugOrId !== undefined) {
      setSelectedNoteId(urlSlugOrId);
    }
  }, [urlSlugOrId]);

  // Handle client mount hydration, localStorage fallback, and mobile initial state
  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      setIsSidebarOpen(false);
    }
    if (!urlSlugOrId && typeof window !== 'undefined') {
      const storedSlugOrId =
        localStorage.getItem('lastSelectedNoteSlug') ||
        localStorage.getItem('lastSelectedNoteId');
      if (storedSlugOrId) {
        setSelectedNoteId(storedSlugOrId);
        const newUrl = `/notes/${storedSlugOrId}`;
        window.history.replaceState(null, '', newUrl);
      }
    }
  }, [urlSlugOrId]);

  // Lock background touch and scrolling on mobile when sidebar is open
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (isSidebarOpen && window.innerWidth < 640) {
        document.body.style.overflow = 'hidden';
        document.body.style.touchAction = 'none';
      } else {
        document.body.style.overflow = '';
        document.body.style.touchAction = '';
      }
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [isSidebarOpen]);

  // Query past notes list
  const {
    data: notes = [],
    isLoading: isLoadingNotes,
    isError: isErrorNotes,
    refetch: refetchNotes,
  } = useQuery<AudioNote[]>({
    queryKey: ['notes'],
    queryFn: async () => {
      const res = await apiClient.get<AudioNote[]>('/notes');
      return res.data;
    },
  });

  // Query selected note details with real-time polling while processing
  const {
    data: selectedNote,
    isLoading: isLoadingSelectedNote,
    isError: isErrorSelectedNote,
    error: selectedNoteError,
    refetch: refetchSelectedNote,
  } = useQuery<AudioNote>({
    queryKey: ['note', selectedNoteId],
    queryFn: async () => {
      if (!selectedNoteId) return null as any;
      const res = await apiClient.get<AudioNote>(`/notes/${selectedNoteId}`);
      return res.data;
    },
    enabled: !!selectedNoteId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status && status !== 'COMPLETED' && status !== 'FAILED') {
        return 2000; // Poll every 2 seconds while processing ASR/LLM
      }
      return false;
    },
  });

  // Helper to update selectedNoteId and sync with localStorage and clean URL path
  const updateSelectedNoteId = (noteOrIdentifier?: AudioNote | string) => {
    let identifier: string | undefined;
    if (typeof noteOrIdentifier === 'string') {
      identifier = noteOrIdentifier;
    } else if (noteOrIdentifier) {
      identifier = noteOrIdentifier.slug || noteOrIdentifier.id;
    }

    setSelectedNoteId(identifier);
    if (typeof window !== 'undefined') {
      if (identifier) {
        localStorage.setItem('lastSelectedNoteSlug', identifier);
        const newUrl = `/notes/${identifier}`;
        window.history.pushState(null, '', newUrl);
      } else {
        localStorage.removeItem('lastSelectedNoteSlug');
        localStorage.removeItem('lastSelectedNoteId');
        window.history.pushState(null, '', '/');
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

      if (currentStatus === 'COMPLETED') {
        toast.success('AI Summarization completed successfully!');
        queryClient.invalidateQueries({ queryKey: ['notes'] });
      } else if (currentStatus === 'FAILED') {
        toast.error(
          `Processing failed: ${selectedNote.error_message || 'Unknown error'}`
        );
        queryClient.invalidateQueries({ queryKey: ['notes'] });
      }
    }
  }, [selectedNote, queryClient]);

  const [noteToDelete, setNoteToDelete] = useState<{
    id: string;
    title?: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleUploadSuccess = (newNote: AudioNote) => {
    updateSelectedNoteId(newNote);
    queryClient.invalidateQueries({ queryKey: ['notes'] });
  };

  const handleNewNote = () => {
    updateSelectedNoteId(undefined);
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await apiClient.delete(`/notes/${noteId}`);
      toast.success('Note deleted');

      if (
        selectedNote?.id === noteId ||
        selectedNote?.slug === selectedNoteId ||
        selectedNoteId === noteId
      ) {
        updateSelectedNoteId(undefined);
      }

      queryClient.invalidateQueries({ queryKey: ['notes'] });
    } catch (_err) {
      toast.error('Failed to delete note');
    }
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
      toast.success('Note deleted');

      if (
        selectedNote?.id === noteId ||
        selectedNote?.slug === selectedNoteId ||
        selectedNoteId === noteId
      ) {
        updateSelectedNoteId(undefined);
      }

      queryClient.invalidateQueries({ queryKey: ['notes'] });
      setNoteToDelete(null);
    } catch (_err) {
      toast.error('Failed to delete note');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRetryNote = async (noteId: string) => {
    setIsRetrying(true);
    try {
      await apiClient.post(`/notes/${noteId}/retry`);
      toast.success('Retrying note processing...');
      queryClient.invalidateQueries({ queryKey: ['note', selectedNoteId] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to retry note';
      toast.error(msg);
    } finally {
      setIsRetrying(false);
    }
  };

  // Audio stream URL resolver
  const getAudioFullUrl = (urlPath: string) => {
    if (!urlPath) return '';
    if (urlPath.startsWith('http')) return urlPath;
    const base =
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
    return `${base.replace(/\/api\/v1\/?$/, '')}${urlPath}`;
  };

  const activeNote = selectedNote;

  return (
    <div className="flex h-[100dvh] w-full max-w-full overflow-hidden bg-white text-neutral-900 font-sans">
      {/* Sidebar: Full Desktop / Off-Canvas Mobile Drawer */}
      <aside
        className={`h-[100dvh] max-h-[100dvh] border-r border-neutral-800/80 bg-[#171717] transition-all duration-200 z-30 shrink-0 ${
          isSidebarOpen
            ? 'fixed inset-y-0 left-0 w-80 max-w-[85vw] sm:static sm:w-64 sm:max-w-none shadow-2xl sm:shadow-none'
            : 'hidden sm:flex sm:w-14'
        }`}
      >
        {isSidebarOpen ? (
          <div className="w-80 max-w-[85vw] sm:w-64 sm:max-w-none h-full flex flex-col overflow-hidden">
            <NotesHistory
              notes={notes}
              selectedNoteId={selectedNote?.id || selectedNoteId}
              onSelectNote={(note) => {
                updateSelectedNoteId(note);
                if (typeof window !== 'undefined' && window.innerWidth < 640) {
                  setIsSidebarOpen(false);
                }
              }}
              onNewNote={() => {
                handleNewNote();
                if (typeof window !== 'undefined' && window.innerWidth < 640) {
                  setIsSidebarOpen(false);
                }
              }}
              onDeleteNote={handleDeleteNote}
              isLoading={isLoadingNotes}
              isError={isErrorNotes}
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
            if (e.key === 'Escape') setIsSidebarOpen(false);
          }}
          role="button"
          tabIndex={0}
          aria-label="Close sidebar backdrop"
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-20 sm:hidden transition-opacity cursor-pointer touch-none"
        />
      )}

      {/* Main Content Workspace */}
      <div className="relative flex flex-1 flex-col h-full max-h-[100dvh] overflow-hidden min-w-0">
        {/* Top Navbar with Notes/Architecture Switcher, Mobile Sidebar Toggle, and GitHub */}
        <Navbar
          showNavSwitcher={true}
          onToggleSidebar={() => setIsSidebarOpen(true)}
          isSidebarOpen={isSidebarOpen}
        />

        <main className="flex-1 min-h-0 overflow-y-auto bg-white flex flex-col">
          {selectedNoteId && isLoadingSelectedNote ? (
            /* Skeleton Loading state while fetching selected note */
            <NoteWorkspaceSkeleton />
          ) : selectedNoteId && isErrorSelectedNote ? (
            /* Explicit HTTP Error Code vs Server Down Screen */
            (() => {
              const status = (
                selectedNoteError as {
                  response?: { status?: number; data?: { detail?: string } };
                }
              )?.response?.status;
              const detail = (
                selectedNoteError as {
                  response?: { data?: { detail?: string } };
                }
              )?.response?.data?.detail;

              let title = 'Server Offline or Unreachable';
              let description =
                'Could not connect to the backend server. The service might be starting up (cold start) or offline.';
              let is404 = false;

              if (status === 404) {
                is404 = true;
                title = 'HTTP 404 — Note Not Found';
                description =
                  detail ||
                  'This audio note does not exist or has been deleted.';
              } else if (status === 400) {
                title = 'HTTP 400 — Invalid Request';
                description = detail || 'The requested operation was invalid.';
              } else if (status === 429) {
                title = 'HTTP 429 — Rate Limit Exceeded';
                description =
                  detail ||
                  'Too many requests. Please wait a moment before trying again.';
              } else if (status === 502) {
                title = 'HTTP 502 — Bad Gateway';
                description =
                  'The backend service is currently restarting or unavailable.';
              } else if (status === 503) {
                title = 'HTTP 503 — Service Unavailable';
                description =
                  detail || 'The backend service is temporarily unavailable.';
              } else if (status === 504) {
                title = 'HTTP 504 — Gateway Timeout';
                description =
                  'The server took too long to respond. It may be restarting.';
              } else if (status === 500) {
                title = 'HTTP 500 — Internal Server Error';
                description =
                  detail || 'An unexpected error occurred on the server.';
              }

              return (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                  <div
                    className={`max-w-md w-full p-6 rounded-2xl border space-y-3 ${
                      is404
                        ? 'border-neutral-200 bg-neutral-50/60'
                        : 'border-red-200 bg-red-50/40'
                    }`}
                  >
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-full mx-auto ${
                        is404
                          ? 'bg-neutral-100 text-neutral-600'
                          : 'bg-red-100 text-red-600'
                      }`}
                    >
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <h2 className="text-base font-semibold text-neutral-900">
                      {title}
                    </h2>
                    <p className="text-xs text-neutral-500 leading-relaxed font-sans">
                      {description}
                    </p>
                    <div className="flex items-center justify-center gap-2 pt-2">
                      {is404 ? (
                        <button
                          type="button"
                          onClick={handleNewNote}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Create New Note</span>
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              refetchSelectedNote();
                              refetchNotes();
                            }}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition cursor-pointer"
                          >
                            <RotateCw className="h-3 w-3" />
                            <span>Retry Connection</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleNewNote}
                            className="px-4 py-2 text-xs font-medium bg-white border border-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-50 transition cursor-pointer"
                          >
                            New Note
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()
          ) : !isMounted && !selectedNoteId ? (
            /* Initial skeleton loading state until client mount */
            <NoteWorkspaceSkeleton />
          ) : !activeNote ? (
            /* Empty Hero Upload State */
            <NewNoteHero onUploadSuccess={handleUploadSuccess} />
          ) : (
            /* Active Selected Note View Workspace */
            <div className="flex-1 overflow-y-auto lg:overflow-hidden px-4 py-3 sm:p-6">
              <div className="h-full flex flex-col w-full max-w-[1600px] mx-auto space-y-4">
                {/* 2-Column Main Workspace Grid (Stacks on mobile, 2-column on desktop) */}
                <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                  {/* Left Column: Async Loader -> Audio File -> AI Summary */}
                  <div className="lg:col-span-7 flex flex-col space-y-4 lg:h-full lg:overflow-hidden pr-0 lg:pr-1">
                    {/* 1. Async Status Loader Badge (Only shown while processing or on error) */}
                    {activeNote.status !== 'COMPLETED' && (
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
                        onDelete={() =>
                          promptDeleteNote(activeNote.id, activeNote.title)
                        }
                      />
                    </div>

                    {/* 3. AI Summary - Generous height on mobile, full-height on desktop */}
                    <div className="min-h-[380px] lg:min-h-0 lg:flex-1 lg:h-full flex flex-col">
                      <SummaryViewer
                        summary={activeNote.summary}
                        status={activeNote.status}
                        errorMessage={activeNote.error_message}
                      />
                    </div>
                  </div>

                  {/* Right Column: Dedicated to Transcript - Increased height on mobile */}
                  <div className="lg:col-span-5 min-h-[540px] lg:min-h-0 lg:h-full flex flex-col">
                    <TranscriptViewer
                      transcript={activeNote.transcript}
                      status={activeNote.status}
                      errorMessage={activeNote.error_message}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Centered Delete Confirmation Dialog when deleting from inside the note */}
      {noteToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs transition-opacity select-none"
          onClick={() => !isDeleting && setNoteToDelete(null)}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && !isDeleting) setNoteToDelete(null);
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
              <h3 className="text-sm font-bold text-neutral-900">
                Delete note?
              </h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Are you sure you want to delete{' '}
                <span className="font-semibold text-neutral-800 break-words">
                  “{noteToDelete.title || 'this note'}”
                </span>
                ? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setNoteToDelete(null)}
                className="px-3 py-1.5 text-xs font-medium rounded-md border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeleteNote}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-md bg-red-600 hover:bg-red-700 text-white transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
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
