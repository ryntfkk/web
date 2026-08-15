'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Layers, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useCategories } from '@/hooks/useCategories';
import {
  useCancelCategoryRequest,
  useCreateCategoryRequest,
  usePartnerCategories,
  useReleaseCategory,
  type PartnerCategory,
} from '@/hooks/usePartnerCategories';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { useUpload } from '@/hooks/useUpload';
import MitraModal from '@/components/mitra/MitraModal';
import PhotoPickerBox from '@/components/mitra/PhotoPickerBox';

/**
 * Slot kategori layanan mitra (backend 000080).
 *
 * Aturan yang harus TERBACA dari layar ini, bukan hanya ditegakkan server:
 *
 *   Menambah dan mengganti kategori butuh persetujuan admin + foto alat.
 *   Melepas berlaku seketika, dan minimal satu kategori harus tersisa.
 *
 * Karena itu tombol "Ganti" dan "Tambah" membuka FORM PERMINTAAN, bukan dialog
 * konfirmasi. Menampilkannya seolah instan lalu memunculkan "menunggu review"
 * setelah ditekan adalah janji yang dilanggar di detik berikutnya.
 */

const MAX_EVIDENCE = 5;
/** Sama dengan batas di wizard pendaftaran . satu aturan, dua pintu masuk. */
const MAX_EVIDENCE_BYTES = 5 * 1024 * 1024;

