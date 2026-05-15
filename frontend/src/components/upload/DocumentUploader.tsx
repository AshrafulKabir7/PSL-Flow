'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useRouter } from 'next/navigation';
import { Upload, FileText, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDocumentUpload } from '@/hooks/useDocumentUpload';
import { useDocumentStore } from '@/store/documentStore';
import { formatBytes, cn } from '@/lib/utils';

const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/tiff': ['.tiff', '.tif'],
};

export function DocumentUploader() {
  const router = useRouter();
  const { upload, isUploading, error } = useDocumentUpload();
  const addDocument = useDocumentStore((s) => s.addDocument);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [typeError, setTypeError] = useState<string | null>(null);

  const onDrop = useCallback((accepted: File[], rejected: unknown[]) => {
    setTypeError(null);
    if (rejected.length > 0) {
      setTypeError('Unsupported file type. Upload a PDF, JPG, PNG, or TIFF.');
      return;
    }
    if (accepted.length > 0) setSelectedFile(accepted[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxFiles: 1,
    disabled: isUploading,
  });

  const handleUpload = async () => {
    if (!selectedFile) return;
    const result = await upload(selectedFile);
    if (result) {
      addDocument({
        id: result.id,
        filename: selectedFile.name,
        file_type: selectedFile.type,
        status: 'uploading',
        ocr_strategy: null,
        ocr_confidence: null,
        page_count: null,
        uploaded_at: new Date().toISOString(),
        structured_fields: null,
      });
      router.push(`/documents/${result.id}`);
    }
  };

  const clearFile = () => { setSelectedFile(null); setTypeError(null); };
  const displayError = typeError || error;

  return (
    <div className="w-full">
      {/* ── Drop Zone ──────────────────────────────── */}
      <div
        {...getRootProps()}
        className={cn(
          "relative border-2 border-dashed rounded-[28px] p-10 cursor-pointer transition-all duration-300",
          isDragActive
            ? "border-black bg-gray-50 scale-[1.02]"
            : selectedFile
            ? "border-emerald-500 bg-emerald-50/30"
            : "border-gray-200 bg-white hover:border-black hover:bg-gray-50",
          isUploading && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />

        <AnimatePresence mode="wait">
          {selectedFile ? (
            <motion.div
              key="selected"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center gap-4 text-center"
            >
              <div className="w-16 h-16 rounded-[24px] bg-emerald-500 flex items-center justify-center shadow-xl shadow-emerald-500/20">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="font-black text-gray-900 text-lg tracking-tight">{selectedFile.name}</p>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">{formatBytes(selectedFile.size)}</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center gap-4 text-center"
            >
              <motion.div
                animate={isDragActive ? { y: -5, scale: 1.1 } : { y: 0, scale: 1 }}
                className="w-16 h-16 rounded-[24px] bg-black flex items-center justify-center shadow-2xl shadow-black/10"
              >
                <Upload className="w-8 h-8 text-white" />
              </motion.div>
              <div>
                <p className="font-black text-gray-900 text-lg tracking-tight">
                  {isDragActive ? 'Release to process' : 'Drag & drop document'}
                </p>
                <p className="text-xs text-gray-400 font-medium mt-2">
                  or <span className="text-black font-black underline underline-offset-4 cursor-pointer">browse your files</span>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Error ────────────────────────────────────── */}
      <AnimatePresence>
        {displayError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 flex items-start gap-3 text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-2xl px-5 py-4 shadow-sm"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span className="leading-relaxed uppercase tracking-tight">{displayError}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Actions ──────────────────────────────────── */}
      <div className="mt-6 flex items-center gap-3">
        {selectedFile && !isUploading && (
          <button
            onClick={clearFile}
            className="flex items-center gap-2 px-5 py-3.5 text-xs font-black text-gray-400 hover:text-black bg-gray-100 hover:bg-gray-200 rounded-2xl transition-all uppercase tracking-widest"
          >
            <X className="w-4 h-4" />
            Clear
          </button>
        )}

        <button
          onClick={handleUpload}
          disabled={!selectedFile || isUploading}
          className={cn(
            "flex-1 flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-black text-xs transition-all uppercase tracking-[0.2em] shadow-xl",
            selectedFile && !isUploading
              ? "bg-black hover:bg-gray-800 text-white shadow-black/10 hover:shadow-black/20"
              : "bg-gray-100 text-gray-300 cursor-not-allowed shadow-none"
          )}
        >
          {isUploading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Upload & Analyse
            </>
          )}
        </button>
      </div>
    </div>
  );
}
