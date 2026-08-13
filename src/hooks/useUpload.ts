import { useState } from 'react';
import { fetchAPI } from '@/lib/api';
import { getErrorMessage } from '@/types/api';

/**
 * Tipe berkas yang boleh diminta klien . harus ada di `allowedFileTypes`
 * backend (internal/upload/service.go) karena file_type ikut menyusun path S3.
 */
export type UploadFileType =
  | 'avatar'
  | 'review'
  | 'category-evidence'
  | 'ktp'
  | 'selfie'
  | 'documents'
  | 'service';

/**
 * Upload satu file ke S3 lewat presigned URL, tanpa state React . untuk alur
 * yang mengunggah banyak berkas sekaligus saat submit (mis. /jadi-mitra/daftar).
 * Hook useUpload di bawah memakai fungsi yang sama.
 */
export async function uploadFileToS3(file: File, fileType: UploadFileType): Promise<string> {
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
    throw new Error(getErrorMessage(presignRes) || 'Gagal memuat URL upload');
  }

  // Backend (internal/upload/dto.go) mengembalikan field `presigned_url`
  // (bukan `upload_url`) di respons presign. `file_url` hanya tersedia di
  // respons /upload/confirm. Kompatibel dengan handler lama yang memakai
  // `upload_url`/`file_url` lewat fallback.
  const presignedUrl = presignRes.data.presigned_url ?? presignRes.data.upload_url;
  const { upload_id } = presignRes.data;
  if (!presignedUrl || !upload_id) throw new Error('Respons upload tidak lengkap');

  // 2. Upload file to S3
  const s3Res = await fetch(presignedUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });
  if (!s3Res.ok) throw new Error('Gagal mengupload file ke penyimpanan');

  // 3. Confirm upload . file_url final ada di sini.
  const confirmRes = await fetchAPI<any>('/upload/confirm', {
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify({ upload_id, file_type: fileType }),
  });
  if (!confirmRes.success || !confirmRes.data) {
    throw new Error(getErrorMessage(confirmRes) || 'Gagal konfirmasi upload');
  }

  // file_url dari confirm adalah URL final (CloudFront bila dikonfigurasi).
  const url = confirmRes.data.file_url ?? presignRes.data.file_url;
  if (!url) throw new Error('Respons upload tidak lengkap');
  return url;
}

/**
 * Upload file ke S3 lewat presigned URL.
 *
 * `fileType` menentukan prefix object key di bucket dan HARUS ada di
 * `allowedFileTypes` backend (internal/upload/service.go) . nilai di luar daftar
 * ditolak 400 karena file_type ikut menyusun path S3.
 */
export function useUpload(fileType: UploadFileType = 'avatar') {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = async (file: File): Promise<string | null> => {
    setIsUploading(true);
    setError(null);
    try {
      const url = await uploadFileToS3(file, fileType);
      setIsUploading(false);
      return url;
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat upload');
      setIsUploading(false);
      return null;
    }
  };

  return { uploadFile, isUploading, error };
}
