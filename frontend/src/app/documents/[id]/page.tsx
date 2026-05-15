'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { FileText, ArrowLeft, Cpu } from 'lucide-react';
import Link from 'next/link';
import { ProcessingPipeline } from '@/components/processing/ProcessingPipeline';
import { ExtractedFieldsPreview } from '@/components/processing/ExtractedFieldsPreview';
import { RawTextPreview } from '@/components/processing/RawTextPreview';
import { useDocumentStore } from '@/store/documentStore';
import { api } from '@/lib/api';

const STATUS_LABEL: Record<string, string> = {
  uploading: 'Uploading…',
  ocr: 'Running OCR…',
  extracting: 'Extracting Fields…',
  indexing: 'Indexing Chunks…',
  ready: 'Ready',
  error: 'Error',
};

export default function DocumentProcessingPage() {
  const params = useParams();
  const docId = params.id as string;
  const setCurrentDoc = useDocumentStore((s) => s.setCurrentDoc);

  const { data: document, isLoading } = useQuery({
    queryKey: ['document', docId],
    queryFn: () => api.documents.get(docId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'ready' || status === 'error') return false;
      return 3000;
    },
  });

  useEffect(() => {
    if (document) setCurrentDoc(document);
  }, [document, setCurrentDoc]);

  const isReady = document?.status === 'ready';

  return (
    <div className="min-h-screen" style={{ background: 'var(--page-bg)' }}>
      {/* ── Header ─────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-slate-400">
            <Link href="/" className="hover:text-slate-600 transition-colors">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-slate-700 font-medium truncate max-w-xs">
              {isLoading ? 'Loading…' : document?.filename || 'Document'}
            </span>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-xl">
              <Cpu className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-medium text-slate-600 capitalize">
                {STATUS_LABEL[document?.status ?? ''] ?? (document?.status || 'Processing')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ────────────────────────────────────── */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <ProcessingPipeline docId={docId} />
          </div>
          <div className="space-y-6">
            <ExtractedFieldsPreview docId={docId} isReady={isReady} />
            <RawTextPreview
              docId={docId}
              isReady={isReady}
              ocrConfidence={document?.ocr_confidence ?? null}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
