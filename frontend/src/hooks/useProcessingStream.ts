'use client';

import { useState, useEffect, useRef } from 'react';
import type { PipelineStep } from '@/types';

const STEP_MAP: Record<string, number> = {
  ocr: 1,
  extracting: 2,
  chunking: 3,
  indexing: 3,
  ready: 4,
};

const PIPELINE_STEPS = [
  'Receiving',
  'OCR / Text Extraction',
  'Field Extraction',
  'Chunking & Indexing',
  'Ready',
];

function initSteps(): PipelineStep[] {
  return PIPELINE_STEPS.map((step) => ({ step, status: 'pending' }));
}

export function useProcessingStream(docId: string) {
  const [steps, setSteps] = useState<PipelineStep[]>(initSteps);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readyDocId, setReadyDocId] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!docId) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const url = `${apiUrl}/api/documents/${docId}/stream`;

    const es = new EventSource(url);
    esRef.current = es;

    // Named event: pipeline_step
    es.addEventListener('pipeline_step', (event) => {
      try {
        const data = JSON.parse(event.data);
        const stepKey: string = data.step || '';
        const status: string = data.status || '';
        const stepIdx = STEP_MAP[stepKey.toLowerCase()] ?? -1;

        setSteps((prev) => {
          const updated = [...prev];
          if (stepIdx >= 0 && stepIdx < updated.length) {
            updated[stepIdx] = {
              ...updated[stepIdx],
              status:
                status === 'running'
                  ? 'running'
                  : status === 'complete' || status === 'warning'
                  ? 'complete'
                  : status === 'error'
                  ? 'error'
                  : updated[stepIdx].status,
              message: data.message,
              confidence: data.confidence,
              chunk_count: data.chunk_count,
            };
            // Mark step 0 (Receiving) complete when OCR starts
            if (stepIdx >= 1 && updated[0].status === 'pending') {
              updated[0] = { ...updated[0], status: 'complete' };
            }
          }
          return updated;
        });
      } catch {
        // ignore parse errors
      }
    });

    // Named event: ready
    es.addEventListener('ready', (event) => {
      try {
        const data = JSON.parse(event.data);
        setSteps((prev) =>
          prev.map((s) => ({ ...s, status: s.status === 'pending' ? 'complete' : s.status }))
        );
        setIsComplete(true);
        setReadyDocId(data.doc_id);
        es.close();
      } catch {
        setIsComplete(true);
        setReadyDocId(docId);
        es.close();
      }
    });

    // Named event: error (server-sent named event, not transport error)
    es.addEventListener('error', (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data);
        setError(data.message || 'Processing failed.');
      } catch {
        setError('Processing failed.');
      }
      es.close();
    });

    // Transport-level error (connection refused, network drop, or SSE reconnect).
    // Do NOT immediately show an error — the server sends keepalive comment lines
    // which some environments misroute to onerror. Check actual DB status first.
    es.onerror = () => {
      setIsComplete((done) => {
        if (!done) {
          fetch(`${apiUrl}/api/documents/${docId}`)
            .then((r) => r.json())
            .then((doc) => {
              if (doc.status === 'ready') {
                setSteps((prev) =>
                  prev.map((s) => ({ ...s, status: s.status === 'pending' ? 'complete' : s.status }))
                );
                setReadyDocId(docId);
                setIsComplete(true);
                es.close();
              } else if (doc.status === 'error' || doc.status === 'failed') {
                setError('Pipeline failed on the server.');
                es.close();
              }
              // Still processing (ocr / extracting / chunking / indexing):
              // leave EventSource open — it auto-reconnects and will
              // receive remaining events once the LLM call finishes.
            })
            .catch(() => {
              // Can't reach backend at all
              setError('Connection to processing stream lost.');
              es.close();
            });
        }
        return done;
      });
    };

    return () => {
      es.close();
    };
  }, [docId]);

  return { steps, isComplete, error, readyDocId };
}
