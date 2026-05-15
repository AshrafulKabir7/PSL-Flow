'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Type } from 'lucide-react';
import { api } from '@/lib/api';
import { markdownToHtml } from '@/lib/utils';
import { EditToolbar } from './EditToolbar';
import { EditSummaryPanel } from './EditSummaryPanel';

interface Props {
  draftId: string;
  initialContent: string;
}

export function DraftEditor({ draftId, initialContent }: Props) {
  const [isSaved, setIsSaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ patternsExtracted: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef(initialContent);

  // Convert raw markdown → HTML so TipTap renders it as rich text
  const htmlContent = markdownToHtml(initialContent);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Begin editing the case fact summary…',
      }),
    ],
    content: htmlContent,
    editorProps: {
      attributes: {
        class: 'ProseMirror focus:outline-none min-h-[500px] px-8 py-6',
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      contentRef.current = html;
      setIsSaved(false);

      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(() => handleAutoSave(html), 3000);
    },
  });

  const handleAutoSave = useCallback(
    async (content: string) => {
      try {
        await api.drafts.save(draftId, content);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
      } catch {
        // silent
      }
    },
    [draftId]
  );

  const handleSubmit = async () => {
    if (!editor) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const content = editor.getHTML();
      const result = await api.drafts.submitEdit(draftId, content);
      setSubmitResult({ patternsExtracted: result.patterns_extracted });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit edits.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const wordCount = editor ? editor.getText().split(/\s+/).filter(Boolean).length : 0;

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <EditToolbar
        editor={editor}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        isSaved={isSaved}
      />

      {error && (
        <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {submitResult && (
        <div className="mx-4 mt-3">
          <EditSummaryPanel
            patternsExtracted={submitResult.patternsExtracted}
            onDismiss={() => setSubmitResult(null)}
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>

      <div className="flex items-center justify-between px-6 py-2 border-t border-slate-100 bg-slate-50">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Type className="w-3 h-3" />
          <span>{wordCount} words</span>
        </div>
        <p className="text-xs text-slate-400">Auto-saves every 3 seconds</p>
      </div>
    </div>
  );
}
