'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
} from 'recharts';
import { TrendingDown } from 'lucide-react';

interface DataPoint {
  draft_number: number;
  edit_distance: number;
  date: string;
}

interface Props {
  data: DataPoint[];
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-lg text-xs">
      <p className="font-semibold text-slate-700 mb-1">Draft #{label}</p>
      <p className="text-amber-600">
        Edit distance: <span className="font-bold text-base">{payload[0].value}</span>
      </p>
    </div>
  );
}

export function ImprovementChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-[var(--shadow-card)] p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown className="w-5 h-5 text-amber-500" />
          <h2 className="font-semibold text-slate-800">Edit Distance Over Time</h2>
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">(lower = better)</span>
        </div>
        <div className="flex flex-col items-center gap-3 py-12 text-slate-400">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
            <TrendingDown className="w-6 h-6 text-slate-300" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-slate-500">No improvement data yet</p>
            <p className="text-xs text-slate-400 mt-0.5">Submit edits to documents to track pattern learning</p>
          </div>
        </div>
      </div>
    );
  }

  const avgDistance = data.reduce((sum, d) => sum + d.edit_distance, 0) / data.length;
  const minDistance = Math.min(...data.map((d) => d.edit_distance));
  const maxDistance = Math.max(...data.map((d) => d.edit_distance));
  const trend = data.length > 1
    ? data[data.length - 1].edit_distance < data[0].edit_distance
      ? 'improving'
      : 'needs-work'
    : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-[var(--shadow-card)] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-amber-500" />
            <h2 className="font-semibold text-slate-800">Edit Distance Over Time</h2>
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">(lower = better)</span>
          </div>
          {trend && (
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
              trend === 'improving'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700'
            }`}>
              {trend === 'improving' ? '↓ Improving' : '→ Needs work'}
            </span>
          )}
        </div>

        {/* Mini stats */}
        <div className="flex items-center gap-6 mt-3">
          {[
            { label: 'Average', value: avgDistance.toFixed(0), color: 'text-amber-600' },
            { label: 'Best',    value: minDistance,             color: 'text-emerald-600' },
            { label: 'Worst',   value: maxDistance,             color: 'text-red-500' },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <p className="text-xs text-slate-400">{label}</p>
              <p className={`text-lg font-bold ${color} leading-tight`}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="px-6 pb-6 pt-4">
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <defs>
              <linearGradient id="editDistGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#F59E0B" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis
              dataKey="draft_number"
              tick={{ fontSize: 11, fill: '#94A3B8' }}
              label={{ value: 'Draft #', position: 'insideBottom', offset: -2, fill: '#94A3B8', fontSize: 11 }}
            />
            <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={avgDistance}
              stroke="#F59E0B"
              strokeDasharray="4 2"
              strokeOpacity={0.4}
              label={{ value: 'Avg', fill: '#F59E0B', fontSize: 10, position: 'right' }}
            />
            <Area
              type="monotone"
              dataKey="edit_distance"
              stroke="#F59E0B"
              strokeWidth={2.5}
              fill="url(#editDistGrad)"
              dot={{ fill: '#F59E0B', r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6, fill: '#D97706', strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
