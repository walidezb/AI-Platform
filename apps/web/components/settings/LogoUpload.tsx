'use client';

import React, { useState, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Upload, ImageIcon, Loader2, AlertCircle, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { createApiClient } from '@/lib/api-client';

type Props = {
  currentLogoUrl: string | null;
  onUploadComplete: (url: string) => void;
};

export function LogoUpload({ currentLogoUrl, onUploadComplete }: Props) {
  const { getToken } = useAuth();
  const [preview, setPreview] = useState<string | null>(currentLogoUrl);
  const [isDragging, setDragging] = useState(false);
  const [isUploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const MAX_SIZE_MB = Number(process.env.NEXT_PUBLIC_MAX_LOGO_SIZE_MB ?? 2);
  const MAX_SIZE_B = MAX_SIZE_MB * 1024 * 1024;

  const handleFile = async (file: File) => {
    setError(null);

    // Client-side validation
    if (!file.type.startsWith('image/')) {
      setError('Only image files are allowed');
      return;
    }
    if (file.size > MAX_SIZE_B) {
      setError(`File must be under ${MAX_SIZE_MB}MB`);
      return;
    }

    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    setProgress(0);

    try {
      // 1. Get presigned URL from our API
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png';
      const client = createApiClient(getToken);
      const res = await client.post<{
        success: boolean;
        data: { uploadUrl: string; publicUrl: string; key: string };
      }>('/uploads/org-logo/presign', {
        fileExtension: ext,
        contentType: file.type,
      });
      const { uploadUrl, publicUrl } = res.data;

      // 2. Upload directly to S3 with progress tracking
      await uploadToS3(file, uploadUrl, (pct) => setProgress(pct));

      // 3. Notify parent with the final public URL
      onUploadComplete(publicUrl);
      setProgress(100);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed. Please try again.';
      setError(msg);
      setPreview(currentLogoUrl); // revert preview
    } finally {
      setUploading(false);
    }
  };

  // XMLHttpRequest-based upload with progress tracking
  const uploadToS3 = (
    file: File,
    url: string,
    onProgress: (pct: number) => void,
  ): Promise<void> =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', url);
      xhr.setRequestHeader('Content-Type', file.type);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () =>
        xhr.status === 200 || xhr.status === 204
          ? resolve()
          : reject(new Error(`S3 upload failed: ${xhr.status}`));
      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(file);
    });

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Company Logo</label>

      {/* Upload zone */}
      <div
        onClick={() => !isUploading && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'relative flex flex-col items-center justify-center',
          'w-full h-40 rounded-xl border-2 border-dashed',
          'transition-all duration-200 cursor-pointer',
          isDragging
            ? 'border-primary/60 bg-primary/5 scale-[1.01]'
            : 'border-border hover:border-primary/40 hover:bg-secondary/30',
          isUploading && 'pointer-events-none opacity-70',
        )}
      >
        {/* Current logo preview */}
        {preview ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Company logo"
              className="h-20 w-20 object-contain rounded-lg border border-border"
            />
            {!isUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg opacity-0 hover:opacity-100 transition-opacity">
                <Upload className="h-5 w-5 text-white" />
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-center px-4">
            <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center">
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">
                Drop your logo here, or <span className="text-primary">browse</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                PNG, JPG, WebP, SVG — max {MAX_SIZE_MB}MB
              </p>
            </div>
          </div>
        )}

        {/* Upload progress overlay */}
        {isUploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/80 rounded-xl">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <div className="w-32">
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-center text-muted-foreground mt-1">
                {progress}%
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-xs text-rose-400 flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </p>
      )}

      {/* Success indicator */}
      {progress === 100 && !isUploading && (
        <p className="text-xs text-emerald-400 flex items-center gap-1.5">
          <Check className="h-3.5 w-3.5" />
          Logo uploaded successfully
        </p>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = ''; // reset so same file can re-upload
        }}
      />

      {/* Remove logo button */}
      {preview && !isUploading && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground hover:text-rose-400"
          onClick={() => {
            setPreview(null);
            setProgress(0);
            onUploadComplete('');
          }}
        >
          <X className="h-3 w-3 mr-1.5" />
          Remove logo
        </Button>
      )}
    </div>
  );
}
