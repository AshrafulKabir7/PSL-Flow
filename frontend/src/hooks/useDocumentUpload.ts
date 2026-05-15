'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

export function useDocumentUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File): Promise<{ id: string } | null> => {
    setIsUploading(true);
    setError(null);

    try {
      const result = await api.documents.upload(file);
      return { id: result.id };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Upload failed. Please try again.';
      setError(message);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return { upload, isUploading, error };
}
