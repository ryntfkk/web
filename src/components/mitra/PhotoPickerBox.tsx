'use client';

import { Camera, Loader2, X } from 'lucide-react';

/**
 * Kotak unggah BANYAK foto . dipakai bukti alat & bahan (000080), baik saat
 * pendaftaran mitra maupun saat mengajukan tambah/ganti kategori.
 *
 * Ada karena di kedua tempat itu dulu hanya berdiri `<input type="file">`
 * telanjang. Kontrol bawaan browser tidak terbaca sebagai "unggah foto" di
 * tengah form yang seluruh field lainnya berkotak: pemohon melewatinya, lalu
 * tombol kirim mati tanpa ia tahu sebabnya.
 *
 * Presentasional murni . ia tidak tahu apa-apa soal File, S3, atau state
 * pemanggil. Pendaftaran menahan `File[]` (diunggah nanti saat submit) dan
 * form kategori menahan URL hasil unggah; keduanya cukup memberi daftar
 * `src` untuk pratinjau. Menyatukannya di level "sumber gambar" adalah
 * satu-satunya cara satu kotak melayani dua siklus hidup yang berbeda.
 */
export interface PhotoPickerItem {
  /** Kunci React yang stabil . URL objek atau URL S3, keduanya unik. */
  key: string;
  src: string;
}

export default function PhotoPickerBox({
  id,
  items,
  max,
  accept = 'image/jpeg,image/png,image/jpg',
  busy = false,
  error,
  onPick,
  onRemove,
}: {
  id: string;
  items: PhotoPickerItem[];
  max: number;
  accept?: string;
  /** Sedang mengunggah . kotak dikunci dan mengatakan alasannya. */
  busy?: boolean;
  error?: string;
  onPick: (picked: FileList | null) => void;
  onRemove: (index: number) => void;
}) {
  const full = items.length >= max;
  const locked = full || busy;

  return (
    <div>
      {items.length > 0 && (
        // Petak pratinjau berada DI LUAR <label>: di dalamnya, menekan tombol
        // hapus juga akan membuka dialog berkas.
        <div className="mb-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {items.map((item, i) => (
            <div
              key={item.key}
              className="relative aspect-square overflow-hidden rounded-md border border-brand-gray-100 bg-brand-gray-60"
            >
              {/* `item.src` bisa `blob:` (berkas baru) . lihat catatan tipe di atas. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.src} alt={`Foto alat ${i + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => onRemove(i)}
                aria-label={`Hapus foto ${i + 1}`}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          ))}
        </div>
      )}

      <label
        htmlFor={id}
        className={`block overflow-hidden rounded-md border-2 border-dashed transition-colors ${
          error
            ? 'border-brand-error-border bg-brand-error-soft'
            : locked
              ? 'cursor-not-allowed border-brand-gray-100 bg-brand-gray-60'
              : items.length > 0
                ? 'cursor-pointer border-brand-red/40 bg-white hover:bg-brand-gray-60'
                : 'cursor-pointer border-brand-gray-200 bg-white hover:bg-brand-gray-60'
        }`}
      >
        <div className="flex h-24 flex-col items-center justify-center gap-2">
          {busy ? (
            <Loader2 className="h-6 w-6 animate-spin text-brand-gray-400" aria-hidden />
          ) : (
            <Camera className="h-6 w-6 text-brand-gray-400" aria-hidden />
          )}
          <span className="px-3 text-center text-xs text-brand-gray-450">
            {busy
              ? 'Mengunggah…'
              : full
                ? `Sudah ${max} foto — hapus salah satu untuk mengganti`
                : items.length > 0
                  ? 'Ketuk untuk menambah foto'
                  : 'Ketuk untuk memilih foto alat & bahan'}
          </span>
        </div>
        <span className="flex items-center justify-between gap-2 border-t border-brand-gray-100 px-3 py-2 text-xs">
          <span className="min-w-0 truncate text-brand-gray-700">
            {items.length > 0 ? `${items.length} dari ${max} foto` : 'Belum ada foto'}
          </span>
          {!locked && (
            <span className="shrink-0 font-semibold text-brand-red">
              {items.length > 0 ? 'Tambah' : 'Pilih'}
            </span>
          )}
        </span>
      </label>
      <input
        id={id}
        type="file"
        className="hidden"
        accept={accept}
        multiple
        disabled={locked}
        // Nilai input dikosongkan setiap kali: tanpa ini, memilih ulang berkas
        // yang sama persis (setelah dihapus dari petak) tidak memicu `change`.
        onChange={(e) => {
          onPick(e.target.files);
          e.target.value = '';
        }}
      />
      {error && <p className="mt-1 text-xs text-brand-error">{error}</p>}
    </div>
  );
}
