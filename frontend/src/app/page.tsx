'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FileText, CheckCircle2, Clock, Lightbulb, ArrowRight,
  Upload, TrendingUp, AlertTriangle, Cpu, Search, Bell,
  FolderOpen, Scale, Mail, MoreHorizontal, User, Send, Download,
  ChevronRight, LayoutDashboard, Plus
} from 'lucide-react';
import { DocumentUploader } from '@/components/upload/DocumentUploader';
import { api } from '@/lib/api';
import { formatDateTime, cn } from '@/lib/utils';
import type { Document } from '@/types';

function StatusLabel({ status }: { status: Document['status'] }) {
  const cfg = {
    ready:      { label: 'Received',   cls: 'text-emerald-700' },
    error:      { label: 'Error',      cls: 'text-red-700' },
    uploading:  { label: 'Uploading',  cls: 'text-slate-600' },
    ocr:        { label: 'OCR',        cls: 'text-amber-700' },
    extracting: { label: 'Extracting', cls: 'text-amber-700' },
    indexing:   { label: 'Indexing',   cls: 'text-amber-700' },
  } as const;
  const s = cfg[status as keyof typeof cfg] ?? cfg.uploading;
  return (
    <span className={cn('inline-flex items-center gap-2 text-xs font-semibold whitespace-nowrap', s.cls)}>
      <div className="w-1.5 h-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: api.documents.list,
    refetchInterval: 8000,
  });
  const { data: patterns } = useQuery({
    queryKey: ['patterns'],
    queryFn: api.patterns.list,
  });

  const total      = documents?.length ?? 0;
  const ready      = documents?.filter(d => d.status === 'ready').length ?? 0;
  const processing = documents?.filter(d =>
    ['uploading','ocr','extracting','indexing'].includes(d.status)
  ).length ?? 0;
  const errors     = documents?.filter(d => d.status === 'error').length ?? 0;
  const patCount   = patterns?.length ?? 0;
  const patActive  = patterns?.filter(p => p.active).length ?? 0;
  
  const avgOcr     = documents && documents.filter(d => d.ocr_confidence != null).length > 0
    ? documents.filter(d => d.ocr_confidence != null)
        .reduce((s, d) => s + (d.ocr_confidence ?? 0), 0) /
      documents.filter(d => d.ocr_confidence != null).length
    : 0;

  const recentDocs = (documents ?? []).slice(0, 7);

  return (
    <div className="flex flex-col gap-6 animate-fade-in pr-2">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded border border-gray-200 text-[10px] font-bold text-gray-400">
             ⌘ F
          </div>
          <input
            readOnly
            placeholder="Search anything..."
            className="w-full pl-11 pr-4 py-3 bg-white rounded-2xl text-sm focus:outline-none shadow-sm border border-transparent hover:border-gray-200 transition-all cursor-pointer"
            onClick={() => router.push('/history')}
          />
        </div>
        <div className="flex items-center gap-3">
           <button className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-gray-100 hover:bg-gray-50 transition-all relative">
              <Bell className="w-5 h-5 text-gray-600" />
              <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 border-2 border-white" />
           </button>
           <button className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-gray-100 hover:bg-gray-50 transition-all">
              <Mail className="w-5 h-5 text-gray-600" />
           </button>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr_280px] gap-6">
        
        {/* LEFT COLUMN */}
        <div className="flex flex-col gap-6">
          {/* Portfolio Card */}
          <div className="dark-card p-6 flex flex-col gap-6">
            <div>
               <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-white/50 font-medium">Case Portfolio</p>
                  <div className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">USD</div>
               </div>
               <p className="text-xs text-white/40 mb-1">Total Analysed</p>
               <h3 className="text-4xl font-black tracking-tight">{total} <span className="text-lg font-medium text-white/30">docs</span></h3>
            </div>
            
            <div className="bg-white rounded-[24px] p-5 text-black">
                <p className="text-[10px] font-bold text-gray-400 mb-4 uppercase tracking-widest">Available Ready</p>
                <div className="flex items-center justify-between mb-6">
                    <p className="text-4xl font-black">{ready}</p>
                    <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                      onClick={() => router.push('/history')}
                      className="flex-1 py-3 bg-black text-white text-[11px] font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-800 transition-all">
                        <Send className="w-3 h-3" />
                        Export
                    </button>
                    <button
                      onClick={() => {
                        const latestReady = documents?.find(d => d.status === 'ready');
                        if (latestReady) router.push(`/documents/${latestReady.id}/draft`);
                        else router.push('/history');
                      }}
                      className="flex-1 py-3 bg-gray-100 text-black text-[11px] font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 transition-all">
                        <Download className="w-3 h-3" />
                        Draft
                    </button>
                </div>
            </div>
          </div>

          {/* Upload Card */}
          <div className="glass-card overflow-hidden">
             <div className="p-6 pb-2">
                <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-black text-gray-800 uppercase tracking-widest">New Analysis</p>
                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center">
                        <Plus className="w-4 h-4 text-gray-400" />
                    </div>
                </div>
             </div>
             <div className="px-6 pb-6 pt-2">
                <DocumentUploader />
             </div>
          </div>

          {/* Quick Upload Action */}
          <div className="flex items-center justify-center py-4 text-gray-400">
             <button className="flex items-center gap-2 text-xs font-semibold hover:text-black transition-colors group">
                 <LayoutDashboard className="w-4 h-4 group-hover:rotate-45 transition-transform" />
                 Add or Manage widgets
             </button>
          </div>
        </div>

        {/* CENTER COLUMN */}
        <div className="glass-card flex flex-col">
           <div className="p-7 pb-4">
              <div className="flex items-center justify-between mb-2">
                 <h2 className="text-xl font-bold text-gray-900 tracking-tight">Recent Activity</h2>
                 <div className="flex gap-1">
                    <button className="p-2 rounded-xl hover:bg-gray-50 text-gray-400 transition-all">
                        <Search className="w-4 h-4" />
                    </button>
                    <button className="p-2 rounded-xl hover:bg-gray-50 text-gray-400 transition-all">
                        <AlertTriangle className="w-4 h-4" />
                    </button>
                 </div>
              </div>
              <p className="text-xs text-gray-400 font-medium">You can view your recent document processing history</p>
           </div>

           <div className="flex-1 flex flex-col">
              {/* Table Header */}
              <div className="grid grid-cols-[1fr_130px_130px_100px_40px] px-7 py-4 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em]">
                 <span>Name</span>
                 <span>Date</span>
                 <span>Status</span>
                 <span className="text-right">Pages</span>
                 <span />
              </div>

              {/* Rows */}
              <div className="divide-y divide-gray-50">
                 {isLoading ? (
                    [1,2,3,4,5,6].map(i => (
                        <div key={i} className="px-7 py-5 grid grid-cols-[1fr_130px_130px_100px_40px] gap-4">
                            <div className="h-5 bg-gray-50 rounded-lg animate-pulse" />
                            <div className="h-5 bg-gray-50 rounded-lg animate-pulse" />
                            <div className="h-5 bg-gray-50 rounded-lg animate-pulse" />
                            <div className="h-5 bg-gray-50 rounded-lg animate-pulse" />
                        </div>
                    ))
                 ) : (
                    recentDocs.map(doc => (
                        <div key={doc.id} className="group px-7 py-5 grid grid-cols-[1fr_130px_130px_100px_40px] items-center hover:bg-gray-50 transition-all cursor-pointer"
                             onClick={() => router.push(doc.status === 'ready' ? `/documents/${doc.id}/draft` : `/documents/${doc.id}`)}>
                            <div className="flex items-center gap-4">
                                <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-white transition-colors group-hover:shadow-sm">
                                    <FileText className="w-5 h-5 text-gray-500" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-gray-900 truncate tracking-tight">{doc.filename}</p>
                                    <p className="text-[10px] text-gray-400 font-medium tracking-tight uppercase">#{doc.id.slice(0,8)}</p>
                                </div>
                            </div>
                            <span className="text-xs text-gray-500 font-medium">
                                {new Date(doc.uploaded_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                            <StatusLabel status={doc.status} />
                            <span className="text-sm font-black text-gray-900 text-right tracking-tighter">
                                {doc.page_count ? `+ ${doc.page_count}.00` : '—'}
                            </span>
                            <div className="flex justify-end">
                                <MoreHorizontal className="w-4 h-4 text-gray-300 group-hover:text-gray-600 transition-colors" />
                            </div>
                        </div>
                    ))
                 )}
              </div>
              
              <div className="p-7 mt-auto">
                 <button
                   onClick={() => router.push('/history')}
                   className="w-full py-3.5 text-xs font-bold text-gray-500 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all tracking-tight">
                     View all documents
                 </button>
              </div>
           </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="flex flex-col gap-6">
           {/* Analytics Card 1 */}
           <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-2">
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">OCR Confidence</p>
                 <MoreHorizontal className="w-4 h-4 text-gray-300" />
              </div>
              <div className="flex items-end justify-between mb-4">
                 <h4 className="text-3xl font-black text-gray-900 tracking-tighter">{(avgOcr * 100).toFixed(1)}%</h4>
                 <span className="text-[10px] font-bold text-red-500 mb-1.5">-2% vs Prev</span>
              </div>
              <div className="flex items-end gap-1.5 h-14 mb-2">
                 {[40, 65, 55, 85, 75, 95].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t-lg bg-gray-50 relative overflow-hidden">
                        <div 
                          className="absolute bottom-0 w-full rounded-t-lg bg-black transition-all duration-700 delay-[i*100ms]" 
                          style={{ height: i === 5 ? `${avgOcr * 100}%` : `${h}%` }} 
                        />
                    </div>
                 ))}
              </div>
              <div className="flex justify-between text-[8px] font-bold text-gray-300 uppercase tracking-[0.2em]">
                 <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
              </div>
           </div>

           {/* Analytics Card 2 */}
           <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-2">
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active Patterns</p>
                 <MoreHorizontal className="w-4 h-4 text-gray-300" />
              </div>
              <div className="flex items-end justify-between mb-4">
                 <h4 className="text-3xl font-black text-gray-900 tracking-tighter">{patCount}.00</h4>
                 <span className="text-[10px] font-bold text-emerald-500 mb-1.5">+{patActive} active</span>
              </div>
              <div className="flex items-end gap-1.5 h-14 mb-2">
                 {[35, 50, 65, 45, 90, 60].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t-lg bg-gray-50 relative overflow-hidden">
                        <div 
                          className="absolute bottom-0 w-full rounded-t-lg bg-black transition-all duration-700" 
                          style={{ height: `${h}%` }} 
                        />
                    </div>
                 ))}
              </div>
              <div className="flex justify-between text-[8px] font-bold text-gray-300 uppercase tracking-[0.2em]">
                 <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
              </div>
           </div>

           {/* Exchange Card (AI Engine) */}
           <div className="glass-card p-6 border-none bg-gray-50 shadow-none">
              <p className="text-[10px] font-bold text-gray-800 mb-5 uppercase tracking-widest">AI Performance</p>
              <div className="space-y-5">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                       <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
                           <Cpu className="w-5 h-5 text-amber-500" />
                       </div>
                       <div className="flex flex-col">
                          <span className="text-xs font-bold text-gray-800">Engine</span>
                          <span className="text-[10px] text-gray-400 font-medium uppercase">DeepSeek V4</span>
                       </div>
                    </div>
                    <span className="text-xs font-black text-gray-900">Active</span>
                 </div>
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                       <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
                           <TrendingUp className="w-5 h-5 text-emerald-500" />
                       </div>
                       <div className="flex flex-col">
                          <span className="text-xs font-bold text-gray-800">Throughput</span>
                          <span className="text-[10px] text-gray-400 font-medium uppercase">High Load</span>
                       </div>
                    </div>
                    <span className="text-xs font-black text-gray-900">Stable</span>
                 </div>
              </div>
              <div className="mt-8 pt-8 border-t border-gray-200">
                 <button className="w-full py-4 bg-black text-white text-[11px] font-black rounded-2xl hover:bg-gray-800 transition-all uppercase tracking-widest shadow-lg shadow-black/10">
                     Switch Engine
                 </button>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}
