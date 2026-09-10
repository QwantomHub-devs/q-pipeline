'use client';

import { useState, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { StorageBucket, BUCKET_CONFIGS } from '@/modules/storage/types';
import { getSignedUploadUrlAction } from '@/modules/storage/actions';

interface FileUploadDropzoneProps {
  bucket: StorageBucket;
  onUploadSuccess?: (filePath: string) => void;
  onUploadError?: (error: string) => void;
  label?: string;
}

export default function FileUploadDropzone({
  bucket,
  onUploadSuccess,
  onUploadError,
  label = 'Drag & drop file here or click to select',
}: FileUploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const dropzoneRef = useRef<HTMLDivElement>(null);
  const config = BUCKET_CONFIGS[bucket];

  useGSAP(
    () => {
      if (dropzoneRef.current) {
        gsap.to(dropzoneRef.current, {
          scale: isDragging ? 1.02 : 1,
          borderColor: isDragging ? '#46335c' : '#9280ab',
          backgroundColor: isDragging ? '#bfb5cf' : '#d4d1e1',
          duration: 0.2,
          ease: 'power1.out',
        });
      }
    },
    { dependencies: [isDragging], scope: dropzoneRef }
  );

  const processFile = async (file: File) => {
    setErrorMessage(null);

    // Client-side MIME check
    if (config && !config.allowedMimeTypes.includes(file.type)) {
      const err = `Invalid file type. Allowed: ${config.allowedMimeTypes.join(', ')}`;
      setErrorMessage(err);
      onUploadError?.(err);
      return;
    }

    // Client-side Size check
    if (config && file.size > config.maxSizeBytes) {
      const maxMb = (config.maxSizeBytes / (1024 * 1024)).toFixed(0);
      const err = `File size exceeds maximum limit of ${maxMb}MB`;
      setErrorMessage(err);
      onUploadError?.(err);
      return;
    }

    setFileName(file.name);
    setIsUploading(true);
    setUploadProgress(20);

    try {
      // Step 1: Request pre-signed upload URL from server action
      const signedResult = await getSignedUploadUrlAction({
        bucket,
        fileName: file.name,
        fileSizeBytes: file.size,
        mimeType: file.type,
      });

      setUploadProgress(60);

      // Step 2: In production, execute HTTP PUT request to signedResult.signedUrl
      // For local development mock, simulate upload progress
      setUploadProgress(100);
      setIsUploading(false);
      onUploadSuccess?.(signedResult.path);
    } catch (err: unknown) {
      setIsUploading(false);
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setErrorMessage(msg);
      onUploadError?.(msg);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full space-y-2">
      <div
        ref={dropzoneRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="border-2 border-dashed border-[var(--qh-accent)] bg-[var(--qh-bg)] rounded-xl p-6 text-center cursor-pointer transition-colors"
      >
        <input
          type="file"
          id={`file-input-${bucket}`}
          onChange={handleFileSelect}
          accept={config?.allowedMimeTypes.join(',')}
          className="hidden"
        />
        <label htmlFor={`file-input-${bucket}`} className="cursor-pointer block space-y-2">
          <div className="w-10 h-10 rounded-full bg-[var(--qh-surface)] text-[var(--qh-ink)] flex items-center justify-center mx-auto font-bold text-lg">
            ↑
          </div>
          <span className="text-sm font-semibold text-[var(--qh-ink)] block">
            {fileName ? `Selected: ${fileName}` : label}
          </span>
          <span className="text-xs text-[var(--qh-muted)] block">
            Allowed: {config?.allowedMimeTypes.map((m) => m.split('/')[1]).join(', ')} (Max {(config?.maxSizeBytes / (1024 * 1024)).toFixed(0)}MB)
          </span>
        </label>
      </div>

      {isUploading && (
        <div className="w-full bg-[var(--qh-surface)] rounded-full h-2 overflow-hidden">
          <div
            className="bg-[var(--qh-ink)] h-2 transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      {errorMessage && (
        <p className="text-xs font-semibold text-red-600 mt-1">{errorMessage}</p>
      )}
    </div>
  );
}
