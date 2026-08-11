"use client";

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import MobilePageHeader from '@/components/layout/MobilePageHeader';
import { useToast } from '@/components/ui/toast';
import { Toggle } from '@/components/ui/toggle';
import { ListItemSkeleton, ProfileSkeleton } from '@/components/ui/skeleton';
import {
  useNotificationPreferences,
  useUpsertPreference,
} from '@/hooks/useNotificationPreferences';

// Kunci di sini WAJIB sama dengan notifications.ValidCategories di backend .
// kategori asing kini ditolak UpsertPreference, dan kategori yang hilang dari
// daftar ini berarti pengguna tak punya cara mematikan emailnya.
const CATEGORIES: { key: string; label: string; desc: string }[] = [
  { key: 'order_update', label: 'Update Pesanan', desc: 'Status pesanan, konfirmasi, penyelesaian' },
  { key: 'finance', label: 'Keuangan', desc: 'Penarikan dana disetujui atau ditolak' },
  { key: 'warning', label: 'Peringatan', desc: 'Peringatan keamanan, akun, dan sengketa' },
  { key: 'promo', label: 'Promo & Penawaran', desc: 'Diskon dan penawaran khusus' },
  { key: 'system', label: 'Sistem', desc: 'Pengumuman dan pembaruan aplikasi' },
];

export default function NotificationSettingsPage() {
  const { isLoading: authLoading, isAuthorized } = useRequireAuth();
  const { data: prefs, isLoading } = useNotificationPreferences();
  const upsert = useUpsertPreference();
  const { showToast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  if (authLoading || !isAuthorized) {
    return <div className="page-h bg-brand-gray-60"><ProfileSkeleton /></div>;
  }

  // Default bila BELUM ada baris preferensi: push ON, email ON.
  //
  // Email sengaja ON walau kolom DB-nya default FALSE. Baris preferensi baru
  // lahir saat sakelarnya disentuh, jadi backend memperlakukan "tidak ada baris"
  // sebagai boleh kirim (opt-OUT) . kalau tidak, nol email akan terkirim
  // selamanya. Tampilan di sini HARUS sepakat dengan backend
  // (internal/notify.emailAllowed); menampilkan OFF sementara email tetap
  // dikirim persis kebohongan yang perbaikan ini tutup.
  const getPref = (cat: string) => {
    const p = prefs?.find((x) => x.category === cat);
    return {
      push: p ? p.push_enabled : true,
      email: p ? p.email_enabled : true,
    };
  };

  const toggle = async (cat: string, field: 'push' | 'email') => {
    const cur = getPref(cat);
    const next = { ...cur, [field]: !cur[field] };
    setBusy(`${cat}:${field}`);
    try {
      const res = await upsert(cat, next.push, next.email);
      if (!res.success) showToast(res.message || 'Gagal mengubah preferensi', 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="page-h bg-brand-gray-60 pb-20 md:pb-10">
      {/* titleAs="p": H1 halaman ada di badan konten . tanpa ini HTML memuat DUA H1 sekaligus (audit A6). */}
      <MobilePageHeader
        titleAs="p" title="Pengaturan Notifikasi" icon={<Bell className="w-5 h-5 text-brand-red" />} />

      <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="hidden lg:flex text-2xl font-bold text-brand-gray-900 items-center gap-2 mb-4">
        <Bell className="w-6 h-6 text-brand-red" /> Pengaturan Notifikasi
      </h1>
      <p className="text-sm text-brand-gray-450 mb-5">Atur bagaimana Anda ingin menerima notifikasi.</p>

      {isLoading ? (
        <div className="border border-brand-gray-100 rounded-lg bg-white"><ListItemSkeleton count={4} /></div>
      ) : (
        <div className="divide-y divide-brand-gray-100 border border-brand-gray-100 rounded-lg bg-white">
          <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-2 text-xs font-semibold text-brand-gray-450">
            <span>Kategori</span>
            <span className="w-11 text-center">Push</span>
            <span className="w-11 text-center">Email</span>
          </div>
          {CATEGORIES.map((cat) => {
            const p = getPref(cat.key);
            return (
              <div key={cat.key} className="grid grid-cols-[1fr_auto_auto] gap-4 items-center px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-brand-gray-900">{cat.label}</p>
                  <p className="text-xs text-brand-gray-450">{cat.desc}</p>
                </div>
                <Toggle
                  checked={p.push}
                  disabled={busy === `${cat.key}:push`}
                  onChange={() => toggle(cat.key, 'push')}
                  aria-label={`${cat.label} - notifikasi push`}
                />
                <Toggle
                  checked={p.email}
                  disabled={busy === `${cat.key}:email`}
                  onChange={() => toggle(cat.key, 'email')}
                  aria-label={`${cat.label} - notifikasi email`}
                />
              </div>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}
