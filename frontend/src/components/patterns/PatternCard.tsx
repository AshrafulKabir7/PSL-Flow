'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, ArrowRight, ToggleLeft, ToggleRight, Zap } from 'lucide-react';
import type { Pattern } from '@/types';

const CATEGORY_STYLES: Record<Pattern['category'], { pill: string; bg: string }> = {
  Tone:      { pill: 'bg-blue-100 text-blue-700',    bg: 'bg-blue-50 border-blue-200' },
  Structure: { pill: 'bg-amber-100 text-amber-700',  bg: 'bg-amber-50 border-amber-200' },
  Content:   { pill: 'bg-emerald-100 text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  Citation:  { pill: 'bg-purple-100 text-purple-700', bg: 'bg-purple-50 border-purple-200' },
};

const CONFIDENCE_STYLES: Record<Pattern['confidence'], string> = {
  low:    'bg-red-100 text-red-600',
  medium: 'bg-amber-100 text-amber-600',
  high:   'bg-emerald-100 text-emerald-700',
};

interface Props {
  pattern: Pattern;
  onToggle: (id: string, active: boolean) => void;
  isToggling?: boolean;
}

export function PatternCard({ pattern, onToggle, isToggling }: Props) {
  const [showExample, setShowExample] = useState(false);
  const cat = CATEGORY_STYLES[pattern.category];

  return (
    <div
      className={`bg-white rounded-2xl border shadow-[var(--shadow-card)] transition-all overflow-hidden ${
        pattern.active ? 'border-slate-200' : 'border-slate-200 opacity-60'
      }`}
    >
      {/* ── Category color bar ─── */}
      <div className={`h-1 ${pattern.active ? `${cat.bg.split(' ')[0].replace('bg-', 'bg-')}` : 'bg-slate-100'}`}
        style={{ height: '3px' }}
      />

      <div className="p-5">
        {/* ── Header row ───────── */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 leading-snug">
              {pattern.description}
            </p>

            <div className="flex items-center flex-wrap gap-1.5 mt-3">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cat.pill}`}>
                {pattern.category}
              </span>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${CONFIDENCE_STYLES[pattern.confidence]}`}>
                {pattern.confidence === 'high' && <span className="mr-0.5">★</span>}
                {pattern.confidence} confidence
              </span>
              <span className="flex items-center gap-1 text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                <Zap className="w-3 h-3" />
                {pattern.frequency} use{pattern.frequency !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Toggle */}
          <button
            onClick={() => onToggle(pattern.id, !pattern.active)}
            disabled={isToggling}
            title={pattern.active ? 'Disable pattern' : 'Enable pattern'}
            className="flex-shrink-0 transition-all disabled:opacity-40"
          >
            {pattern.active ? (
              <ToggleRight className="w-8 h-8 text-emerald-500" />
            ) : (
              <ToggleLeft className="w-8 h-8 text-slate-400" />
            )}
          </button>
        </div>

        {/* ── Example toggle ────── */}
        {(pattern.example_before || pattern.example_after) && (
          <button
            onClick={() => setShowExample(!showExample)}
            className="mt-4 flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700 font-semibold transition-colors"
          >
            {showExample ? (
              <><ChevronUp className="w-3.5 h-3.5" /> Hide example</>
            ) : (
              <><ChevronDown className="w-3.5 h-3.5" /> View example</>
            )}
          </button>
        )}

        {/* ── Before/After ─────── */}
        {showExample && (
          <div className="mt-3 grid grid-cols-[1fr_auto_1fr] gap-2 items-start">
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1.5">Before</p>
              <p className="text-xs text-slate-600 leading-relaxed">{pattern.example_before}</p>
            </div>
            <div className="flex items-center justify-center pt-6">
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-1.5">After</p>
              <p className="text-xs text-slate-600 leading-relaxed">{pattern.example_after}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
