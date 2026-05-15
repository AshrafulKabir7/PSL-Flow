'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import {
  FolderOpen,
  FileText,
  AlertCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  RefreshCw,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import type { Document } from '@/types';

type SortKey = 'uploaded_at' | 'filename' | 'status';
type SortDir = 'asc' | 'desc';
type StatusFilter = 'all' | Document['status'];

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
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${s.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function OcrBar({ confidence }: { confidence: number }) {
  const pct = (confidence * 100).toFixed(0);
  const color =
    confidence >= 0.9 ? '#10B981' : confidence >= 0.7 ? '#F59E0B' : '#EF4444';
  return (
    <div className="flex items-center gap-2 min-w-[90px]">
      <div className="flex-1 score-bar">
        <div className="score-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[11px] font-medium text-slate-500 w-9 text-right">{pct}%</span>
    </div>
  );
}

function getDocumentHref(doc: Document): string {
  return doc.status === 'ready' ? `/documents/${doc.id}/draft` : `/documents/${doc.id}`;
}

export default function HistoryPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('uploaded_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const { data: documents, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['documents'],
    queryFn: api.documents.list,
    refetchInterval: 10000,
  });

  const filtered = useMemo(() => {
    let docs = documents || [];

    if (statusFilter !== 'all') {
      docs = docs.filter((d) => d.status === statusFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      docs = docs.filter(
        (d) =>
          d.filename.toLowerCase().includes(q) ||
          d.structured_fields?.document_type?.toLowerCase().includes(q) ||
          d.structured_fields?.case_number?.toLowerCase().includes(q)
      );
    }

    return [...docs].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'filename') {
        cmp = a.filename.localeCompare(b.filename);
      } else if (sortKey === 'status') {
        cmp = a.status.localeCompare(b.status);
      } else {
        cmp = a.uploaded_at.localeCompare(b.uploaded_at);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [documents, search, statusFilter, sortKey, sortDir]);

  const total = documents?.length ?? 0;
  const ready = documents?.filter((d) => d.status === 'ready').length ?? 0;
  const processing = documents?.filter((d) =>
    ['uploading', 'ocr', 'extracting', 'indexing'].includes(d.status)
  ).length ?? 0;
  const errors = documents?.filter((d) => d.status === 'error').length ?? 0;

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--page-bg)' }}>
      {/* ── Header ─────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Document History</h1>
              <p className="text-sm text-slate-500">All uploaded legal documents</p>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="px-8 py-6 space-y-5">
        {/* ── Stats mini cards ──────────────────────────── */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total',      value: total,      icon: FileText,     cls: 'text-slate-700', bg: 'bg-slate-100' },
            { label: 'Ready',      value: ready,      icon: CheckCircle2, cls: 'text-emerald-700', bg: 'bg-emerald-100' },
            { label: 'Processing', value: processing, icon: Loader2,      cls: 'text-amber-700',  bg: 'bg-amber-100' },
            { label: 'Errors',     value: errors,     icon: XCircle,      cls: 'text-red-600',    bg: 'bg-red-100' },
          ].map(({ label, value, icon: Icon, cls, bg }) => (
            <div
              key={label}
              className="bg-white rounded-2xl border border-slate-200 shadow-[var(--shadow-card)] px-4 py-3 flex items-center gap-3"
            >
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-4 h-4 ${cls}`} />
              </div>
              <div>
                <p className={`text-xl font-bold ${cls} leading-none`}>{isLoading ? '—' : value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Controls ────────────────────────────────────  */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-[var(--shadow-card)] p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by filename, type, case number…"
                className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition-all"
              />
            </div>

            {/* Status filter */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
              {(['all', 'ready', 'error', 'uploading'] as StatusFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-all ${
                    statusFilter === f
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Sort */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {(['uploaded_at', 'filename', 'status'] as SortKey[]).map((key) => {
                const labels: Record<SortKey, string> = { uploaded_at: 'Date', filename: 'Name', status: 'Status' };
                const active = sortKey === key;
                return (
                  <button
                    key={key}
                    onClick={() => toggleSort(key)}
                    className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                      active
                        ? 'bg-slate-800 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {labels[key]}
                    {active && (sortDir === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Document list ─────────────────────────────── */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-[76px] skeleton-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-2xl p-5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            Unable to load documents. Is the backend running?
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 bg-white rounded-2xl border border-slate-200">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
              <FileText className="w-7 h-7 text-slate-300" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-slate-600">
                {search || statusFilter !== 'all' ? 'No matching documents' : 'No documents yet'}
              </p>
              <p className="text-sm text-slate-400 mt-1">
                {search || statusFilter !== 'all'
                  ? 'Try clearing the filters'
                  : 'Upload a document to get started'}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-[var(--shadow-card)] overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <span>Document</span>
              <span className="text-right">Type</span>
              <span className="text-center">OCR</span>
              <span className="text-right">Date</span>
              <span />
            </div>

            <div className="divide-y divide-slate-100">
              {filtered.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => router.push(getDocumentHref(doc))}
                  className="w-full grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center px-5 py-4 hover:bg-slate-50 transition-colors text-left group"
                >
                  {/* Name + status */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {doc.filename}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <StatusBadge status={doc.status} />
                        {doc.page_count && (
                          <span className="text-xs text-slate-400">{doc.page_count} pages</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Doc type */}
                  <div className="text-right">
                    {doc.structured_fields?.document_type ? (
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                        {doc.structured_fields.document_type}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </div>

                  {/* OCR confidence */}
                  <div>
                    {doc.ocr_confidence != null ? (
                      <OcrBar confidence={doc.ocr_confidence} />
                    ) : (
                      <span className="text-xs text-slate-300 w-[90px] inline-block text-center">—</span>
                    )}
                  </div>

                  {/* Date */}
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-xs text-slate-400 justify-end whitespace-nowrap">
                      <Clock className="w-3 h-3" />
                      {formatDateTime(doc.uploaded_at)}
                    </div>
                  </div>

                  {/* Arrow */}
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors flex-shrink-0" />
                </button>
              ))}
            </div>

            {/* Footer count */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-400">
              Showing {filtered.length} of {total} document{total !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
