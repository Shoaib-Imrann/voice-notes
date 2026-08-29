"use client";

import { apiClient } from "@/lib/axios";
import type { AudioNote } from "@/types/note";
import { AlertTriangle, Bot, FileAudio, Loader2, Mic, UploadCloud, X } from "lucide-react";
import type React from "react";
import { useRef, useState } from "react";
import { toast } from "sonner";

interface Props {
  onUploadSuccess: (note: AudioNote) => void;
}

export default function NewNoteHero({ onUploadSuccess }: Props) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedExtensions = [".mp3", ".wav", ".m4a", ".ogg", ".flac", ".aac", ".webm"];
  const maxSizeBytes = 15 * 1024 * 1024; // 15MB limit

  const handleFileSelect = (file: File) => {
    setErrorMessage(null);
    const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;

    if (!allowedExtensions.includes(ext)) {
      setErrorMessage(`Unsupported format '${ext}'. Please upload MP3, WAV, M4A, OGG, or FLAC.`);
      toast.error("Unsupported file format");
      setSelectedFile(null);
      setTitle("");
      return;
    }

    if (file.size === 0) {
      setErrorMessage("Selected file is empty.");
      toast.error("Empty audio file");
      setSelectedFile(null);
      setTitle("");
      return;
    }

    if (file.size > maxSizeBytes) {
      setErrorMessage(
        `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds 15MB limit.`,
      );
      toast.error("File size exceeds 15MB limit");
      setSelectedFile(null);
      setTitle("");
      return;
    }

    // Inspect audio duration in browser before allowing selection
    const objectUrl = URL.createObjectURL(file);
    const tempAudio = new Audio(objectUrl);
    tempAudio.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      if (tempAudio.duration > 600) {
        // 10 minutes max
        const mins = Math.floor(tempAudio.duration / 60);
        const secs = Math.floor(tempAudio.duration % 60);
        setErrorMessage(
          `Audio duration (${mins}m ${secs}s) exceeds the maximum limit of 10 minutes.`,
        );
        toast.error("Audio exceeds 10-minute limit");
        setSelectedFile(null);
        setTitle("");
      } else {
        setSelectedFile(file);
        setTitle(file.name.replace(/\.[^/.]+$/, "").slice(0, 40));
      }
    };
    tempAudio.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setSelectedFile(file);
      setTitle(file.name.replace(/\.[^/.]+$/, "").slice(0, 40));
    };
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append("file", selectedFile);
    if (title.trim()) {
      formData.append("title", title.trim());
    }

    try {
      const response = await apiClient.post<AudioNote>("/notes/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
          }
        },
      });

      toast.success("Processing audio...");
      onUploadSuccess(response.data);
      setSelectedFile(null);
      setTitle("");
      setUploadProgress(0);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || "Upload failed.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-4 py-3 sm:py-6 overflow-hidden">
      <div className="w-full max-w-xl text-center space-y-4 sm:space-y-6 my-auto">
        {/* Minimal Hero Header */}
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
            Transcribe & Summarize
          </h1>

          {/* Minimal Feature Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 font-medium text-neutral-700 shadow-2xs">
              <Mic className="h-3.5 w-3.5 text-neutral-500" />
              Gnani Speech-to-Text
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 font-medium text-neutral-700 shadow-2xs">
              <Bot className="h-3.5 w-3.5 text-neutral-500" />
              Gemini AI Summary
            </span>
          </div>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mx-auto flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 text-left">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-red-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Single Clean Upload Container */}
        {!selectedFile ? (
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                fileInputRef.current?.click();
              }
            }}
            role="button"
            tabIndex={0}
            className="group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-300 bg-white p-6 sm:p-10 text-center transition hover:border-neutral-400 hover:bg-neutral-50/50 cursor-pointer shadow-xs"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac,.aac,.webm"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            />
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 group-hover:scale-105 transition-transform mb-3">
              <UploadCloud className="h-5 w-5 text-neutral-700" />
            </div>
            <p className="text-sm font-semibold text-neutral-900">
              Drop audio file here or <span className="underline">browse</span>
            </p>
            <p className="mt-1 text-xs text-neutral-400 font-sans">
              MP3, WAV, M4A, OGG, WEBM, AAC, FLAC
            </p>
            <p className="text-[11px] text-neutral-400 font-sans mt-0.5">
              Max 10 mins • 15MB
            </p>
          </div>
        ) : (
          <div className="text-left space-y-3.5">
            {/* Selected File */}
            <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 p-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-900 text-white">
                  <FileAudio className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-neutral-900 truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-[10px] text-neutral-500 font-sans">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              </div>
              {!isUploading && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setTitle("");
                  }}
                  className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Upload Progress (Above Title & Button) */}
            {isUploading && (
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-sans text-neutral-600">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className="h-full bg-neutral-900 transition-all duration-150"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Title Input & Process Audio Button Side-by-Side */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="relative flex-1 min-w-0">
                <input
                  id="hero-note-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Note title (optional)..."
                  maxLength={40}
                  disabled={isUploading}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 pr-14 text-xs focus:border-neutral-900 focus:outline-none disabled:bg-neutral-100"
                />
                <span className="absolute right-3 top-3 text-[10px] text-neutral-400 font-sans pointer-events-none">
                  {title.length}/40
                </span>
              </div>

              <button
                type="button"
                onClick={handleUpload}
                disabled={isUploading}
                className="flex items-center justify-center gap-2 rounded-xl bg-neutral-900 px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-neutral-800 disabled:opacity-50 cursor-pointer shrink-0"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <span>Process Audio</span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
