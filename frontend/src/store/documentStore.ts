import { create } from 'zustand';
import type { Document } from '@/types';

interface DocumentStore {
  documents: Document[];
  currentDoc: Document | null;
  setCurrentDoc: (doc: Document) => void;
  addDocument: (doc: Document) => void;
  updateDocument: (id: string, updates: Partial<Document>) => void;
}

export const useDocumentStore = create<DocumentStore>((set) => ({
  documents: [],
  currentDoc: null,

  setCurrentDoc: (doc) => set({ currentDoc: doc }),

  addDocument: (doc) =>
    set((state) => ({
      documents: [
        doc,
        ...state.documents.filter((d) => d.id !== doc.id),
      ],
    })),

  updateDocument: (id, updates) =>
    set((state) => ({
      documents: state.documents.map((d) =>
        d.id === id ? { ...d, ...updates } : d
      ),
      currentDoc:
        state.currentDoc?.id === id
          ? { ...state.currentDoc, ...updates }
          : state.currentDoc,
    })),
}));
