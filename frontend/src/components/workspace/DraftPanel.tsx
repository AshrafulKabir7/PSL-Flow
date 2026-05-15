'use client';

import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { FileEdit, Lightbulb, CheckCircle2, AlertTriangle, XCircle, MoreHorizontal } from 'lucide-react';
import { useDraftStore } from '@/store/draftStore';
import type { Draft } from '@/types';
import { cn } from '@/lib/utils';

type GroundingStatus = 'grounded' | 'partially_grounded' | 'unsupported';

function GroundingBadge({ status }: { status: GroundingStatus }) {
  if (status === 'grounded') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase tracking-widest">
        <CheckCircle2 className="w-3 h-3" />
        Grounded
      </span>
    );
  }
  if (status === 'partially_grounded') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100 uppercase tracking-widest">
        <AlertTriangle className="w-3 h-3" />
        Partial
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100 uppercase tracking-widest">
      <XCircle className="w-3 h-3" />
      Unsupported
    </span>
  );
}

interface Props {
  draft: Draft;
  docId: string;
}

const markdownComponents = {
  p: ({ children }: { children: React.ReactNode }) => (
    <p className="mb-6 text-gray-700 leading-loose text-sm font-medium">{children}</p>
  ),
  h1: ({ children }: { children: React.ReactNode }) => (
    <h1 className="text-2xl font-black text-gray-900 mt-8 mb-4 tracking-tight">{children}</h1>
  ),
  h2: ({ children }: { children: React.ReactNode }) => (
    <h2 className="text-xl font-bold text-gray-800 mt-7 mb-3 tracking-tight">{children}</h2>
  ),
  h3: ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-base font-bold text-gray-700 mt-6 mb-2 tracking-tight">{children}</h3>
  ),
  ul: ({ children }: { children: React.ReactNode }) => (
    <ul className="list-disc list-inside mb-6 space-y-2 text-gray-700">{children}</ul>
  ),
  ol: ({ children }: { children: React.ReactNode }) => (
    <ol className="list-decimal list-inside mb-6 space-y-2 text-gray-700">{children}</ol>
  ),
  li: ({ children }: { children: React.ReactNode }) => (
    <li className="text-gray-700 pl-2">{children}</li>
  ),
  strong: ({ children }: { children: React.ReactNode }) => (
    <strong className="font-black text-gray-900">{children}</strong>
  ),
};

export function DraftPanel({ draft, docId }: Props) {
  const router = useRouter();
  const { setActiveCitation } = useDraftStore();

  const superscriptMap = new Map(
    draft.citations.map((c) => [c.superscript, c.chunk_id])
  );

  const renderContent = () => {
    const parts = draft.content_markdown.split(/(\[\d+\])/);
    return parts.map((part, i) => {
      const match = part.match(/^\[(\d+)\]$/);
      if (match) {
        const num = parseInt(match[1], 10);
        const chunkId = superscriptMap.get(num);
        return (
          <sup
            key={i}
            onClick={() => chunkId && setActiveCitation(chunkId)}
            className={cn(
              'ml-1 text-[10px] font-black cursor-pointer transition-all inline-flex items-center justify-center w-5 h-5 rounded-full border',
              chunkId
                ? 'text-white bg-black border-black hover:bg-gray-800 shadow-sm'
                : 'text-gray-300 border-gray-100'
            )}
            title={
              chunkId ? `Citation ${num} — click to highlight source` : undefined
            }
          >
            {num}
          </sup>
        );
      }
      return (
        <ReactMarkdown key={i} components={markdownComponents as never}>
          {part}
        </ReactMarkdown>
      );
    });
  };

  const { grounding_report, patterns_applied } = draft;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-5 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center">
                <FileEdit className="w-4 h-4 text-gray-400" />
            </div>
            <h2 className="font-bold text-gray-900 text-sm tracking-tight">Case Fact Summary</h2>
            <span className="text-[10px] font-black text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full uppercase tracking-widest">
              v{draft.version}
            </span>
          </div>
          <button
            onClick={() => router.push(`/documents/${docId}/editor`)}
            className="flex items-center gap-2 px-4 py-2 bg-black hover:bg-gray-800 text-white text-[11px] font-black rounded-xl transition-all shadow-lg shadow-black/10 uppercase tracking-widest"
          >
            <FileEdit className="w-3.5 h-3.5" />
            Edit Draft
          </button>
        </div>

        {/* Grounding report */}
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {Object.entries(grounding_report).map(([key, val]) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">{key}:</span>
              <GroundingBadge status={val as GroundingStatus} />
            </div>
          ))}
        </div>
      </div>

      {/* Draft content */}
      <div className="flex-1 overflow-y-auto p-8 bg-gray-50/20">
        <div className="max-w-2xl mx-auto bg-white rounded-[32px] p-8 md:p-12 shadow-xl shadow-gray-200/50 border border-gray-50 prose prose-premium">
            {renderContent()}
        </div>
      </div>
    </div>
  );
}
