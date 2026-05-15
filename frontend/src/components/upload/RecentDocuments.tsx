'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { FileText, AlertCircle, Loader2, ArrowRight, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import type { Document } from '@/types';

function StatusBadge({ status }: { status: Document['status'] }) {
  const cfg = {
    ready:      { label: 'Ready',      cls: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
    error:      { label: 'Error',      cls: 'bg-red-100 text-red-600',       dot: 'bg-red-500' },
    uploading:  { label: 'Uploading',  cls: 'bg-slate-100 text-slate-600',   dot: 'bg-slate-400' },
    ocr:        { label: 'OCR',        cls: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-500' },
    extracting: { label: 'Extracting', cls: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-500' },
    indexing:   { label: 'Indexing',   cls: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-500' },
  } as const;

  const s = cfg[status as keyof typeof cfg] ?? cfg.uploading;

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${s.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function getDocumentHref(doc: Document): string {
  return doc.status === 'ready' ? `/documents/${doc.id}/draft` : `/documents/${doc.id}`;
}

export function RecentDocuments() {
  const router = useRouter();
  const { data: documents, isLoading, error } = useQuery({
    queryKey: ['documents'],
    queryFn: api.documents.list,
    refetchInterval: 5000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 skeleton-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-4">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        Cannot load documents — is the backend running?
      </div>
    );
  }

  const recent = (documents || []).slice(0, 6);

  if (recent.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-slate-400">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
          <FileText className="w-7 h-7 text-slate-300" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-slate-500">No documents yet</p>
          <p className="text-xs text-slate-400 mt-0.5">Upload one above to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {recent.map((doc) => (
        <button
          key={doc.id}
          onClick={() => router.push(getDocumentHref(doc))}
          className="flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-xl transition-all text-left group"
        >
          <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 shadow-sm">
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate leading-snug">
              {doc.filename}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={doc.status} />
              {doc.page_count && (
                <span className="text-[11px] text-slate-400">{doc.page_count}p</span>
              )}
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors flex-shrink-0" />
        </button>
      ))}
    </div>
  );
}
