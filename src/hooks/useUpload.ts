import { useState } from 'react';
import { fetchAPI } from '@/lib/api';
import { getErrorMessage } from '@/types/api';

export function useUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = async (file: File): Promise<string | null> => {
    setIsUploading(true);
    setError(null);

    try {
      // 1. Get presigned URL
      const presignRes = await fetchAPI<any>('/upload/presign', {
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({
          filename: file.name,
          content_type: file.type,
          file_size: file.size,
          file_type: 'avatar', // Adjust as needed
        }),
      });

      if (!presignRes.success || !presignRes.data) {
        setError(getErrorMessage(presignRes) || 'Gagal memuat URL upload');
        setIsUploading(false);
        return null;
      }

      const { upload_url, file_url, upload_id } = presignRes.data;

      // 2. Upload file to S3
      const s3Res = await fetch(upload_url, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!s3Res.ok) {
        setError('Gagal mengupload file ke penyimpanan');
        setIsUploading(false);
        return null;
      }

      // 3. Confirm upload
      const confirmRes = await fetchAPI<any>('/upload/confirm', {
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({
          upload_id,
          file_type: 'avatar',
        }),
      });

      if (!confirmRes.success) {
        setError(getErrorMessage(confirmRes) || 'Gagal konfirmasi upload');
        setIsUploading(false);
        return null;
      }

      setIsUploading(false);
      return file_url;

    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat upload');
      setIsUploading(false);
      return null;
    }
  };

  return { uploadFile, isUploading, error };
}
