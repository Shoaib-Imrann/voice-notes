'use client';

import {
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';

interface Props {
  audioUrl: string;
  title: string;
  createdAt?: string;
  fileSizeBytes?: number;
  onDelete?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
  seekToTime?: number | null;
}

export default function AudioPlayer({
  audioUrl,
  title,
  createdAt,
  fileSizeBytes,
  onDelete,
  onTimeUpdate,
  seekToTime,
}: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  const rates = [1, 1.25, 1.5, 2];

  const formatTime = (secs: number) => {
    if (Number.isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formattedDate = createdAt
    ? new Date(createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  const formattedSize = fileSizeBytes
    ? `${(fileSizeBytes / (1024 * 1024)).toFixed(2)} MB`
    : null;

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const time = audioRef.current.currentTime;
      setCurrentTime(time);
      onTimeUpdate?.(time);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current && !Number.isNaN(audioRef.current.duration)) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number.parseFloat(e.target.value);
    setCurrentTime(val);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
    onTimeUpdate?.(val);
  };

  const skipSeconds = (secs: number) => {
    if (!audioRef.current) return;
    const target = Math.min(
      Math.max(0, audioRef.current.currentTime + secs),
      duration
    );
    audioRef.current.currentTime = target;
    setCurrentTime(target);
    onTimeUpdate?.(target);
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const cyclePlaybackRate = () => {
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  // Listen for seekToTime requests from transcript clicks
  useEffect(() => {
    if (seekToTime !== undefined && seekToTime !== null && audioRef.current) {
      audioRef.current.currentTime = seekToTime;
      setCurrentTime(seekToTime);
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [seekToTime]);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    if (audioRef.current) {
      audioRef.current.load();
    }
  }, [audioUrl]);

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5 shadow-2xs space-y-3">
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onCanPlayThrough={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      >
        <track kind="captions" />
      </audio>

      {/* --- DESKTOP LAYOUT (md: and above: Title on left, Controls on right) --- */}
      <div className="hidden md:flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-0.5">
          <h2 className="text-sm lg:text-base font-bold text-neutral-900 leading-snug break-words">
            {title}
          </h2>
          {(formattedDate || formattedSize) && (
            <p className="text-[11px] font-sans text-neutral-500">
              {formattedDate}
              {formattedDate && formattedSize && ' • '}
              {formattedSize}
            </p>
          )}
        </div>

        {/* Desktop Controls in same row */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={togglePlay}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-900 text-white shadow-xs transition hover:bg-neutral-800 cursor-pointer"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="h-3.5 w-3.5" />
            ) : (
              <Play className="h-3.5 w-3.5 ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => skipSeconds(-10)}
            className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition cursor-pointer"
            title="Rewind 10s"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => skipSeconds(10)}
            className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition cursor-pointer"
            title="Forward 10s"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={cyclePlaybackRate}
            className="rounded-lg border border-neutral-200 bg-neutral-50 px-1.5 py-1 text-[11px] font-sans font-semibold text-neutral-700 hover:bg-neutral-100 transition cursor-pointer"
            title="Cycle speed"
          >
            {playbackRate}x
          </button>

          <button
            type="button"
            onClick={toggleMute}
            className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition cursor-pointer"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <VolumeX className="h-3.5 w-3.5" />
            ) : (
              <Volume2 className="h-3.5 w-3.5" />
            )}
          </button>

          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 transition cursor-pointer shrink-0 ml-0.5"
              title="Delete Note"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* --- MOBILE LAYOUT: ROW 1 (Title + Delete on mobile) --- */}
      <div className="flex md:hidden items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-0.5">
          <h2 className="text-sm font-bold text-neutral-900 leading-snug break-words">
            {title}
          </h2>
          {(formattedDate || formattedSize) && (
            <p className="text-[11px] font-sans text-neutral-500">
              {formattedDate}
              {formattedDate && formattedSize && ' • '}
              {formattedSize}
            </p>
          )}
        </div>

        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 transition cursor-pointer shrink-0"
            title="Delete Note"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* --- PROGRESS SLIDER (Both Mobile and Desktop) --- */}
      <div className="space-y-1 pt-0.5">
        <div className="relative">
          <input
            type="range"
            min="0"
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-neutral-100 accent-neutral-900"
          />
        </div>
        <div className="flex justify-between text-[11px] font-sans tabular-nums text-neutral-400">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* --- MOBILE LAYOUT: ROW 3 (Controls Bar on mobile) --- */}
      <div className="flex md:hidden items-center justify-between pt-0.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={togglePlay}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-white shadow-sm transition hover:bg-neutral-800 cursor-pointer"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4 ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => skipSeconds(-10)}
            className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition cursor-pointer"
            title="Rewind 10s"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => skipSeconds(10)}
            className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition cursor-pointer"
            title="Forward 10s"
          >
            <RotateCw className="h-4 w-4" />
          </button>
        </div>

        {/* Speed & Volume Controls on Mobile */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={cyclePlaybackRate}
            className="rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1 text-[11px] font-sans font-semibold text-neutral-700 hover:bg-neutral-100 transition cursor-pointer"
            title="Cycle speed"
          >
            {playbackRate}x
          </button>

          <button
            type="button"
            onClick={toggleMute}
            className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition cursor-pointer"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
