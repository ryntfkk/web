'use client';

import { useEffect, useState } from 'react';
import { CreditCard } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { fetchAPI } from '@/lib/api';
import { getErrorMessage } from '@/types/api';
// Dialog ini sengaja MitraModal, bukan `ui/modal`: hanya MitraModal yang
// menahan fokus, mengembalikan fokus saat ditutup, dan punya `aria-labelledby`.
// Untuk dialog yang menyetujui perubahan REKENING PAYOUT, itu bukan kemewahan.
// (Namanya tinggal warisan folder . perilakunya sama sekali tidak khusus mitra.)
import MitraModal from '@/components/mitra/MitraModal';

/**
 * Formulir rekening bank . BADAN saja, tanpa header/kontainer.
 *
 * Dipakai mitra DAN pelanggan. Endpointnya (`/partners/me/bank-account`) ber-
 * namespace mitra karena sejarah, tetapi handler-nya membaca & menulis kolom
 * `users.bank_*` . bukan tabel `partners` . jadi ia memang berlaku untuk
 * siapa pun yang punya sesi. Penarikan pun membaca kolom yang sama
 * (`wallet/service.go` → `user.BankCode` dst).
 */
const BANKS = [
  { code: 'BCA', name: 'BCA' },
  { code: 'MANDIRI', name: 'Mandiri' },
  { code: 'BNI', name: 'BNI' },
  { code: 'BRI', name: 'BRI' },
  { code: 'BSI', name: 'BSI' },
];

interface Props {
  /** `true` setelah sesi siap . sebelum itu jangan menembak request. */
  enabled: boolean;
  /**
   * Rekening terkunci (mitra yang sudah diverifikasi admin). Pelanggan tidak
   * pernah terkunci . tidak ada yang memverifikasi rekening pelanggan.
   */
  locked?: boolean;
  /** Notice yang dirender di atas form saat terkunci. */
  lockNotice?: React.ReactNode;
  /** Kalimat pembuka . beda antara mitra (penghasilan) & pelanggan (refund). */
  intro?: string;
}

