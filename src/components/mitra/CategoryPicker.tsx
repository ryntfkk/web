'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useSubcategories } from '@/hooks/useCategories';
import { usePartnerCategories } from '@/hooks/usePartnerCategories';

/**
 * Pemilih kategori untuk form layanan mitra.
 *
 * Sejak slot kategori (backend 000080), **kategori utama tidak lagi bisa
 * dipilih bebas** . hanya slot yang benar-benar dipegang mitra, karena backend
 * menolak sisanya dengan CATEGORY_NOT_ALLOWED. Menawarkan 20 kategori lalu
 * menolaknya saat menyimpan adalah bentuk terburuk dari aturan ini: mitra sudah
 * mengisi seluruh form sebelum tahu.
 *
 * Satu slot → terkunci (label, bukan select). Banyak slot → pilih.
 * Subkategori tetap opsional.
 *
 * `value` = category_id efektif yang tersimpan di form: subkategori bila
 * dipilih, jika tidak kategori utamanya.
 *
 * **Kategori utama saat mode edit datang dari `mainCategoryId`**, yang dikirim
 * server bersama detail layanan (`category_main_id`). Dulu komponen ini
 * meresolusinya sendiri lewat `GET /categories/{value}`; endpoint itu kini
 * membalas 404 untuk kategori yang dinonaktifkan admin, jadi mengedit layanan
 * yang kategorinya baru dimatikan akan menghasilkan pemilih kosong tanpa
 * penjelasan . dan resolusi itu juga berarti satu request tambahan tiap render.
 */
export default function CategoryPicker({
  value,
  mainCategoryId,
  onChange,
}: {
  value: string;
  /** Kategori UTAMA milik layanan yang sedang diedit (`category_main_id`). */
  mainCategoryId?: string;
  onChange: (categoryId: string) => void;
}) {
  const { data, isLoading } = usePartnerCategories();
  // null = mitra belum menyentuh pemilih; nilainya diturunkan dari server.
  // State disimpan HANYA untuk interaksi, bukan untuk menyalin data server .
  // menyalinnya lewat useEffect memicu render bertingkat (dilarang lint repo).
  const [pickedMain, setPickedMain] = useState<string | null>(null);

  const slots = data?.categories ?? [];
  const soleSlot = slots.length === 1 ? slots[0].category_id : '';

  // Kategori utama efektif, diturunkan saat render:
  //   pilihan mitra → milik layanan yang diedit → satu-satunya slot → kosong.
  const mainId = pickedMain ?? mainCategoryId ?? soleSlot;
  // `value` yang berbeda dari kategori utama pasti subkategori.
  const subId = value && value !== mainId ? value : '';

  const { data: subs } = useSubcategories(mainId || null);

  // Satu-satunya efek yang tersisa, dan ia menyinkronkan PARENT (form), bukan
  // state komponen ini: mitra berkuota 1 tidak punya pilihan untuk dibuat, jadi
  // slot tunggalnya dipasang otomatis alih-alih memaksanya menekan dropdown
  // berisi satu opsi.
  useEffect(() => {
    if (!value && soleSlot) onChange(soleSlot);
  }, [value, soleSlot, onChange]);

  const selectCls =
    'w-full p-3 border border-brand-gray-100 rounded-md text-sm text-brand-gray-900 focus:outline-none focus:border-brand-red bg-white';

  if (isLoading) {
    return <div className="h-12 animate-pulse rounded-md bg-brand-gray-60" aria-hidden />;
  }

  // Mitra tanpa slot tidak akan pernah bisa menyimpan layanan . arahkan ke
  // tempat mengurusnya, jangan tampilkan dropdown kosong.
  if (slots.length === 0) {
    return (
      <div className="rounded-md border border-brand-warning-border bg-brand-warning-soft p-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-brand-warning" aria-hidden />
          <div className="text-sm text-brand-gray-900">
            <p className="font-semibold">Kamu belum punya kategori layanan</p>
            <p className="mt-0.5 text-xs text-brand-gray-700">
              Kategori menentukan layanan apa yang boleh kamu jual. Atur dulu sebelum membuat layanan.
            </p>
            <Link
              href="/mitra/profile#kategori"
              className="mt-2 inline-block text-xs font-bold text-brand-red underline"
            >
              Atur kategori layanan
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const locked = slots.length === 1 ? slots[0] : null;
  const activeSlot = slots.find((s) => s.category_id === mainId);

  return (
    <div className="space-y-3">
      <div>
        <label
          htmlFor={locked ? undefined : 'service-main-category'}
          className="mb-2 block text-sm font-semibold text-brand-gray-900"
        >
          Kategori Utama
        </label>

        {locked ? (
          <>
            <p className="rounded-md border border-brand-gray-100 bg-brand-gray-60 p-3 text-sm text-brand-gray-700">
              {locked.category_name}
            </p>
            <p className="mt-1 text-xs text-brand-gray-450">
              Kategorimu saat ini. Untuk pindah bidang, ajukan penggantian kategori di profil mitra.
            </p>
          </>
        ) : (
          <select
            id="service-main-category"
            value={mainId}
            onChange={(e) => {
              setPickedMain(e.target.value);
              onChange(e.target.value); // sub direset: category_id kembali ke utama
            }}
            className={selectCls}
          >
            <option value="">Pilih Kategori</option>
            {slots.map((c) => (
              <option key={c.category_id} value={c.category_id}>
                {c.category_name}
              </option>
            ))}
          </select>
        )}

        {/* Kategori mitra yang dimatikan admin tetap bisa dipakai menyunting,
            tapi mitra berhak tahu layanannya tidak sampai ke pelanggan. */}
        {activeSlot?.is_visible === false && (
          <p className="mt-1 flex items-start gap-1 text-xs text-brand-warning-dark">
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
            Kategori ini sedang dinonaktifkan admin, jadi layanan di dalamnya belum tampil untuk pelanggan.
          </p>
        )}
      </div>

      {(subs?.length ?? 0) > 0 && (
        <div>
          <label htmlFor="service-subcategory" className="mb-2 block text-sm font-semibold text-brand-gray-900">
            Subkategori <span className="font-normal text-brand-gray-400">(opsional, lebih spesifik)</span>
          </label>
          <select
            id="service-subcategory"
            value={subId}
            onChange={(e) => onChange(e.target.value || mainId)}
            className={selectCls}
          >
            <option value="">— Umum (tanpa subkategori) —</option>
            {subs!.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
