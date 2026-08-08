import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useAuthStore } from '@/lib/store/authStore';

import EmailVerificationNotice from './EmailVerificationNotice';

type StoreUser = NonNullable<ReturnType<typeof useAuthStore.getState>['user']>;

function setUser(patch: Partial<StoreUser> | null) {
  useAuthStore.setState({
    user: patch === null ? null : ({ id: 'u1', name: 'Budi', ...patch } as StoreUser),
  });
}

describe('EmailVerificationNotice', () => {
  beforeEach(() => setUser(null));

  // Spanduk yang muncul untuk mitra yang sudah beres adalah gangguan, dan
  // gangguan yang diabaikan berulang kali membuat spanduk lain ikut diabaikan.
  it('DIAM bila email sudah terverifikasi', () => {
    setUser({ email: 'budi@contoh.com', email_verified: true });
    const { container } = render(<EmailVerificationNotice />);
    expect(container.firstChild).toBeNull();
  });

  it('DIAM bila belum ada user (belum login / masih memuat)', () => {
    const { container } = render(<EmailVerificationNotice />);
    expect(container.firstChild).toBeNull();
  });

  it('mengajak MEMVERIFIKASI bila email ada tapi belum terverifikasi', () => {
    setUser({ email: 'budi@contoh.com', email_verified: false });
    render(<EmailVerificationNotice />);

    expect(screen.getByText('Email belum diverifikasi')).toBeTruthy();
    // Alamatnya ikut disebut supaya mitra tahu alamat MANA yang dimaksud .
    // ia mungkin sudah lupa yang mana yang terpasang.
    expect(screen.getByText('budi@contoh.com')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Verifikasi Sekarang' })).toBeTruthy();
  });

  // Dua keadaan berbeda: "belum punya email" bukan sekadar "belum terverifikasi",
  // dan ajakannya pun beda . yang satu menambah, yang satu mengonfirmasi.
  it('mengajak MENAMBAH bila belum punya email sama sekali', () => {
    setUser({ email: '', email_verified: false });
    render(<EmailVerificationNotice />);

    expect(screen.getByText('Tambahkan email kamu')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tambah & Verifikasi' })).toBeTruthy();
  });

  // Alasan spanduk ini ada: sejak WhatsApp khusus OTP, pencairan dana hanya
  // dikabari lewat email. Kalau kalimatnya hilang, urgensinya ikut hilang.
  it('menyebut pencairan dana sebagai taruhannya', () => {
    setUser({ email: 'budi@contoh.com', email_verified: false });
    render(<EmailVerificationNotice />);
    expect(screen.getByText(/pencairan dana/i)).toBeTruthy();
  });
});
