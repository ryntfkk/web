"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { Camera, X, UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PhotoUploaderProps {
  maxPhotos?: number;
  value?: File[];
  onChange?: (files: File[]) => void;
  className?: string;
  error?: string;
}

export function PhotoUploader({
  maxPhotos = 3,
  value = [],
  onChange,
  className,
  error,
}: PhotoUploaderProps) {
  const [internalError, setInternalError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAddPhotos = useCallback((newFiles: FileList | null) => {
    setInternalError('');
    if (!newFiles) return;
    const arrayFiles = Array.from(newFiles);
    
    // Validasi tipe dan batas ukuran 5MB
    const maxSize = 5 * 1024 * 1024;
    const validFiles = arrayFiles.filter(f => {
      if (!f.type.startsWith('image/')) return false;
      if (f.size > maxSize) {
        setInternalError(`Ukuran foto ${f.name} melebihi 5MB.`);
        return false;
      }
      return true;
    });
    
    const next = [...value, ...validFiles].slice(0, maxPhotos);
    onChange?.(next);
  }, [maxPhotos, value, onChange]);

  const handleRemove = (index: number) => {
    const next = value.filter((_, i) => i !== index);
    onChange?.(next);
  };

  return (
    <div className={className}>
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-5 md:grid-cols-6">
        {value.map((file, index) => {
          // Fallback to empty string for safety; memory leak is mitigated by next step/React cleanup if managed better,
          // but true safest way is to use a dedicated Preview component. We will do a quick URL creation for now,
          // though typically you'd memoize it or handle unmounts explicitly.
          // Note: In an ideal complex setup, a subcomponent would create/revoke its own URL.
          return (
            <PhotoPreview key={index} file={file} onRemove={() => handleRemove(index)} />
          );
        })}

        {value.length < maxPhotos && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex aspect-square flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed transition-all duration-200",
              error ? "border-brand-error bg-brand-error-soft text-brand-error" : "border-brand-gray-200 bg-brand-gray-50 text-brand-gray-450 hover:border-brand-red hover:bg-brand-red/5 hover:text-brand-red"
            )}
          >
            <Camera className="h-6 w-6" />
            <span className="text-[11px] font-medium leading-none">Tambah</span>
            <span className="text-[10px] font-medium leading-none opacity-70">{value.length}/{maxPhotos}</span>
          </button>
        )}
      </div>
      
      {(error || internalError) && <p className="text-xs text-brand-error mt-1">{error || internalError}</p>}
      
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          handleAddPhotos(e.target.files);
          // reset input
          if (inputRef.current) inputRef.current.value = '';
        }}
      />
    </div>
  );
}

function PhotoPreview({ file, onRemove }: { file: File, onRemove: () => void }) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return (
    <div className="group relative aspect-square overflow-hidden rounded-md border border-brand-gray-100 transition-transform duration-200 hover:scale-[1.02] hover:shadow-md">
      {url && <img src={url} alt={`Preview`} className="h-full w-full object-cover" />}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Hapus foto"
        className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80 md:opacity-0 md:transition-opacity md:group-hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
