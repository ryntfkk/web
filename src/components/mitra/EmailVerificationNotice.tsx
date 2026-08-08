'use client';

import { useState } from 'react';
import { MailWarning } from 'lucide-react';

import { useAuthStore } from '@/lib/store/authStore';
import EmailVerificationModal from '@/components/ui/EmailVerificationModal';

/**
 * Pengingat bagi mitra yang emailnya belum terverifikasi.
 *
 * Sejak WhatsApp dipakai KHUSUS OTP, email adalah satu-satunya kanal eksternal
 * untuk mengabari mitra: hasil verifikasi, penarikan dana disetujui/ditolak,
 * sengketa. Mitra tanpa email terverifikasi hanya mengetahuinya bila kebetulan
 * membuka aplikasi . dan itu persis kabar yang tidak boleh terlewat.
 *
 * Pendaftar BARU sudah dijaga gerbang `EMAIL_NOT_VERIFIED` di server. Spanduk ini
 * untuk mitra yang sudah terlanjur disetujui sebelum syarat itu ada (per
 * 2026-08-09: 4 dari 9). Mereka sengaja TIDAK diblokir dari fitur yang sudah
 * mereka pakai . diajak, bukan dikunci.
 *
 * Mengelola state modalnya sendiri supaya pemanggil cukup menaruh satu baris.
 * Menghilang sendiri begitu verifikasi berhasil: EmailVerificationForm memanggil
 * updateUser, dan komponen ini membaca store yang sama.
 */
export default function EmailVerificationNotice() {
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);

  if (!user || user.email_verified) return null;

  const belumPunyaEmail = !user.email;

  return (
    <>
      <div className="flex items-start gap-2.5 rounded-lg border border-brand-warning-border bg-brand-warning-soft p-3">
        <MailWarning className="mt-0.5 h-4 w-4 shrink-0 text-brand-warning-dark" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-brand-gray-900">
            {belumPunyaEmail ? 'Tambahkan email kamu' : 'Email belum diverifikasi'}
          </p>
          <p className="mt-0.5 text-xs leading-snug text-brand-gray-700">
            {belumPunyaEmail ? (
              <>
                Kabar <strong>pencairan dana</strong> dan keputusan admin kami kirim lewat email.
                Tanpa email, kamu hanya bisa mengetahuinya saat membuka aplikasi.
              </>
            ) : (
              <>
                Kami belum bisa mengirim kabar ke <span className="break-all">{user.email}</span>{' '}
                sampai alamatnya diverifikasi . termasuk status{' '}
                <strong>pencairan dana</strong>.
              </>
            )}
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-1.5 inline-block text-xs font-semibold text-brand-red hover:underline"
          >
            {belumPunyaEmail ? 'Tambah & Verifikasi' : 'Verifikasi Sekarang'}
          </button>
        </div>
      </div>

      <EmailVerificationModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onSuccess={() => setOpen(false)}
        subtitle="Agar kabar penting sampai ke kamu"
        reason="Hasil verifikasi mitra, status pencairan dana, dan sengketa kami kirim lewat email."
      />
    </>
  );
}
