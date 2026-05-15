'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '@/lib/api';

interface Props {
  docId: string;
  isReady: boolean;
  ocrConfidence: number | null;
}

export function RawTextPreview({ docId, isReady, ocrConfidence }: Props) {
  const [showMore, setShowMore] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['extraction', docId],
    queryFn: () => api.documents.getExtraction(docId),
    enabled: isReady,
    staleTime: Infinity,
  });

  const rawText = data?.raw_text || '';
  const truncated = rawText.slice(0, 2000);
  const hasMore = rawText.length > 2000;
  const displayText = showMore ? rawText : truncated;

  const confidenceColor =
    ocrConfidence != null
      ? ocrConfidence >= 0.9
        ? 'bg-green-100 text-green-700'
        : ocrConfidence >= 0.7
        ? 'bg-amber-100 text-amber-700'
        : 'bg-red-100 text-red-700'
      : 'bg-slate-100 text-slate-500';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-slate-800">Raw OCR Text</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Extracted text from the document
          </p>
        </div>
        {ocrConfidence != null && (
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${confidenceColor}`}
          >
            {(ocrConfidence * 100).toFixed(1)}% confidence
          </span>
        )}
      </div>

      <div className="p-4">
        {!isReady || isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-4 bg-slate-100 rounded animate-pulse"
                style={{ width: `${60 + Math.random() * 40}%` }}
              />
            ))}
          </div>
        ) : rawText ? (
          <>
            <div className="max-h-64 overflow-y-auto">
              <pre className="text-xs text-slate-600 font-mono whitespace-pre-wrap leading-relaxed">
                {displayText}
                {!showMore && hasMore && '...'}
              </pre>
            </div>
            {hasMore && (
              <button
                onClick={() => setShowMore(!showMore)}
                className="mt-3 flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium transition-colors"
              >
                {showMore ? (
                  <>
                    <ChevronUp className="w-3 h-3" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3" />
                    Show more ({rawText.length - 2000} more chars)
                  </>
                )}
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
            <FileText className="w-6 h-6" />
            <p className="text-xs">No raw text available</p>
          </div>
        )}
      </div>
    </div>
  );
}
