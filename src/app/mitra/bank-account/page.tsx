"use client";
import { useToast } from '@/components/ui/toast';

import { useEffect, useState } from 'react';
import { CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MitraModal from '@/components/mitra/MitraModal';
import { fetchAPI } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useIsPartnerVerified } from '@/hooks/usePartnerVerificationStatus';
import { VerifiedLockNotice } from '@/components/mitra/VerifiedLockBadge';
import { PageSkeleton } from '@/components/ui/skeleton';
import MitraPageHeader from '@/components/mitra/MitraPageHeader';
import { getErrorMessage } from '@/types/api';


const BANKS = [
  { code: 'BCA', name: 'BCA' },
  { code: 'MANDIRI', name: 'Mandiri' },
  { code: 'BNI', name: 'BNI' },
  { code: 'BRI', name: 'BRI' },
  { code: 'BSI', name: 'BSI' },
];

export default function MitraBankAccountPage() {
  const { isLoading: authLoading, isAuthorized, user, isAuthenticated } = useRequireAuth();
  const isVerified = useIsPartnerVerified(isAuthorized);

  const [form, setForm] = useState({
    bank_code: 'BCA',
    account_number: '',
    account_name: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { showToast } = useToast();
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState('');

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchBankAccount();
  }, [isAuthenticated, user?.active_role]);

  const fetchBankAccount = async () => {
    setLoading(true);
    const res = await fetchAPI<any>('/partners/me/bank-account');
    if (res.success && res.data) {
      setForm({
        bank_code: res.data.bank_code || 'BCA',
        // GET /partners/me/bank-account (BankAccountDTO) → account_number / account_name.
        account_number: res.data.account_number || res.data.bank_account_number || '',
        account_name: res.data.account_name || res.data.bank_account_name || '',
      });
    }
    setLoading(false);
  };

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

    // PUT /partners/me/bank-account bind BankAccountDTO → account_number / account_name / otp.
    const res = await fetchAPI('/partners/me/bank-account', {
      method: 'PUT',
      body: JSON.stringify({
        bank_code: form.bank_code,
        account_number: form.account_number,
        account_name: form.account_name,
        otp,
      })
    });

    if (res.success) {
      showToast('Rekening bank berhasil disimpan!');
    } else {
      setError(getErrorMessage(res));
    }

    setSaving(false);
  };


  if (authLoading) return <PageSkeleton />;
  if (!isAuthorized) return null;

  return (
    <div className="page-h bg-brand-gray-60 pb-24">

      {/* Header */}
      <MitraPageHeader
        title="Rekening Bank Utama"
        variant="form"
        backHref="/mitra/profile"
        breadcrumbs={[{ label: 'Profil', href: '/mitra/profile' }, { label: 'Rekening Bank' }]}
      />

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg border border-brand-gray-100 p-6 mb-6 text-center">
          <div className="w-16 h-16 bg-brand-success-soft rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-8 h-8 text-brand-success" />
          </div>
          <h2 className="text-lg font-bold text-brand-gray-900 mb-2">Pencairan Dana</h2>
          <p className="text-sm text-brand-gray-700">
            Rekening ini akan menjadi tujuan utama saat Anda melakukan penarikan dana dari Dompet Posko.
          </p>
        </div>

        {isVerified && (
          <div className="mb-6">
            <VerifiedLockNotice
              title="Rekening terkunci"
              message="Rekening payout sudah diverifikasi admin. Hubungi admin untuk mengubah (cabut verifikasi) . OTP saja tidak cukup."
            />
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-lg border border-brand-gray-100 p-6 h-64 animate-pulse" />
        ) : (
          <form onSubmit={handleInitiateSave} className="bg-white rounded-lg border border-brand-gray-100 p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-brand-gray-900 mb-2">Pilih Bank</label>
              <select
                value={form.bank_code}
                onChange={e => setForm({ ...form, bank_code: e.target.value })}
                disabled={isVerified}
                className="w-full p-3 border border-brand-gray-100 rounded-md text-sm text-brand-gray-900 focus:outline-none focus:border-brand-red bg-white disabled:bg-brand-gray-50 disabled:text-brand-gray-450"
              >
                {BANKS.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-brand-gray-900 mb-2">Nomor Rekening</label>
              <input
                type="text"
                value={form.account_number}
                onChange={e => setForm({ ...form, account_number: e.target.value.replace(/\D/g, '') })}
                placeholder="Hanya angka"
                disabled={isVerified}
                className="w-full p-3 border border-brand-gray-100 rounded-md text-sm text-brand-gray-900 focus:outline-none focus:border-brand-red disabled:bg-brand-gray-50 disabled:text-brand-gray-450"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-brand-gray-900 mb-2">Nama Pemilik Rekening</label>
              <input
                type="text"
                value={form.account_name}
                onChange={e => setForm({ ...form, account_name: e.target.value.toUpperCase() })}
                placeholder="SESUAI BUKU TABUNGAN"
                disabled={isVerified}
                className="w-full p-3 border border-brand-gray-100 rounded-md text-sm text-brand-gray-900 focus:outline-none focus:border-brand-red uppercase disabled:bg-brand-gray-50 disabled:text-brand-gray-450"
              />
              <p className="text-xs text-brand-gray-450 mt-2">
                Pastikan nama sesuai dengan yang terdaftar di bank untuk menghindari kegagalan transfer.
              </p>
            </div>

            {error && <div className="bg-brand-error-soft text-brand-error text-sm p-3 rounded-lg border border-brand-error-border">{error}</div>}

            <div className="pt-4 border-t border-brand-gray-100">
              <Button
                className="w-full bg-brand-red hover:bg-brand-red-dark rounded-md h-12 text-base font-bold"
                type="submit"
                disabled={saving || isVerified}
              >
                {saving ? 'Menyimpan...' : isVerified ? 'Terkunci' : 'Simpan Rekening'}
              </Button>
            </div>
          </form>
        )}
      </div>

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
          onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
          className="mt-4 w-full rounded-md border border-brand-gray-100 p-3 text-center font-mono text-2xl tracking-widest focus:border-brand-red focus:outline-none"
          placeholder="••••••"
        />
      </MitraModal>
    </div>
  );
}

