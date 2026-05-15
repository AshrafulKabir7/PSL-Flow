'use client';

import { useState } from 'react';
import { Layers, SlidersHorizontal } from 'lucide-react';
import { CitationCard } from './CitationCard';
import { useDraftStore } from '@/store/draftStore';
import type { Chunk, Draft } from '@/types';
import { cn } from '@/lib/utils';

type Filter = 'all' | 'cited';

interface Props {
  chunks: Chunk[];
  draft: Draft | null;
}

export function EvidencePanel({ chunks, draft }: Props) {
  const [filter, setFilter] = useState<Filter>('all');

  const citedChunkIds = new Set(
    (draft?.citations || []).map((c) => c.chunk_id)
  );

  const getCitationNumber = (chunkId: string): number | undefined => {
    const citation = draft?.citations.find((c) => c.chunk_id === chunkId);
    return citation?.superscript;
  };

  const filtered = filter === 'cited'
    ? chunks.filter((c) => citedChunkIds.has(c.chunk_id))
    : chunks;

  const sorted = [...filtered].sort((a, b) => b.score - a.score);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-5 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center">
                <Layers className="w-4 h-4 text-gray-400" />
            </div>
            <h2 className="font-bold text-gray-900 text-sm tracking-tight">Evidence Chunks</h2>
            <span className="text-[10px] font-black text-white bg-black px-2 py-0.5 rounded-full">
              {sorted.length}
            </span>
          </div>
          <button className="p-2 rounded-xl hover:bg-gray-50 text-gray-400 transition-all">
             <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 bg-gray-100 p-1.5 rounded-2xl">
          {(['all', 'cited'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'flex-1 text-[11px] font-black py-2 rounded-xl transition-all uppercase tracking-widest',
                filter === f
                  ? 'bg-white text-black shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              )}
            >
              {f === 'all' ? `All (${chunks.length})` : `Cited (${citedChunkIds.size})`}
            </button>
          ))}
        </div>
      </div>

      {/* Chunk list */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-[24px] bg-gray-50 flex items-center justify-center">
                <Layers className="w-8 h-8 text-gray-100" />
            </div>
            <div>
                <p className="text-sm font-bold text-gray-400">
                {filter === 'cited'
                    ? 'No cited chunks found'
                    : 'No evidence chunks available'}
                </p>
                <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest mt-1">Check retrieval settings</p>
            </div>
          </div>
        ) : (
          sorted.map((chunk) => (
            <CitationCard
              key={chunk.chunk_id}
              chunk={chunk}
              citationNumber={getCitationNumber(chunk.chunk_id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
