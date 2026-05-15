'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Circle,
  Radio,
  FileSearch,
  Cpu,
  Layers,
  CheckCheck,
  Database,
} from 'lucide-react';
import { useProcessingStream } from '@/hooks/useProcessingStream';
import type { PipelineStep } from '@/types';

const STEP_ICONS = [Radio, FileSearch, Cpu, Layers, CheckCheck];

function StepIcon({ step, index }: { step: PipelineStep; index: number }) {
  const Icon = STEP_ICONS[index] || Database;
  switch (step.status) {
    case 'complete': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
    case 'error':    return <XCircle className="w-5 h-5 text-red-500" />;
    case 'running':  return <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />;
    default:         return <Circle className="w-5 h-5 text-slate-300" />;
  }
}

function StepItem({ step, index }: { step: PipelineStep; index: number }) {
  const colors = {
    running:  { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', tag: 'bg-amber-100 text-amber-700' },
    complete: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', tag: '' },
    error:    { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', tag: '' },
    pending:  { bg: 'bg-white', border: 'border-slate-200', text: 'text-slate-400', tag: '' },
  };
  const c = colors[step.status] || colors.pending;

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.07, duration: 0.25 }}
      className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${c.bg} ${c.border}`}
    >
      <div className="mt-0.5 flex-shrink-0">
        <StepIcon step={step} index={index} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${c.text}`}>{step.step}</p>
        {step.message && (
          <p className="text-xs text-slate-500 mt-1">{step.message}</p>
        )}
        {step.confidence != null && (
          <p className="text-xs text-slate-500 mt-1">
            OCR Confidence: <span className="font-medium">{(step.confidence * 100).toFixed(1)}%</span>
          </p>
        )}
        {step.chunk_count != null && (
          <p className="text-xs text-slate-500 mt-1">
            <span className="font-medium">{step.chunk_count}</span> chunks indexed
          </p>
        )}
      </div>
      {step.status === 'running' && (
        <span className={`flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${c.tag} animate-pulse`}>
          In progress
        </span>
      )}
    </motion.div>
  );
}

export function ProcessingPipeline({ docId }: { docId: string }) {
  const router = useRouter();
  const { steps, isComplete, error, readyDocId } = useProcessingStream(docId);

  useEffect(() => {
    if (isComplete && readyDocId) {
      const timer = setTimeout(() => {
        router.push(`/documents/${readyDocId}/draft`);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isComplete, readyDocId, router]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-[var(--shadow-card)] overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
        <h2 className="font-semibold text-slate-800">Processing Pipeline</h2>
        <p className="text-xs text-slate-500 mt-0.5">Real-time document processing status</p>
      </div>

      <div className="p-4 space-y-2">
        {steps.map((step, i) => (
          <StepItem key={step.step} step={step} index={i} />
        ))}
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-4 mb-4 p-4 bg-red-50 border border-red-200 rounded-xl"
          >
            <p className="text-sm text-red-700 font-semibold">Processing Error</p>
            <p className="text-xs text-red-500 mt-1">{error}</p>
          </motion.div>
        )}

        {isComplete && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mx-4 mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl"
          >
            <p className="text-sm text-emerald-700 font-semibold">
              Processing complete — redirecting to workspace…
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
