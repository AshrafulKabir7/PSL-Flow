'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { 
  FileText, 
  Search, 
  ChevronRight, 
  Filter, 
  ArrowUpRight,
  MoreHorizontal,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Document } from '@/types';

function StatusBadge({ status }: { status: Document['status'] }) {
  const cfg = {
    ready:      { label: 'Analysed',   cls: 'text-emerald-700 bg-emerald-50' },
    error:      { label: 'Failed',     cls: 'text-red-700 bg-red-50' },
    uploading:  { label: 'Uploading',  cls: 'text-slate-600 bg-slate-50' },
    ocr:        { label: 'Processing', cls: 'text-amber-700 bg-amber-50' },
    extracting: { label: 'Extracting', cls: 'text-amber-700 bg-amber-50' },
    indexing:   { label: 'Indexing',   cls: 'text-amber-700 bg-amber-50' },
  } as const;
  const s = cfg[status as keyof typeof cfg] ?? cfg.uploading;
  return (
    <span className={cn('px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider', s.cls)}>
      {s.label}
    </span>
  );
}

export default function DocumentsPage() {
  const router = useRouter();
  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: api.documents.list,
    refetchInterval: 10000,
  });

  return (
    <div className="flex flex-col gap-8 animate-fade-in pr-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Active Cases</h1>
          <p className="text-sm text-gray-500 font-medium mt-1">Manage and track your document drafting pipeline</p>
        </div>
        <div className="flex gap-3">
           <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                placeholder="Search cases..."
                className="pl-11 pr-4 py-3 bg-white rounded-2xl text-sm border border-transparent focus:border-gray-200 shadow-sm transition-all outline-none w-64"
              />
           </div>
           <button className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-gray-100 shadow-sm hover:bg-gray-50 transition-all">
              <Filter className="w-5 h-5 text-gray-600" />
           </button>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="grid grid-cols-[1fr_140px_140px_140px_60px] px-8 py-5 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
          <span>Document Name</span>
          <span>Date Uploaded</span>
          <span>Status</span>
          <span className="text-right">Accuracy</span>
          <span />
        </div>

        <div className="divide-y divide-gray-50">
          {isLoading ? (
            [1,2,3,4,5].map(i => (
              <div key={i} className="px-8 py-6 grid grid-cols-[1fr_140px_140px_140px_60px] gap-8">
                <div className="h-6 bg-gray-50 rounded-lg animate-pulse" />
                <div className="h-6 bg-gray-50 rounded-lg animate-pulse" />
                <div className="h-6 bg-gray-50 rounded-lg animate-pulse" />
                <div className="h-6 bg-gray-50 rounded-lg animate-pulse" />
              </div>
            ))
          ) : documents?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
               <div className="w-16 h-16 rounded-3xl bg-gray-50 flex items-center justify-center">
                  <FileText className="w-8 h-8 text-gray-300" />
               </div>
               <div className="text-center">
                  <h3 className="text-lg font-bold text-gray-900">No documents found</h3>
                  <p className="text-sm text-gray-400 font-medium">Upload a document to start your first case.</p>
               </div>
            </div>
          ) : (
            documents?.map(doc => (
              <div 
                key={doc.id}
                onClick={() => router.push(doc.status === 'ready' ? `/documents/${doc.id}/draft` : `/documents/${doc.id}`)}
                className="group px-8 py-6 grid grid-cols-[1fr_140px_140px_140px_60px] items-center hover:bg-gray-50 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center group-hover:bg-white group-hover:shadow-lg group-hover:shadow-black/5 transition-all">
                    <FileText className="w-6 h-6 text-gray-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[15px] font-bold text-gray-900 truncate tracking-tight">{doc.filename}</p>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5">#{doc.id.slice(0,8)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                  <Clock className="w-4 h-4 text-gray-300" />
                  {new Date(doc.uploaded_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                </div>

                <div>
                   <StatusBadge status={doc.status} />
                </div>

                <div className="flex flex-col items-end gap-1.5">
                   <span className="text-xs font-black text-gray-900">
                      {doc.ocr_confidence ? `${(doc.ocr_confidence * 100).toFixed(0)}%` : '—'}
                   </span>
                   <div className="w-16 h-1 rounded-full bg-gray-100 overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-1000",
                          (doc.ocr_confidence ?? 0) > 0.8 ? "bg-emerald-500" : "bg-amber-500"
                        )} 
                        style={{ width: `${(doc.ocr_confidence ?? 0) * 100}%` }} 
                      />
                   </div>
                </div>

                <div className="flex justify-end">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-300 group-hover:text-black group-hover:bg-white group-hover:shadow-md transition-all">
                    <ArrowUpRight className="w-5 h-5" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