export default function BankAccountForm({ enabled, locked = false, lockNotice, intro }: Props) {
  const { showToast } = useToast();

  const [form, setForm] = useState({ bank_code: 'BCA', account_number: '', account_name: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState('');

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await fetchAPI<{
        bank_code?: string;
        account_number?: string;
        account_name?: string;
        bank_account_number?: string;
        bank_account_name?: string;
      }>('/partners/me/bank-account');
      if (!cancelled && res.success && res.data) {
        setForm({
          bank_code: res.data.bank_code || 'BCA',
          account_number: res.data.account_number || res.data.bank_account_number || '',
          account_name: res.data.account_name || res.data.bank_account_name || '',
        });
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const handleInitiateSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.account_number || !form.account_name) {
      setError('Mohon lengkapi semua kolom');
      return;
    }

    setSaving(true);
    const res = await fetchAPI('/partners/me/bank-account/request-otp', { method: 'POST' });
    setSaving(false);

    if (res.success) {
      setError('');
      setShowOtp(true);
      setOtp('');
      showToast('Kode OTP telah dikirim');
    } else {
      setError(getErrorMessage(res));
    }
  };

  const handleConfirmOtp = async () => {
    if (otp.length < 4) {
      setError('Kode OTP tidak valid');
      return;
    }
    setShowOtp(false);
    setSaving(true);
    setError('');

    const res = await fetchAPI('/partners/me/bank-account', {
      method: 'PUT',
      body: JSON.stringify({
        bank_code: form.bank_code,
        account_number: form.account_number,
        account_name: form.account_name,
        otp,
      }),
    });

    if (res.success) {
      showToast('Rekening bank berhasil disimpan!');
    } else {
      setError(getErrorMessage(res));
    }
    setSaving(false);
  };

  return (
    <>
      <div className="bg-white rounded-lg border border-brand-gray-100 p-6 mb-6 text-center">
        <div className="w-16 h-16 bg-brand-success-soft rounded-full flex items-center justify-center mx-auto mb-4">
          <CreditCard className="w-8 h-8 text-brand-success" />
        </div>
        <h2 className="text-lg font-bold text-brand-gray-900 mb-2">Pencairan Dana</h2>
        <p className="text-sm text-brand-gray-700">
          {intro ??
            'Rekening ini akan menjadi tujuan utama saat Anda melakukan penarikan dana dari Dompet Posko.'}
        </p>
      </div>

      {locked && lockNotice && <div className="mb-6">{lockNotice}</div>}

      {loading ? (
        <div className="bg-white rounded-lg border border-brand-gray-100 p-6 h-64 animate-pulse" />
      ) : (
        <form onSubmit={handleInitiateSave} className="bg-white rounded-lg border border-brand-gray-100 p-6 space-y-4">
          <div>
            <label htmlFor="bank-code" className="block text-sm font-semibold text-brand-gray-900 mb-2">
              Pilih Bank
            </label>
            <select
              id="bank-code"
              value={form.bank_code}
              onChange={(e) => setForm({ ...form, bank_code: e.target.value })}
              disabled={locked}
              className="w-full p-3 border border-brand-gray-100 rounded-md text-sm text-brand-gray-900 focus:outline-none focus:border-brand-red bg-white disabled:bg-brand-gray-50 disabled:text-brand-gray-450"
            >
              {BANKS.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="bank-account-number" className="block text-sm font-semibold text-brand-gray-900 mb-2">
              Nomor Rekening
            </label>
            <input
              id="bank-account-number"
              type="text"
              inputMode="numeric"
              value={form.account_number}
              onChange={(e) => setForm({ ...form, account_number: e.target.value.replace(/\D/g, '') })}
              placeholder="Hanya angka"
              disabled={locked}
              className="w-full p-3 border border-brand-gray-100 rounded-md text-sm text-brand-gray-900 focus:outline-none focus:border-brand-red disabled:bg-brand-gray-50 disabled:text-brand-gray-450"
            />
          </div>

          <div>
            <label htmlFor="bank-account-name" className="block text-sm font-semibold text-brand-gray-900 mb-2">
              Nama Pemilik Rekening
            </label>
            <input
              id="bank-account-name"
              type="text"
              value={form.account_name}
              onChange={(e) => setForm({ ...form, account_name: e.target.value.toUpperCase() })}
              placeholder="SESUAI BUKU TABUNGAN"
              disabled={locked}
              className="w-full p-3 border border-brand-gray-100 rounded-md text-sm text-brand-gray-900 focus:outline-none focus:border-brand-red uppercase disabled:bg-brand-gray-50 disabled:text-brand-gray-450"
            />
            <p className="text-xs text-brand-gray-450 mt-2">
              Pastikan nama sesuai dengan yang terdaftar di bank untuk menghindari kegagalan transfer.
            </p>
          </div>

          {error && (
            <div className="bg-brand-error-soft text-brand-error text-sm p-3 rounded-lg border border-brand-error-border">
              {error}
            </div>
          )}

          <div className="pt-4 border-t border-brand-gray-100">
            <Button
              className="w-full bg-brand-red hover:bg-brand-red-dark rounded-md h-12 text-base font-bold"
              type="submit"
              disabled={saving || locked}
            >
              {saving ? 'Menyimpan...' : locked ? 'Terkunci' : 'Simpan Rekening'}
            </Button>
          </div>
        </form>
      )}

      <MitraModal
        open={showOtp}
        onClose={() => setShowOtp(false)}
        title="Verifikasi Keamanan"
        description="Masukkan 6 digit kode OTP yang dikirim ke nomor Anda untuk menyetujui perubahan rekening."
        footer={
          <>
            <Button variant="outline" className="flex-1 rounded-md" onClick={() => setShowOtp(false)}>
              Batal
            </Button>
            <Button
              className="flex-1 rounded-md bg-brand-red hover:bg-brand-red-dark"
              onClick={handleConfirmOtp}
              disabled={otp.length < 4}
            >
              Konfirmasi
            </Button>
          </>
        }
      >
        <label htmlFor="bank-otp" className="sr-only">
          Kode OTP
        </label>
        <input
          id="bank-otp"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
          className="mt-4 w-full rounded-md border border-brand-gray-100 p-3 text-center font-mono text-2xl tracking-widest focus:border-brand-red focus:outline-none"
          placeholder="••••••"
        />
      </MitraModal>
    </>
  );
}
