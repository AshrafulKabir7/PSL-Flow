'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Layers, FileEdit, Brain } from 'lucide-react';
import { DraftEditor } from '@/components/editor/DraftEditor';
import { CitationCard } from '@/components/workspace/CitationCard';
import { useDraftStore } from '@/store/draftStore';

export default function EditorPage() {
  const params = useParams();
  const docId = params.id as string;
  const { draft, evidence } = useDraftStore();

  if (!draft) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--page-bg)' }}>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8 text-center max-w-sm">
          <FileEdit className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium mb-1">No draft loaded</p>
          <p className="text-sm text-slate-400 mb-4">Navigate to the workspace first</p>
          <Link
            href={`/documents/${docId}/draft`}
            className="inline-flex items-center gap-2 text-sm text-amber-600 hover:text-amber-700 font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            Go to workspace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-3">
        <div className="flex items-center gap-3">
          <Link
            href={`/documents/${docId}/draft`}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
            <FileEdit className="w-3.5 h-3.5 text-amber-600" />
          </div>

          <div>
            <h1 className="font-semibold text-slate-800 text-sm">Operator Edit Mode</h1>
            <p className="text-xs text-slate-400">Edit the draft — your changes teach the AI</p>
          </div>

          <div className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl">
            <Brain className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-semibold text-amber-700">AI Learning Mode</span>
          </div>
        </div>
      </div>

      {/* ── Main editor layout ──────────────────────────── */}
      <div className="flex-1 flex overflow-hidden" style={{ height: 'calc(100vh - 57px)' }}>
        <div className="flex-1 p-6 overflow-hidden flex flex-col">
          <DraftEditor draftId={draft.id} initialContent={draft.content_markdown} />
        </div>

        {/* Evidence sidebar */}
        <div className="w-80 border-l border-slate-200 bg-white overflow-hidden flex flex-col">
          <div className="flex-shrink-0 px-4 py-3 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-700">Evidence</h2>
              <span className="text-xs text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full">
                {evidence.length}
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {evidence.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
                <Layers className="w-6 h-6" />
                <p className="text-xs">No evidence loaded.</p>
              </div>
            ) : (
              [...evidence]
                .sort((a, b) => b.score - a.score)
                .map((chunk) => <CitationCard key={chunk.chunk_id} chunk={chunk} />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
