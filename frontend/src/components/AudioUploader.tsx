"use client";

import { apiClient } from "@/lib/axios";
import type { AudioNote } from "@/types/note";
import { AlertTriangle, FileAudio, Loader2, UploadCloud, X } from "lucide-react";
import type React from "react";
import { useRef, useState } from "react";
import { toast } from "sonner";

interface Props {
  onUploadSuccess: (note: AudioNote) => void;
}

export default function AudioUploader({ onUploadSuccess }: Props) {
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
      setErrorMessage("The selected file is empty (0 bytes).");
      toast.error("Corrupted or empty file");
      setSelectedFile(null);
      setTitle("");
      return;
    }

    if (file.size > maxSizeBytes) {
      setErrorMessage(
        `File size (${(file.size / (1024 * 1024)).toFixed(
          1,
        )}MB) exceeds the maximum limit of 15MB.`,
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
        timeout: 180000,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
          }
        },
      });

      onUploadSuccess(response.data);
      setSelectedFile(null);
      setTitle("");
      setUploadProgress(0);
    } catch (err: any) {
      console.error("Upload error:", err);
      const msg = err.response?.data?.detail || err.message || "Failed to upload audio file.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-2xs">
      <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
        <div>
          <h2 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
            New Upload
          </h2>
          <p className="text-[11px] text-neutral-500">Transcribe audio via Gnani STT & Gemini</p>
        </div>
      </div>

      {errorMessage && (
        <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50/50 p-2.5 text-xs text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-red-900">Upload Failed</span>
            <p className="mt-0.5 font-sans text-[11px] text-red-600 truncate">{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-400 hover:text-red-700"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {!selectedFile ? (
        <button
          type="button"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="mt-3 flex w-full flex-col items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-neutral-50/50 p-5 text-center transition hover:border-neutral-400 hover:bg-neutral-100/50 cursor-pointer"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac,.aac,.webm"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          />
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-neutral-200 text-neutral-700 mb-2">
            <UploadCloud className="h-4 w-4" />
          </div>
          <p className="text-xs font-semibold text-neutral-800">Click or drag audio file here</p>
          <p className="mt-0.5 text-[11px] text-neutral-500">
            MP3, WAV, M4A, OGG, WEBM, AAC, FLAC
          </p>
          <p className="text-[10px] text-neutral-400 font-sans mt-0.5">
            Max 10 mins • 15MB
          </p>
        </button>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 p-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-neutral-900 text-white">
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
                className="rounded-md p-1 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div>
            <label
              htmlFor="note-title-input"
              className="block text-[11px] font-medium text-neutral-600 mb-1"
            >
              Title
            </label>
            <div className="relative">
              <input
                id="note-title-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Audio note title..."
                maxLength={40}
                disabled={isUploading}
                className="w-full rounded-lg border border-neutral-300 px-2.5 py-1.5 pr-12 text-xs focus:border-neutral-900 focus:outline-none disabled:bg-neutral-100"
              />
              <span className="absolute right-2.5 top-2 text-[10px] text-neutral-400 font-sans pointer-events-none">
                {title.length}/40
              </span>
            </div>
          </div>

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

          <button
            type="button"
            onClick={handleUpload}
            disabled={isUploading}
            className="flex w-full items-center justify-center gap-1.5 rounded-md bg-neutral-900 py-2 text-xs font-semibold text-white shadow-2xs transition hover:bg-neutral-800 disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Uploading ({uploadProgress}%)...</span>
              </>
            ) : (
              <span>Process Audio</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
