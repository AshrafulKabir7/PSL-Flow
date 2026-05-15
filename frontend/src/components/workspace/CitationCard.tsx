'use client';

import { ExternalLink, Hash, CheckCircle2 } from 'lucide-react';
import { useDraftStore } from '@/store/draftStore';
import type { Chunk } from '@/types';
import { cn } from '@/lib/utils';

interface Props {
  chunk: Chunk;
  citationNumber?: number;
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 bg-black"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] font-black text-gray-900 tabular-nums w-8 text-right">
        {pct}%
      </span>
    </div>
  );
}

export function CitationCard({ chunk, citationNumber }: Props) {
  const { activeCitationId, setActiveCitation } = useDraftStore();
  const isActive = activeCitationId === chunk.chunk_id;

  const handleClick = () => {
    setActiveCitation(isActive ? null : chunk.chunk_id);
  };

  const confidenceColor =
    chunk.ocr_confidence >= 0.9
      ? 'text-emerald-500'
      : chunk.ocr_confidence >= 0.7
      ? 'text-amber-500'
      : 'text-red-500';

  return (
    <div
      onClick={handleClick}
      className={cn(
        "rounded-[20px] border p-5 cursor-pointer transition-all duration-300",
        isActive
          ? "border-black bg-white shadow-xl shadow-black/5 ring-1 ring-black"
          : "border-gray-100 bg-white hover:border-gray-200 hover:shadow-md"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-3">
          {citationNumber != null && (
            <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center text-[10px] font-black text-white">
                {citationNumber}
            </div>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 rounded-xl border border-gray-100">
             <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                Page {chunk.page_number}
             </span>
          </div>
          <div className="flex items-center gap-1.5">
             <CheckCircle2 className={cn("w-3.5 h-3.5", confidenceColor)} />
             <span className={cn("text-[10px] font-black uppercase tracking-widest", confidenceColor)}>
                {(chunk.ocr_confidence * 100).toFixed(0)}% OCR
             </span>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleClick();
          }}
          className="text-gray-300 hover:text-black transition-colors"
          title="Jump to source"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>

      <p className={cn("text-xs leading-relaxed line-clamp-4 font-medium mb-4", isActive ? "text-gray-900" : "text-gray-500")}>
        {chunk.text}
      </p>

      <div className="pt-4 border-t border-gray-50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] font-black text-gray-300 uppercase tracking-[0.2em]">Relevance Score</span>
        </div>
        <ScoreBar score={chunk.score} />
      </div>
    </div>
  );
}
