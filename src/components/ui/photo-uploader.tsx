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
      <div className="flex flex-wrap gap-3">
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
              "w-20 h-20 rounded-md border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors shrink-0",
              error ? "border-[#E53E3E] bg-[#FFF5F5] text-[#E53E3E]" : "border-[#e5e2e1] bg-[#f7f5f4] hover:bg-[#f4f0ef] text-[#9e8e8c]"
            )}
          >
            <Camera className="w-5 h-5" />
            <span className="text-[10px] font-medium leading-none">Tambah</span>
            <span className="text-[10px] opacity-70 leading-none">{value.length}/{maxPhotos}</span>
          </button>
        )}
      </div>
      
      {(error || internalError) && <p className="text-xs text-[#E53E3E] mt-1">{error || internalError}</p>}
      
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
    <div className="relative w-20 h-20 rounded-md border border-[#e5e2e1] overflow-hidden group shrink-0">
      {url && <img src={url} alt={`Preview`} className="w-full h-full object-cover" />}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
