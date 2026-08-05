import { useState } from 'react';
import { fetchAPI } from '@/lib/api';
import { getErrorMessage } from '@/types/api';

/**
 * Upload file ke S3 lewat presigned URL.
 *
 * `fileType` menentukan prefix object key di bucket dan HARUS ada di
 * `allowedFileTypes` backend (internal/upload/service.go) . nilai di luar daftar
 * ditolak 400 karena file_type ikut menyusun path S3.
 */
export function useUpload(fileType: 'avatar' | 'review' = 'avatar') {
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
          file_type: fileType,
        }),
      });

      if (!presignRes.success || !presignRes.data) {
        setError(getErrorMessage(presignRes) || 'Gagal memuat URL upload');
        setIsUploading(false);
        return null;
      }

      // Backend (internal/upload/dto.go) mengembalikan field `presigned_url`
      // (bukan `upload_url`) di respons presign. `file_url` hanya tersedia di
      // respons /upload/confirm. Kompatibel dengan handler lama yang memakai
      // `upload_url`/`file_url` lewat fallback.
      const presignedUrl = presignRes.data.presigned_url ?? presignRes.data.upload_url;
      const { upload_id } = presignRes.data;
      if (!presignedUrl || !upload_id) {
        setError('Respons upload tidak lengkap');
        setIsUploading(false);
        return null;
      }

      // 2. Upload file to S3
      const s3Res = await fetch(presignedUrl, {
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

      // 3. Confirm upload . file_url final ada di sini.
      const confirmRes = await fetchAPI<any>('/upload/confirm', {
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({
          upload_id,
          file_type: fileType,
        }),
      });

      if (!confirmRes.success || !confirmRes.data) {
        setError(getErrorMessage(confirmRes) || 'Gagal konfirmasi upload');
        setIsUploading(false);
        return null;
      }

      setIsUploading(false);
      // file_url dari confirm adalah URL final (CloudFront bila dikonfigurasi).
      // Fallback ke file_url presign (handler lama) bila confirm tidak menyertakan.
      return confirmRes.data.file_url ?? presignRes.data.file_url ?? null;

    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat upload');
      setIsUploading(false);
      return null;
    }
  };

  return { uploadFile, isUploading, error };
}
