'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Check, ChevronRight, Circle } from 'lucide-react';

import { fetchAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';

/**
 * Skor kelengkapan profil mitra (P2).
 *
 * Bukan gamifikasi. Setiap butir di sini adalah hal yang, bila kosong, punya
 * akibat nyata dan spesifik . dan akibat itulah yang ditulis, bukan "lengkapi
 * profil Anda". Mitra yang tak punya layanan aktif TIDAK muncul di pencarian
 * sama sekali; mitra tanpa rekening tak bisa mencairkan uangnya. Itu yang perlu
 * ia tahu, bukan bahwa skornya 60%.
 *
 * Persentasenya sengaja dihitung di klien dari data yang memang sudah diambil
 * halaman lain: menambah endpoint skor di backend berarti definisi "lengkap"
 * hidup di dua tempat dan pasti menyimpang.
 */
interface ChecklistItem {
  key: string;
  label: string;
  /** Konsekuensi bila belum terisi. Ditampilkan hanya untuk yang belum. */
  consequence: string;
  href: string;
  done: boolean;
}

interface PartnerMe {
  bio?: string;
  avatar_url?: string | null;
  basecamp_lat?: number | null;
  address_detail?: string;
}

interface BalanceMe {
  bank_account?: { account_number_masked?: string } | null;
}

export default function ProfileCompleteness() {
  const user = useAuthStore((s) => s.user);
  const [items, setItems] = useState<ChecklistItem[] | null>(null);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      const [meRes, svcRes, portRes, balRes] = await Promise.all([
        fetchAPI<PartnerMe>('/partners/me'),
        fetchAPI<{ id: string; is_active: boolean }[]>('/partners/me/services'),
        fetchAPI<{ id: string }[]>('/partners/me/portfolios'),
        fetchAPI<BalanceMe>('/wallet/balance'),
      ]);
      if (!alive) return;

      // Gagal memuat profil = kartu ini tidak ditampilkan sama sekali. Skor yang
      // dihitung dari data separuh akan menyuruh mitra memperbaiki hal yang
      // sebetulnya sudah beres.
      if (!meRes.success || !meRes.data) {
        setItems([]);
        return;
      }

      const me = meRes.data;
      const services = svcRes.success ? svcRes.data ?? [] : [];
      const portfolios = portRes.success ? portRes.data ?? [] : [];
      const bank = balRes.success ? balRes.data?.bank_account : null;

      setItems([
        {
          key: 'avatar',
          label: 'Foto profil',
          consequence:
            'Profil tanpa foto lebih jarang dipilih pelanggan. Lengkapi di pengaturan akun.',
          href: '/profile/account',
          done: Boolean(me.avatar_url),
        },
        {
          key: 'bio',
          label: 'Deskripsi diri',
          consequence: 'Pelanggan tidak punya bahan untuk menilai pengalamanmu.',
          href: '/mitra/basecamp',
          done: Boolean(me.bio && me.bio.trim().length >= 20),
        },
        {
          key: 'basecamp',
          label: 'Alamat basecamp',
          consequence: 'Tanpa titik lokasi, jangkauan layananmu tidak bisa dihitung.',
          href: '/mitra/basecamp',
          done: Boolean(me.basecamp_lat) && Boolean(me.address_detail),
        },
        {
          key: 'service',
          label: 'Minimal satu layanan aktif',
          consequence: 'Tanpa layanan aktif kamu tidak muncul di pencarian sama sekali.',
          href: '/mitra/services',
          done: services.some((s) => s.is_active),
        },
        {
          key: 'portfolio',
          label: 'Foto portofolio',
          consequence: 'Hasil pekerjaan adalah bukti paling meyakinkan bagi calon pelanggan.',
          href: '/mitra/portfolio',
          done: portfolios.length > 0,
        },
        {
          key: 'bank',
          label: 'Rekening bank',
          consequence: 'Tanpa rekening tersimpan, saldo tidak bisa dicairkan.',
          href: '/mitra/bank-account',
          done: Boolean(bank?.account_number_masked),
        },
        {
          key: 'phone',
          label: 'Nomor HP terverifikasi',
          consequence: 'Nomor terverifikasi wajib sebelum penarikan dana bisa diajukan.',
          href: '/profile/security',
          done: Boolean(user?.phone_verified),
        },
      ]);
    };

    load().catch(() => {
      if (alive) setItems([]);
    });

    return () => {
      alive = false;
    };
  }, [user?.phone_verified]);

  if (!items || items.length === 0) return null;

  const doneCount = items.filter((i) => i.done).length;
  const percent = Math.round((doneCount / items.length) * 100);
  const pending = items.filter((i) => !i.done);

  return (
    <section className="rounded-lg border border-brand-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-bold text-brand-gray-900">Kelengkapan Profil</h2>
        <span className="text-sm font-bold text-brand-gray-900">{percent}%</span>
      </div>

      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Kelengkapan profil ${percent} persen`}
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-brand-gray-100"
      >
        <div
          className={`h-full rounded-full transition-all ${percent === 100 ? 'bg-brand-success' : 'bg-brand-red'}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      <p className="mt-2 text-xs text-brand-gray-450">
        {doneCount} dari {items.length} bagian sudah terisi.
      </p>

      {pending.length > 0 ? (
        <ul className="mt-3 space-y-2 border-t border-brand-gray-100 pt-3">
          {pending.map((item) => (
            <li key={item.key}>
              <Link
                href={item.href}
                className="flex items-start gap-2.5 rounded-md p-2 -mx-2 transition-colors hover:bg-brand-gray-60"
              >
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-brand-gray-450" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-brand-gray-900">{item.label}</span>
                  <span className="block text-xs leading-snug text-brand-gray-450">{item.consequence}</span>
                </span>
                <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-brand-gray-450" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 flex items-center gap-2 border-t border-brand-gray-100 pt-3 text-sm text-brand-success">
          <Check className="h-4 w-4" aria-hidden /> Profilmu sudah lengkap.
        </p>
      )}
    </section>
  );
}
