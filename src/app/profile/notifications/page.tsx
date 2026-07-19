"use client";

import { useState } from 'react';
import { Bell, Loader2 } from 'lucide-react';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import MobilePageHeader from '@/components/layout/MobilePageHeader';
import { useToast } from '@/components/ui/toast';
import {
  useNotificationPreferences,
  useUpsertPreference,
} from '@/hooks/useNotificationPreferences';

const CATEGORIES: { key: string; label: string; desc: string }[] = [
  { key: 'order_update', label: 'Update Pesanan', desc: 'Status pesanan, konfirmasi, penyelesaian' },
  { key: 'promo', label: 'Promo & Penawaran', desc: 'Diskon dan penawaran khusus' },
  { key: 'system', label: 'Sistem', desc: 'Pengumuman dan pembaruan aplikasi' },
  { key: 'warning', label: 'Peringatan', desc: 'Peringatan keamanan dan akun' },
];

function Toggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
        checked ? 'bg-[#b51822]' : 'bg-gray-300'
      }`}
      aria-pressed={checked}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export default function NotificationSettingsPage() {
  const { isLoading: authLoading, isAuthorized } = useRequireAuth();
  const { data: prefs, isLoading } = useNotificationPreferences();
  const upsert = useUpsertPreference();
  const { showToast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  if (authLoading || !isAuthorized) {
    return <div className="page-h flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  // Default: push ON, email OFF (sesuai default DB) bila belum ada baris preferensi.
  const getPref = (cat: string) => {
    const p = prefs?.find((x) => x.category === cat);
    return {
      push: p ? p.push_enabled : true,
      email: p ? p.email_enabled : false,
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
    <div className="page-h bg-[#f7f5f4] pb-24">
      <MobilePageHeader title="Pengaturan Notifikasi" icon={<Bell className="w-5 h-5 text-[#b51822]" />} />

      <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="hidden lg:flex text-2xl font-bold text-[#1c1b1b] items-center gap-2 mb-4">
        <Bell className="w-6 h-6 text-[#b51822]" /> Pengaturan Notifikasi
      </h1>
      <p className="text-sm text-[#9e8e8c] mb-5">Atur bagaimana Anda ingin menerima notifikasi.</p>

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>
      ) : (
        <div className="divide-y divide-[#e5e2e1] border border-[#e5e2e1] rounded-lg bg-white">
          <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-2 text-xs font-semibold text-[#9e8e8c]">
            <span>Kategori</span>
            <span className="w-11 text-center">Push</span>
            <span className="w-11 text-center">Email</span>
          </div>
          {CATEGORIES.map((cat) => {
            const p = getPref(cat.key);
            return (
              <div key={cat.key} className="grid grid-cols-[1fr_auto_auto] gap-4 items-center px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-[#1c1b1b]">{cat.label}</p>
                  <p className="text-xs text-[#9e8e8c]">{cat.desc}</p>
                </div>
                <Toggle
                  checked={p.push}
                  disabled={busy === `${cat.key}:push`}
                  onChange={() => toggle(cat.key, 'push')}
                />
                <Toggle
                  checked={p.email}
                  disabled={busy === `${cat.key}:email`}
                  onChange={() => toggle(cat.key, 'email')}
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
