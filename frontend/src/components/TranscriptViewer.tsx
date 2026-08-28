"use client";

import { Check, Copy, Search } from "lucide-react";
import React, { useMemo, useState } from "react";
import { toast } from "sonner";

interface Props {
  transcript?: string | null;
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query || !query.trim()) return <>{text}</>;

  const trimmedQuery = query.trim();
  const escapedQuery = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escapedQuery})`, "gi");
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, index) => {
        const isMatch = part.toLowerCase() === trimmedQuery.toLowerCase();
        return isMatch ? (
          <mark
            key={`${index}-${part}`}
            className="bg-amber-200/90 text-amber-950 font-semibold px-1 rounded-xs"
          >
            {part}
          </mark>
        ) : (
          <span key={`${index}-${part}`}>{part}</span>
        );
      })}
    </>
  );
}

export default function TranscriptViewer({ transcript }: Props) {
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState(false);

  // Format transcript into multiple grammatically structured English paragraphs
  const paragraphs = useMemo(() => {
    if (!transcript || !transcript.trim()) return [];

    let rawText = transcript.trim();

    // 1. Clean up STT period artifacts right after prepositions, conjunctions, or numbers
    rawText = rawText
      .replace(
        /\b(in|on|at|to|for|with|by|from|about|into|through|after|over|between|out|against|during|without|before|under|around|among|but|and|or|of|the|a|an)\.\s*/gi,
        "$1 ",
      )
      .replace(/(\d+),(\d+)\.(\d+)/g, "$1,$2")
      .replace(/\s+/g, " ");

    // 2. Check if raw text already has explicit line breaks
    const existingLines = rawText
      .split(/\n\s*\n|\n/)
      .map((p) => p.trim())
      .filter(Boolean);

    if (existingLines.length > 1) return existingLines;

    // 3. Split into valid sentences
    const sentenceRegex = /(?<=[.!?])\s+(?=[A-Z0-9])/;
    let sentences = rawText
      .split(sentenceRegex)
      .map((s) => s.trim())
      .filter(Boolean);

    // 4. Fallback if no punctuation exists: group into ~18-word clauses
    if (sentences.length <= 1) {
      const words = rawText.split(/\s+/);
      const wordsPerSentence = 18;
      const syntheticSentences: string[] = [];

      for (let i = 0; i < words.length; i += wordsPerSentence) {
        let clause = words.slice(i, i + wordsPerSentence).join(" ");
        clause = clause.charAt(0).toUpperCase() + clause.slice(1);
        if (!/[.!?]$/.test(clause)) {
          clause += ".";
        }
        syntheticSentences.push(clause);
      }
      sentences = syntheticSentences;
    }

    // 5. Combine sentences into complete paragraphs without dangling prepositions
    const danglingRegex =
      /\b(in|on|at|to|for|with|by|from|about|into|through|after|over|between|out|against|during|without|before|under|around|among|but|and|or|of|the|a|an)\.?$/i;

    const paragraphBlocks: string[] = [];
    let currentBlock: string[] = [];

    for (let i = 0; i < sentences.length; i++) {
      currentBlock.push(sentences[i]);

      if (currentBlock.length >= 3 || i === sentences.length - 1) {
        let combined = currentBlock.join(" ").trim();

        while (danglingRegex.test(combined) && i + 1 < sentences.length) {
          i++;
          currentBlock.push(sentences[i]);
          combined = currentBlock.join(" ").trim();
        }

        if (!/[.!?]$/.test(combined)) {
          combined += ".";
        }

        paragraphBlocks.push(combined);
        currentBlock = [];
      }
    }

    return paragraphBlocks.length > 0 ? paragraphBlocks : [rawText];
  }, [transcript]);

  const filteredParagraphs = useMemo(() => {
    if (!search.trim()) return paragraphs;
    return paragraphs.filter((p) => p.toLowerCase().includes(search.toLowerCase()));
  }, [paragraphs, search]);

  if (!transcript) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-white p-8 text-center text-neutral-400 h-full">
        <p className="text-xs font-medium">Transcript will appear here once ASR completes.</p>
      </div>
    );
  }

  const wordCount = transcript.trim().split(/\s+/).length;

  const handleCopy = () => {
    navigator.clipboard.writeText(transcript);
    setCopied(true);
    toast.success("Transcript copied");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xs space-y-4 min-h-0">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h3 className="text-lg font-bold text-neutral-900 tracking-tight">
            Transcript{" "}
            <span className="text-[11px] text-neutral-400 font-normal ml-1">
              • {wordCount} words
            </span>
          </h3>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="rounded-lg border border-neutral-200 bg-neutral-50 p-1.5 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition cursor-pointer"
          title={copied ? "Copied" : "Copy transcript"}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-600" />
          ) : (
            <Copy className="h-3.5 w-3.5 text-neutral-500" />
          )}
        </button>
      </div>

      {/* Search Input */}
      <div className="relative flex items-center shrink-0">
        <Search className="absolute left-3.5 h-4 w-4 text-neutral-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search transcript..."
          className="h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50/80 pl-10 pr-3 text-xs text-neutral-900 placeholder-neutral-400 focus:border-neutral-900 focus:bg-white focus:outline-none transition flex items-center"
        />
      </div>

      {/* Structured Paragraph Display with In-Text Keyword Highlighting */}
      <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 text-xs sm:text-sm leading-relaxed text-neutral-800 font-sans min-h-0">
        {filteredParagraphs.length === 0 ? (
          <div className="py-8 text-center text-xs text-neutral-400 italic">
            No matches found for "{search}"
          </div>
        ) : (
          filteredParagraphs.map((para, idx) => (
            <p
              key={`${idx}-${para.substring(0, 15)}`}
              className="bg-neutral-50/70 p-3.5 rounded-xl border border-neutral-100 leading-relaxed font-sans text-neutral-800"
            >
              <HighlightedText text={para} query={search} />
            </p>
          ))
        )}
      </div>
    </div>
  );
}
