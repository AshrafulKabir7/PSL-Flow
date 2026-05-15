export type Document = {
  id: string;
  filename: string;
  file_type: string;
  status: 'uploading' | 'ocr' | 'extracting' | 'indexing' | 'ready' | 'error';
  ocr_strategy: string | null;
  ocr_confidence: number | null;
  page_count: number | null;
  uploaded_at: string;
  structured_fields: {
    case_number: string | null;
    document_type: string;
    parties: string[];
    date_filed: string | null;
    jurisdiction: string | null;
    key_claims: string[];
    key_dates: Array<{ label: string; date: string }>;
    referenced_statutes: string[];
    summary_one_line: string;
  } | null;
};

export type Citation = {
  superscript: number;
  chunk_id: string;
  page_number: number;
  excerpt: string;
  score: number;
};

export type Draft = {
  id: string;
  doc_id: string;
  content_markdown: string;
  citations: Citation[];
  grounding_report: {
    parties: 'grounded' | 'partially_grounded' | 'unsupported';
    claims: 'grounded' | 'partially_grounded' | 'unsupported';
    timeline: 'grounded' | 'partially_grounded' | 'unsupported';
    relief: 'grounded' | 'partially_grounded' | 'unsupported';
  };
  patterns_applied: string[];
  generated_at: string;
  version: number;
};

export type Chunk = {
  chunk_id: string;
  doc_id: string;
  page_number: number;
  score: number;
  text: string;
  ocr_confidence: number;
};

export type Pattern = {
  id: string;
  description: string;
  category: 'Tone' | 'Structure' | 'Content' | 'Citation';
  confidence: 'low' | 'medium' | 'high';
  example_before: string;
  example_after: string;
  frequency: number;
  active: boolean;
  created_at: string;
};

export type SSEEvent =
  | {
      type: 'pipeline_step';
      step: string;
      status: 'running' | 'complete' | 'error';
      message?: string;
      confidence?: number;
      chunk_count?: number;
    }
  | { type: 'ready'; doc_id: string }
  | { type: 'error'; message: string };

export type PipelineStep = {
  step: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  message?: string;
  confidence?: number;
  chunk_count?: number;
};
