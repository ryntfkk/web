"use client";

import { useState, useCallback, useRef } from 'react';
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
  const [files, setFiles] = useState<File[]>(value);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAddPhotos = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return;
    const arrayFiles = Array.from(newFiles);
    
    // Filter out non-images
    const validFiles = arrayFiles.filter(f => f.type.startsWith('image/'));
    
    setFiles(prev => {
      const next = [...prev, ...validFiles].slice(0, maxPhotos);
      onChange?.(next);
      return next;
    });
  }, [maxPhotos, onChange]);

  const handleRemove = (index: number) => {
    setFiles(prev => {
      const next = prev.filter((_, i) => i !== index);
      onChange?.(next);
      return next;
    });
  };

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-3">
        {files.map((file, index) => {
          const objectUrl = URL.createObjectURL(file);
          return (
            <div key={index} className="relative w-20 h-20 rounded-md border border-[#e5e2e1] overflow-hidden group shrink-0">
              <img src={objectUrl} alt={`Preview ${index}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}

        {files.length < maxPhotos && (
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
            <span className="text-[10px] opacity-70 leading-none">{files.length}/{maxPhotos}</span>
          </button>
        )}
      </div>
      
      {error && <p className="text-xs text-[#E53E3E] mt-1">{error}</p>}
      
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
