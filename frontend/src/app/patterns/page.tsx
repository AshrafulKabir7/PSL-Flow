'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Lightbulb, AlertCircle, Filter, Search, TrendingDown, Zap, CheckCircle2 } from 'lucide-react';
import { useState, useMemo } from 'react';
import { PatternCard } from '@/components/patterns/PatternCard';
import { ImprovementChart } from '@/components/patterns/ImprovementChart';
import { api } from '@/lib/api';
import type { Pattern } from '@/types';

type CategoryFilter = 'All' | Pattern['category'];

export default function PatternsPage() {
  const queryClient = useQueryClient();
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('All');
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [search, setSearch] = useState('');

  const { data: patterns, isLoading, error } = useQuery({
    queryKey: ['patterns'],
    queryFn: api.patterns.list,
  });

  const { data: statsData } = useQuery({
    queryKey: ['patterns-stats'],
    queryFn: api.patterns.stats,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.patterns.toggle(id, active),
    onSuccess: (updated) => {
      queryClient.setQueryData<Pattern[]>(['patterns'], (old) =>
        old?.map((p) => (p.id === updated.id ? updated : p))
      );
    },
  });

  const categories: CategoryFilter[] = ['All', 'Tone', 'Structure', 'Content', 'Citation'];

  const filtered = useMemo(() => {
    return (patterns || []).filter((p) => {
      if (categoryFilter !== 'All' && p.category !== categoryFilter) return false;
      if (showActiveOnly && !p.active) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !p.description.toLowerCase().includes(q) &&
          !p.category.toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [patterns, categoryFilter, showActiveOnly, search]);

  const totalPatterns = patterns?.length ?? 0;
  const activeCount = patterns?.filter((p) => p.active).length ?? 0;
  const highConfidence = patterns?.filter((p) => p.confidence === 'high').length ?? 0;
  const totalUsage = patterns?.reduce((sum, p) => sum + p.frequency, 0) ?? 0;

  const catColors: Record<Pattern['category'], string> = {
    Tone: 'bg-blue-100 text-blue-700',
    Structure: 'bg-amber-100 text-amber-700',
    Content: 'bg-emerald-100 text-emerald-700',
    Citation: 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--page-bg)' }}>
      {/* ── Header ─────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Pattern Library</h1>
              <p className="text-sm text-slate-500">
                Learned editing patterns from your corrections
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-emerald-100 text-emerald-700 font-semibold px-3 py-1.5 rounded-full">
              {activeCount} active
            </span>
            <span className="text-xs bg-slate-100 text-slate-600 font-medium px-3 py-1.5 rounded-full">
              {totalPatterns} total
            </span>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 space-y-6">
        {/* ── Stats ───────────────────────────────────────  */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Lightbulb,    label: 'Total Patterns',  value: totalPatterns, color: 'bg-amber-100 text-amber-600' },
            { icon: CheckCircle2, label: 'Active',          value: activeCount,   color: 'bg-emerald-100 text-emerald-600' },
            { icon: Zap,          label: 'High Confidence', value: highConfidence, color: 'bg-purple-100 text-purple-600' },
            { icon: TrendingDown, label: 'Total Uses',      value: totalUsage,    color: 'bg-blue-100 text-blue-600' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div
              key={label}
              className="bg-white rounded-2xl border border-slate-200 shadow-[var(--shadow-card)] px-5 py-4 flex items-center gap-3"
            >
              <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 leading-none">
                  {isLoading ? '—' : value}
                </p>
                <p className="text-xs text-slate-500 mt-1">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Improvement chart ───────────────────────────── */}
        <ImprovementChart data={statsData?.data || []} />

        {/* ── Filters ─────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-[var(--shadow-card)] p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search patterns…"
                className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition-all"
              />
            </div>

            {/* Category filter */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl flex-shrink-0">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    categoryFilter === cat
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Active only toggle */}
            <button
              onClick={() => setShowActiveOnly(!showActiveOnly)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-all flex-shrink-0 ${
                showActiveOnly
                  ? 'bg-emerald-500 text-white border-emerald-500'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              Active Only
            </button>
          </div>
        </div>

        {/* ── Category breakdown (quick pills) ──────────── */}
        {!isLoading && (patterns || []).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {(['Tone', 'Structure', 'Content', 'Citation'] as Pattern['category'][]).map((cat) => {
              const count = (patterns || []).filter((p) => p.category === cat).length;
              if (count === 0) return null;
              return (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(categoryFilter === cat ? 'All' : cat)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    categoryFilter === cat
                      ? `${catColors[cat]} border-current border-opacity-30`
                      : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {cat}
                  <span className="bg-black/10 rounded px-1">{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Pattern grid ───────────────────────────────── */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-36 skeleton-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-2xl p-5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            Unable to load patterns. Is the backend running?
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 bg-white rounded-2xl border border-slate-200">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center">
              <Lightbulb className="w-7 h-7 text-amber-300" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-slate-600">No patterns found</p>
              <p className="text-sm text-slate-400 mt-1">
                {totalPatterns === 0
                  ? 'Submit edits to documents to start generating patterns.'
                  : 'Try adjusting your filters.'}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((pattern) => (
                <PatternCard
                  key={pattern.id}
                  pattern={pattern}
                  onToggle={(id, active) => toggleMutation.mutate({ id, active })}
                  isToggling={
                    toggleMutation.isPending && toggleMutation.variables?.id === pattern.id
                  }
                />
              ))}
            </div>
            <p className="text-xs text-slate-400 text-center">
              Showing {filtered.length} of {totalPatterns} pattern{totalPatterns !== 1 ? 's' : ''}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
