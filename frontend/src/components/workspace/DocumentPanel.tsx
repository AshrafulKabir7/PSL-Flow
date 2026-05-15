'use client';

import { FileText, Info, Hash, Users, Calendar } from 'lucide-react';
import type { Document, Chunk } from '@/types';
import { useDraftStore } from '@/store/draftStore';
import { formatDateTime, cn } from '@/lib/utils';

interface Props {
  document: Document;
  chunks: Chunk[];
}

export function DocumentPanel({ document, chunks }: Props) {
  const { activeCitationId } = useDraftStore();
  const fields = document.structured_fields;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center">
            <FileText className="w-4 h-4 text-gray-400" />
          </div>
          <h2 className="font-bold text-gray-900 text-sm tracking-tight">Source Document</h2>
        </div>
        <p className="text-[10px] text-gray-400 mt-1 font-bold uppercase tracking-widest truncate">{document.filename}</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Document metadata */}
        <div className="p-6 border-b border-gray-50 bg-gray-50/30">
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-[11px] font-medium text-gray-500">
              <Info className="w-4 h-4 text-gray-300" />
              <span>Uploaded {formatDateTime(document.uploaded_at)}</span>
            </div>

            {document.page_count && (
              <div className="flex items-center gap-3 text-[11px] font-medium text-gray-500">
                <FileText className="w-4 h-4 text-gray-300" />
                <span>{document.page_count} pages</span>
              </div>
            )}

            {document.ocr_confidence != null && (
              <div className="flex items-center gap-3 text-[11px] font-medium">
                <div className="w-4 h-4 rounded-full border-2 border-gray-100 flex items-center justify-center">
                   <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                </div>
                <span className="text-gray-400">OCR Confidence:</span>
                <span
                  className={`font-black ${
                    document.ocr_confidence >= 0.9
                      ? 'text-emerald-500'
                      : document.ocr_confidence >= 0.7
                      ? 'text-amber-500'
                      : 'text-red-500'
                  }`}
                >
                  {(document.ocr_confidence * 100).toFixed(0)}%
                </span>
              </div>
            )}
          </div>

          {/* Structured fields quick view */}
          {fields && (
            <div className="mt-5 space-y-4">
              {fields.document_type && (
                <div className="flex items-start gap-3 p-3 bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Type</p>
                    <p className="text-xs font-bold text-gray-800">{fields.document_type}</p>
                  </div>
                </div>
              )}

              {fields.case_number && (
                <div className="flex items-start gap-3 p-3 bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Hash className="w-3.5 h-3.5 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Case Number</p>
                    <p className="text-xs font-bold text-gray-800 tracking-tight">{fields.case_number}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Text content with chunk highlights */}
        <div className="p-6">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">
            Document Text
          </p>

          {chunks.length === 0 ? (
            <div className="py-12 flex flex-col items-center gap-3 text-center">
                <FileText className="w-8 h-8 text-gray-100" />
                <p className="text-xs text-gray-300 font-medium italic">No text chunks available.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {chunks.map((chunk) => {
                const isActive = activeCitationId === chunk.chunk_id;
                return (
                  <div
                    key={chunk.chunk_id}
                    className={`
                      rounded-2xl border p-4 transition-all duration-300 text-xs leading-relaxed
                      ${isActive
                        ? 'bg-amber-50 border-amber-200 shadow-lg shadow-amber-200/20 ring-1 ring-amber-400'
                        : 'bg-white border-gray-100 hover:border-gray-200'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">
                        Page {chunk.page_number}
                      </span>
                      {isActive && (
                        <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            <span className="text-[9px] text-amber-600 font-black uppercase tracking-widest">
                                Active Citation
                            </span>
                        </div>
                      )}
                    </div>
                    <p className={cn("text-gray-600 font-medium", isActive && "text-gray-900")}>{chunk.text}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
