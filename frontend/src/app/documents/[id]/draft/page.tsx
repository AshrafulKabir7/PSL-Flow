'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, FileText, Loader2, AlertCircle, Scale, Columns, CheckCircle2, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import { DocumentPanel } from '@/components/workspace/DocumentPanel';
import { EvidencePanel } from '@/components/workspace/EvidencePanel';
import { DraftPanel } from '@/components/workspace/DraftPanel';
import { useDraftStore } from '@/store/draftStore';
import { useDocumentStore } from '@/store/documentStore';
import { api } from '@/lib/api';

export default function DraftWorkspacePage() {
  const params = useParams();
  const docId = params.id as string;

  const { setDraft, setEvidence, draft, evidence } = useDraftStore();
  const { setCurrentDoc } = useDocumentStore();

  const [draftGenerating, setDraftGenerating] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  const { data: docData } = useQuery({
    queryKey: ['document', docId],
    queryFn: () => api.documents.get(docId),
  });

  useEffect(() => {
    if (docData) setCurrentDoc(docData);
  }, [docData, setCurrentDoc]);

  useEffect(() => {
    let cancelled = false;

    async function initDraft() {
      setDraftError(null);
      try {
        setDraftGenerating(true);
        const newDraft = await api.documents.generateDraft(docId);
        if (!cancelled) {
          setDraft(newDraft);
          const chunks = await api.drafts.getEvidence(newDraft.id);
          if (!cancelled) setEvidence(chunks);
        }
      } catch (err) {
        if (!cancelled) {
          setDraftError(err instanceof Error ? err.message : 'Failed to generate draft.');
        }
      } finally {
        if (!cancelled) setDraftGenerating(false);
      }
    }

    initDraft();
    return () => { cancelled = true; };
  }, [docId, setDraft, setEvidence]);

  if (draftGenerating) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-2xl p-12 text-center max-w-sm w-full animate-fade-in">
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 rounded-full bg-amber-400 opacity-20 animate-ping" />
            <div className="relative w-24 h-24 rounded-full bg-black flex items-center justify-center shadow-2xl">
              <Scale className="w-10 h-10 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">Composing Draft</h2>
          <p className="text-sm text-gray-500 leading-relaxed font-medium">
            Our AI engine is currently synthesizing the evidence and applying your learned style patterns.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3 py-3 px-4 bg-gray-50 rounded-2xl">
            <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Processing...</span>
          </div>
        </div>
      </div>
    );
  }

  if (draftError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white rounded-[32px] border border-red-100 shadow-2xl p-12 text-center max-w-sm w-full animate-fade-in">
          <div className="w-20 h-20 rounded-[24px] bg-red-50 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-3 tracking-tight">Generation Failed</h2>
          <div className="bg-red-50/50 rounded-2xl p-4 mb-8">
             <p className="text-xs text-red-600 font-medium leading-relaxed">{draftError}</p>
          </div>
          <Link
            href={`/documents/${docId}`}
            className="flex items-center justify-center gap-2 py-4 bg-black text-white text-xs font-bold rounded-2xl hover:bg-gray-800 transition-all uppercase tracking-widest"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Case
          </Link>
        </div>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-gray-100 border-t-black animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-white px-6 py-4 flex items-center justify-between gap-4 border-b border-gray-100 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <Link
            href={`/documents/${docId}`}
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-gray-400 hover:text-black hover:bg-gray-100 transition-all border border-gray-50"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div className="flex items-center gap-3 pr-4 border-r border-gray-100">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center shadow-sm">
                <FileText className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex flex-col min-w-0">
                <h1 className="font-black text-gray-900 text-sm truncate tracking-tight uppercase">
                {docData?.filename || 'Document Workspace'}
                </h1>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Draft Workspace</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl border border-gray-100">
                <Columns className="w-4 h-4 text-gray-400" />
                <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">3-Panel View</span>
            </div>

            {draft.patterns_applied.length > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-xl group relative cursor-help">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
                    {draft.patterns_applied.length} Learned Patterns Applied
                </span>
                </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (!draft) return;
                const blob = new Blob([draft.content_markdown], { type: 'text/markdown' });
                const url = URL.createObjectURL(blob);
                const a = window.document.createElement('a');
                a.href = url;
                a.download = `${docData?.filename?.replace(/\.[^.]+$/, '') ?? 'draft'}_v${draft.version}.md`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="px-5 py-2.5 bg-black text-white text-[11px] font-black rounded-xl hover:bg-gray-800 transition-all uppercase tracking-widest shadow-lg shadow-black/10">
                Finalise Case
            </button>
            <button className="p-2.5 rounded-xl bg-gray-50 text-gray-400 hover:text-black transition-all">
                <MoreHorizontal className="w-5 h-5" />
            </button>
        </div>
      </div>

      {/* ── 3-Panel Layout ─────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden p-3 gap-3 bg-gray-50">
        <div className="w-1/3 bg-white rounded-[28px] shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          {docData && <DocumentPanel document={docData} chunks={evidence} />}
        </div>
        <div className="w-1/3 bg-white rounded-[28px] shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <EvidencePanel chunks={evidence} draft={draft} />
        </div>
        <div className="w-1/3 bg-white rounded-[28px] shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <DraftPanel draft={draft} docId={docId} />
        </div>
      </div>
    </div>
  );
}
