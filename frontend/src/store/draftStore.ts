import { create } from 'zustand';
import type { Draft, Chunk } from '@/types';

interface DraftStore {
  draft: Draft | null;
  evidence: Chunk[];
  activeCitationId: string | null;
  setDraft: (draft: Draft) => void;
  setEvidence: (chunks: Chunk[]) => void;
  setActiveCitation: (chunkId: string | null) => void;
}

export const useDraftStore = create<DraftStore>((set) => ({
  draft: null,
  evidence: [],
  activeCitationId: null,

  setDraft: (draft) => set({ draft }),

  setEvidence: (chunks) => set({ evidence: chunks }),

  setActiveCitation: (chunkId) => set({ activeCitationId: chunkId }),
}));
