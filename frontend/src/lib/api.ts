import type { Document, Draft, Chunk, Pattern } from '@/types';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error');
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  documents: {
    list: (): Promise<Document[]> =>
      fetch(`${API}/api/documents`)
        .then((r) => handleResponse<{ documents: Document[] }>(r))
        .then((data) => data.documents),

    get: (id: string): Promise<Document> =>
      fetch(`${API}/api/documents/${id}`).then((r) =>
        handleResponse<Document>(r)
      ),

    upload: (file: File): Promise<{ id: string; status: string; filename: string }> => {
      const form = new FormData();
      form.append('file', file);
      return fetch(`${API}/api/documents`, {
        method: 'POST',
        body: form,
      }).then((r) =>
        handleResponse<{ id: string; status: string; filename: string }>(r)
      );
    },

    getExtraction: (
      id: string
    ): Promise<{ structured_fields: Document['structured_fields']; raw_text: string }> =>
      fetch(`${API}/api/documents/${id}/extraction`).then((r) =>
        handleResponse<{
          structured_fields: Document['structured_fields'];
          raw_text: string;
        }>(r)
      ),

    generateDraft: (id: string): Promise<Draft> =>
      fetch(`${API}/api/documents/${id}/draft`, {
        method: 'POST',
      }).then((r) => handleResponse<Draft>(r)),

    delete: (id: string): Promise<void> =>
      fetch(`${API}/api/documents/${id}`, { method: 'DELETE' }).then((r) => {
        if (!r.ok && r.status !== 204) throw new Error(`Delete failed: ${r.status}`);
      }),
  },

  drafts: {
    get: (id: string): Promise<Draft> =>
      fetch(`${API}/api/drafts/${id}`).then((r) => handleResponse<Draft>(r)),

    save: (id: string, content: string): Promise<Draft> =>
      fetch(`${API}/api/drafts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      }).then((r) => handleResponse<Draft>(r)),

    getEvidence: (id: string): Promise<Chunk[]> =>
      fetch(`${API}/api/drafts/${id}/evidence`)
        .then((r) => handleResponse<{ draft_id: string; doc_id: string; evidence: Chunk[] }>(r))
        .then((data) => data.evidence),

    submitEdit: (
      id: string,
      editedContent: string
    ): Promise<{ edit_id: string; patterns_extracted: number }> =>
      fetch(`${API}/api/drafts/${id}/edits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ edited_content: editedContent }),
      }).then((r) =>
        handleResponse<{ edit_id: string; patterns_extracted: number }>(r)
      ),
  },

  patterns: {
    list: (): Promise<Pattern[]> =>
      fetch(`${API}/api/patterns`)
        .then((r) => handleResponse<{ patterns: Pattern[] }>(r))
        .then((data) => data.patterns),

    toggle: (id: string, active: boolean): Promise<Pattern> =>
      fetch(`${API}/api/patterns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      }).then((r) => handleResponse<Pattern>(r)),

    delete: (id: string): Promise<void> =>
      fetch(`${API}/api/patterns/${id}`, { method: 'DELETE' }).then((r) => {
        if (!r.ok) throw new Error(`Delete failed: ${r.status}`);
      }),

    stats: (): Promise<{
      data: Array<{ draft_number: number; edit_distance: number; date: string }>;
    }> =>
      fetch(`${API}/api/patterns/stats`)
        .then((r) => handleResponse<{ trend: Array<{ draft_number: number; edit_distance: number; date: string }> }>(r))
        .then((data) => ({ data: data.trend })),
  },

  health: {
    check: (): Promise<boolean> =>
      fetch(`${API}/health`, { signal: AbortSignal.timeout(3000) })
        .then((r) => r.ok)
        .catch(() => false),
  },
};
