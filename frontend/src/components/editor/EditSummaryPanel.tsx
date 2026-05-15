'use client';

import { CheckCircle2, Lightbulb, TrendingUp } from 'lucide-react';
import type { Pattern } from '@/types';

interface Props {
  patternsExtracted: number;
  newPatterns?: Pattern[];
  onDismiss?: () => void;
}

export function EditSummaryPanel({ patternsExtracted, newPatterns = [], onDismiss }: Props) {
  return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-green-800">Edits Submitted Successfully</h3>
          <p className="text-sm text-green-600 mt-1">
            Your edits have been analyzed and applied to future drafts.
          </p>

          {/* Patterns count */}
          <div className="mt-4 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-semibold text-slate-700">
              {patternsExtracted} pattern{patternsExtracted !== 1 ? 's' : ''} extracted
            </span>
          </div>

          {/* Applied confirmation */}
          <div className="mt-2 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-slate-600">Applied to future drafts</span>
          </div>

          {/* Pattern descriptions */}
          {newPatterns.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                New Patterns
              </p>
              {newPatterns.map((pattern) => (
                <div
                  key={pattern.id}
                  className="bg-white border border-green-200 rounded-lg px-3 py-2"
                >
                  <p className="text-sm text-slate-700">{pattern.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full
                      ${pattern.category === 'Tone' ? 'bg-blue-100 text-blue-700' :
                        pattern.category === 'Structure' ? 'bg-amber-100 text-amber-700' :
                        pattern.category === 'Content' ? 'bg-green-100 text-green-700' :
                        'bg-purple-100 text-purple-700'}
                    `}>
                      {pattern.category}
                    </span>
                    <span className="text-xs text-slate-400">{pattern.confidence} confidence</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {onDismiss && (
            <button
              onClick={onDismiss}
              className="mt-4 text-sm text-green-700 hover:text-green-800 font-medium underline underline-offset-2 transition-colors"
            >
              Continue editing
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
