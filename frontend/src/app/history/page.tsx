'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { 
  History, 
  Search, 
  Filter, 
  Clock, 
  FileText,
  Calendar,
  ChevronRight,
  MoreHorizontal,
  ArrowRight
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Document } from '@/types';

function StatusBadge({ status }: { status: Document['status'] }) {
  const cfg = {
    ready:      { label: 'Completed',  cls: 'text-emerald-700 bg-emerald-50' },
    error:      { label: 'Failed',     cls: 'text-red-700 bg-red-50' },
    uploading:  { label: 'Uploaded',   cls: 'text-slate-600 bg-slate-50' },
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

export default function HistoryPage() {
  const router = useRouter();
  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: api.documents.list,
  });

  return (
    <div className="flex flex-col gap-8 animate-fade-in pr-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">History</h1>
          <p className="text-sm text-gray-500 font-medium mt-1">Review all past document analysis and generated drafts</p>
        </div>
        <div className="flex gap-3">
           <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                placeholder="Search history..."
                className="pl-11 pr-4 py-3 bg-white rounded-2xl text-sm border border-transparent focus:border-gray-200 shadow-sm transition-all outline-none w-64"
              />
           </div>
           <button className="px-5 py-3 flex items-center gap-2 rounded-2xl bg-white border border-gray-100 shadow-sm hover:bg-gray-50 transition-all text-xs font-bold text-gray-600">
              <Calendar className="w-4 h-4" />
              Date Range
           </button>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="grid grid-cols-[1fr_200px_140px_100px] px-8 py-5 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
          <span>Document Details</span>
          <span>Analysed Date</span>
          <span>Final Status</span>
          <span />
        </div>

        <div className="divide-y divide-gray-50">
          {isLoading ? (
            [1,2,3,4,5].map(i => (
              <div key={i} className="px-8 py-6 grid grid-cols-[1fr_200px_140px_100px] gap-8">
                <div className="h-6 bg-gray-50 rounded-lg animate-pulse" />
                <div className="h-6 bg-gray-50 rounded-lg animate-pulse" />
                <div className="h-6 bg-gray-50 rounded-lg animate-pulse" />
                <div className="h-6 bg-gray-50 rounded-lg animate-pulse" />
              </div>
            ))
          ) : (
            documents?.map(doc => (
              <div 
                key={doc.id}
                onClick={() => router.push(doc.status === 'ready' ? `/documents/${doc.id}/draft` : `/documents/${doc.id}`)}
                className="group px-8 py-6 grid grid-cols-[1fr_200px_140px_100px] items-center hover:bg-gray-50 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-5">
                  <div className="w-11 h-11 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-black group-hover:bg-white group-hover:shadow-lg transition-all">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[15px] font-bold text-gray-900 tracking-tight">{doc.filename}</p>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5">{doc.id.slice(0,8)}</p>
                  </div>
                </div>

                <div className="text-xs font-bold text-gray-500">
                  {new Date(doc.uploaded_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>

                <div>
                   <StatusBadge status={doc.status} />
                </div>

                <div className="flex justify-end pr-2">
                   <div className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-200 group-hover:text-black group-hover:bg-white group-hover:shadow-md transition-all">
                      <ArrowRight className="w-5 h-5" />
                   </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-8 bg-gray-50/50 flex items-center justify-between border-t border-gray-100">
           <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Showing {documents?.length ?? 0} results</p>
           <div className="flex gap-2">
              <button disabled className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-300 bg-gray-100 rounded-lg">Prev</button>
              <button disabled className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400 bg-white border border-gray-100 rounded-lg shadow-sm">Next</button>
           </div>
        </div>
      </div>
    </div>
  );
}