export default function CategorySlots() {
  const { data, isLoading } = usePartnerCategories();
  const release = useReleaseCategory();
  const cancelRequest = useCancelCategoryRequest();
  const { showToast } = useToast();
  const [formMode, setFormMode] = useState<null | { replaces?: PartnerCategory }>(null);

  const pending = data?.pending_request ?? null;

  const handleRelease = async (cat: PartnerCategory) => {
    // Konfirmasi WAJIB menyebut akibatnya pada layanan. "Yakin?" tidak memberi
    // mitra informasi apa pun untuk memutuskan.
    const ok = window.confirm(
      `Lepas kategori ${cat.category_name}?\n\n` +
        'Semua layananmu di kategori ini akan dinonaktifkan dan tidak lagi tampil untuk pelanggan. ' +
        'Pesanan yang sedang berjalan tidak terpengaruh.\n\n' +
        'Untuk memilikinya lagi kamu harus mengajukan permintaan ke admin.',
    );
    if (!ok) return;
    try {
      const n = await release.mutateAsync(cat.category_id);
      showToast(
        n > 0 ? `Kategori dilepas. ${n} layanan dinonaktifkan.` : 'Kategori dilepas.',
        'success',
      );
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal melepas kategori', 'error');
    }
  };

  if (isLoading) {
    return <div className="h-32 animate-pulse rounded-md bg-brand-gray-60" aria-hidden />;
  }
  if (!data) return null;

  return (
    <section id="kategori" className="rounded-md border border-brand-gray-100 bg-white p-4">
      <header className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-sm font-bold text-brand-gray-900">
            <Layers className="h-4 w-4 text-brand-red" aria-hidden />
            Kategori Layanan
          </h2>
          <p className="mt-0.5 text-xs text-brand-gray-450">
            Menentukan layanan apa yang boleh kamu jual. Terpakai {data.used} dari {data.quota} slot.
          </p>
        </div>
      </header>

      {data.categories.length === 0 && (
        <div className="mb-3 rounded-md border border-brand-warning-border bg-brand-warning-soft p-3 text-xs text-brand-gray-900">
          <p className="font-semibold">Kamu belum punya kategori layanan.</p>
          <p className="mt-0.5 text-brand-gray-700">
            Tanpa kategori, layanan tidak bisa dibuat. Ajukan kategori beserta foto alat &amp; bahan di bawah.
          </p>
        </div>
      )}

      <ul className="space-y-2">
        {data.categories.map((cat) => (
          <li
            key={cat.category_id}
            className="flex items-center justify-between gap-3 rounded-md border border-brand-gray-100 p-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-brand-gray-900">{cat.category_name}</p>
              {!cat.is_visible && (
                <p className="mt-0.5 flex items-center gap-1 text-xs text-brand-warning">
                  <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
                  Dinonaktifkan admin — layananmu di sini tidak tampil
                </p>
              )}
              {cat.evidence_urls.length > 0 && (
                <p className="mt-0.5 text-xs text-brand-gray-450">
                  {cat.evidence_urls.length} foto alat terlampir
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => setFormMode({ replaces: cat })}
                disabled={!!pending}
                className="rounded-md p-2 text-brand-gray-450 hover:bg-brand-gray-60 hover:text-brand-red disabled:opacity-40"
                aria-label={`Ajukan penggantian kategori ${cat.category_name}`}
                title="Ajukan penggantian"
              >
                <RefreshCw className="h-4 w-4" aria-hidden />
              </button>
              {/* Tombol Lepas HILANG saat kategori tinggal satu . bukan tampil
                  lalu menghasilkan error 409 setelah ditekan. */}
              {data.can_release && (
                <button
                  type="button"
                  onClick={() => handleRelease(cat)}
                  disabled={release.isPending}
                  className="rounded-md p-2 text-brand-gray-450 hover:bg-brand-error-soft hover:text-brand-error disabled:opacity-40"
                  aria-label={`Lepas kategori ${cat.category_name}`}
                  title="Lepas kategori"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {pending ? (
        <div className="mt-3 rounded-md border border-brand-orange-light bg-brand-orange-soft p-3">
          <p className="text-xs font-semibold text-brand-amber-dark">
            Menunggu ditinjau admin:{' '}
            {pending.kind === 'swap'
              ? `${pending.replaces_category_name} → ${pending.category_name}`
              : `tambah ${pending.category_name}`}
          </p>
          <p className="mt-0.5 text-xs text-brand-gray-700">{pending.reason}</p>
          <button
            type="button"
            onClick={async () => {
              try {
                await cancelRequest.mutateAsync(pending.id);
                showToast('Permintaan dibatalkan', 'success');
              } catch (e) {
                showToast(e instanceof Error ? e.message : 'Gagal membatalkan', 'error');
              }
            }}
            className="mt-2 text-xs font-bold text-brand-red underline"
          >
            Batalkan permintaan
          </button>
        </div>
      ) : (
        <Button
          variant="outline"
          className="mt-3 w-full"
          onClick={() => setFormMode({})}
          disabled={data.used >= data.quota && data.categories.length === 0}
        >
          <Plus className="mr-1.5 h-4 w-4" aria-hidden />
          Ajukan Tambah Kategori
        </Button>
      )}

      {formMode && (
        <CategoryRequestForm
          replaces={formMode.replaces}
          held={data.categories}
          quotaFull={data.used >= data.quota}
          onClose={() => setFormMode(null)}
        />
      )}
    </section>
  );
}

/**
 * Form permintaan tambah/tukar. Satu komponen untuk keduanya . perbedaannya
 * hanya ada tidaknya `replaces`, dan backend pun memodelkannya begitu.
 */
function CategoryRequestForm({
  replaces,
  held,
  quotaFull,
  onClose,
}: {
  replaces?: PartnerCategory;
  held: PartnerCategory[];
  quotaFull: boolean;
  onClose: () => void;
}) {
  const { data: mains } = useCategories();
  const create = useCreateCategoryRequest();
  const { showToast } = useToast();
  // Tipe berkas menentukan prefix object key di S3 dan HARUS ada di
  // `allowedFileTypes` backend. "category-evidence" juga dicocokkan ulang saat
  // validasi permintaan . bukti dari prefix lain (mis. KTP) ditolak.
  const { uploadFile } = useUpload('category-evidence');

  const [categoryId, setCategoryId] = useState('');
  const [replacesId, setReplacesId] = useState(replaces?.category_id ?? '');
  const [reason, setReason] = useState('');
  const [evidence, setEvidence] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [evidenceError, setEvidenceError] = useState('');

  // Kategori yang sudah dipegang tidak ditawarkan . backend menolaknya, dan
  // menampilkannya hanya membuat mitra menabrak error yang bisa dicegah.
  const heldIds = useMemo(() => new Set(held.map((h) => h.category_id)), [held]);
  const options = (mains ?? []).filter((c) => !heldIds.has(c.id));

  // Saat kuota penuh, kategori pengganti WAJIB dipilih: menyetujui tanpa itu
  // akan diam-diam menaikkan kuota mitra (backend menolaknya juga).
  const needsReplacement = quotaFull && !replaces;

  /**
   * Menerima foto, lalu MENGATAKAN apa saja yang tidak jadi terpakai.
   *
   * Sebelumnya kelebihan foto dibuang diam-diam lewat `slice`, dan kegagalan
   * unggah lolos sepenuhnya: `uploadFile` mengembalikan `null` alih-alih
   * melempar (lihat `hooks/useUpload.ts`), jadi `catch` di sini tidak pernah
   * berjalan. Mitra memilih 3 foto, spinner berhenti, tak ada yang muncul, tak
   * ada pesan . dan ia mengira aplikasinya rusak.
   */
  const handleFiles = async (files: FileList | null) => {
    const all = Array.from(files ?? []);
    if (all.length === 0) return;

    const oversized = all.filter((f) => f.size > MAX_EVIDENCE_BYTES);
    const fitting = all.filter((f) => f.size <= MAX_EVIDENCE_BYTES);
    const picked = fitting.slice(0, MAX_EVIDENCE - evidence.length);
    const overflow = fitting.length - picked.length;

    const notes: string[] = [];
    if (oversized.length > 0) notes.push(`${oversized.length} foto melebihi 5MB`);
    if (overflow > 0) notes.push(`${overflow} foto tidak muat (maksimal ${MAX_EVIDENCE})`);

    if (picked.length === 0) {
      setEvidenceError(notes.length > 0 ? `${notes.join(' dan ')} — tidak ada yang diunggah.` : '');
      return;
    }

    setUploading(true);
    let failed = 0;
    try {
      const urls: string[] = [];
      for (const f of picked) {
        const url = await uploadFile(f);
        if (url) urls.push(url);
        else failed++;
      }
      if (urls.length > 0) setEvidence((prev) => [...prev, ...urls]);
      if (failed > 0) notes.push(`${failed} foto gagal diunggah`);
    } catch {
      notes.push('unggahan terputus');
    } finally {
      setUploading(false);
    }
    setEvidenceError(notes.length > 0 ? `${notes.join(' dan ')} — tidak ditambahkan.` : '');
  };

  const submit = async () => {
    try {
      await create.mutateAsync({
        category_id: categoryId,
        replaces_category_id: replacesId || undefined,
        reason: reason.trim(),
        evidence_urls: evidence,
      });
      showToast('Permintaan terkirim. Admin akan meninjaunya.', 'success');
      onClose();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal mengirim permintaan', 'error');
    }
  };

  const canSubmit =
    !!categoryId && reason.trim().length > 0 && evidence.length > 0 && (!needsReplacement || !!replacesId);

  return (
    // MitraModal, BUKAN dialog tulis tangan: tangga z-index mode mitra berhenti
    // di z-60 (DEVELOPER_NOTES) dan angka arbitrer selalu jadi lomba yang
    // dimenangkan penulis terakhir. Focus trap & Escape ikut gratis.
    <MitraModal
      open
      onClose={onClose}
      size="lg"
      title={replaces ? `Ganti kategori ${replaces.category_name}` : 'Tambah kategori layanan'}
      description="Admin meninjau permintaan ini. Foto alat & bahan dipakai untuk memastikan kamu memang bisa mengerjakan layanan di kategori tersebut."
      footer={
        <div className="flex w-full gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={create.isPending}>
            Batal
          </Button>
          <Button className="flex-1" onClick={submit} disabled={!canSubmit || create.isPending || uploading}>
            {create.isPending ? 'Mengirim…' : 'Kirim Permintaan'}
          </Button>
        </div>
      }
    >
      <div>
        <label htmlFor="req-category" className="block text-sm font-semibold text-brand-gray-900">
          Kategori yang diminta
        </label>
        <select
          id="req-category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="mt-1 w-full rounded-md border border-brand-gray-100 p-3 text-sm"
        >
          <option value="">Pilih kategori</option>
          {options.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {needsReplacement && (
          <>
            <label htmlFor="req-replaces" className="mt-3 block text-sm font-semibold text-brand-gray-900">
              Kategori yang dilepas
            </label>
            <p className="text-xs text-brand-gray-450">
              Slotmu sudah penuh, jadi satu kategori harus dilepas bila permintaan ini disetujui.
            </p>
            <select
              id="req-replaces"
              value={replacesId}
              onChange={(e) => setReplacesId(e.target.value)}
              className="mt-1 w-full rounded-md border border-brand-gray-100 p-3 text-sm"
            >
              <option value="">Pilih kategori</option>
              {held.map((c) => (
                <option key={c.category_id} value={c.category_id}>
                  {c.category_name}
                </option>
              ))}
            </select>
          </>
        )}

        <label htmlFor="req-reason" className="mt-3 block text-sm font-semibold text-brand-gray-900">
          Alasan
        </label>
        <textarea
          id="req-reason"
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ceritakan pengalaman & alat yang kamu punya untuk kategori ini..."
          className="mt-1 h-20 w-full resize-none rounded-md border border-brand-gray-100 p-3 text-sm"
        />

        <label htmlFor="req-evidence" className="mb-1 mt-3 block text-sm font-semibold text-brand-gray-900">
          Foto alat &amp; bahan{' '}
          <span className="font-normal text-brand-gray-450">(wajib 1–{MAX_EVIDENCE} foto, maks 5MB per foto)</span>
        </label>
        <PhotoPickerBox
          id="req-evidence"
          items={evidence.map((url) => ({ key: url, src: url }))}
          max={MAX_EVIDENCE}
          accept="image/jpeg,image/png,image/webp"
          busy={uploading}
          error={evidenceError}
          onPick={handleFiles}
          // Foto yang dibuang di sini sudah terlanjur ada di S3 dan menjadi
          // yatim . itu disengaja: memaksa mitra mengirim foto yang jelas salah
          // hanya karena berkasnya sudah naik jauh lebih mahal daripada satu
          // objek nganggur yang akan ikut tersapu retensi.
          onRemove={(i) => {
            setEvidence((prev) => prev.filter((_, k) => k !== i));
            setEvidenceError('');
          }}
        />
      </div>
    </MitraModal>
  );
}
