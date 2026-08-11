"use client";

import Link from 'next/link';
import { Mail, MapPin, Building2, MessageCircle } from 'lucide-react';
import { usePlatformConfig } from '@/hooks/usePlatformConfig';

// Identitas & kontak platform (Fase 3, menutup temuan B3).
//
// Setiap field dirender KONDISIONAL. Menampilkan "NIB: -" untuk data yang belum
// ada lebih buruk daripada tidak menampilkannya: pembaca menyimpulkan datanya
// hilang, bukan belum ada. Baris hanya muncul kalau benar-benar terisi.
export default function AboutClient() {
  const { profile } = usePlatformConfig();

  const punyaIdentitas = !!(profile?.legal_name || profile?.business_id || profile?.address);
  const punyaKontak = !!(profile?.support_email || profile?.support_whatsapp || profile?.support_phone);

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 md:py-14">
      <h1 className="text-2xl lg:text-3xl font-bold text-brand-gray-900 mb-4">Tentang Kami</h1>

      <div className="bg-white rounded-lg border border-brand-gray-100 p-6 md:p-8 space-y-6">
        <p className="text-sm text-brand-gray-700 leading-relaxed">
          {profile?.brand_name || 'POSKO Jasa'} adalah platform yang menghubungkan
          Anda dengan penyedia jasa terpercaya di sekitar Anda. Kami memverifikasi
          identitas setiap mitra, menahan pembayaran hingga pekerjaan selesai, dan
          menyediakan jalur sengketa bila hasilnya tidak sesuai.
        </p>

        {punyaIdentitas && (
          <section>
            <h2 className="text-base font-bold text-brand-gray-900 mb-2">Identitas Penyelenggara</h2>
            <dl className="space-y-1.5 text-sm text-brand-gray-700">
              {profile?.legal_name && (
                <div className="flex gap-2">
                  <Building2 className="w-4 h-4 mt-0.5 shrink-0 text-brand-gray-400" />
                  <div>
                    <dt className="sr-only">Badan usaha</dt>
                    <dd>{profile.legal_name}</dd>
                  </div>
                </div>
              )}
              {profile?.business_id && (
                <div className="pl-6">
                  <dt className="sr-only">NIB / NPWP</dt>
                  <dd>NIB/NPWP: {profile.business_id}</dd>
                </div>
              )}
              {profile?.address && (
                <div className="flex gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-brand-gray-400" />
                  <div>
                    <dt className="sr-only">Alamat</dt>
                    <dd>{profile.address}</dd>
                  </div>
                </div>
              )}
            </dl>
          </section>
        )}

        <section>
          <h2 className="text-base font-bold text-brand-gray-900 mb-2">Hubungi Kami</h2>
          <ul className="space-y-2 text-sm text-brand-gray-700">
            {profile?.support_email && (
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 shrink-0 text-brand-gray-400" />
                <a href={`mailto:${profile.support_email}`} className="text-brand-red font-medium hover:underline">
                  {profile.support_email}
                </a>
              </li>
            )}
            {profile?.support_whatsapp && (
              <li className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 shrink-0 text-brand-gray-400" />
                <a
                  href={`https://wa.me/${profile.support_whatsapp.replace(/\D/g, '')}`}
                  className="text-brand-red font-medium hover:underline"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  WhatsApp {profile.support_whatsapp}
                </a>
              </li>
            )}
            <li className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 shrink-0 text-brand-gray-400" />
              <Link href="/bantuan" className="text-brand-red font-medium hover:underline">
                Chat Customer Service
              </Link>
              <span className="text-xs text-brand-gray-450">(perlu masuk akun)</span>
            </li>
          </ul>
          {!punyaKontak && (
            <p className="mt-2 text-xs text-brand-gray-450">
              Kontak resmi sedang dilengkapi.
            </p>
          )}
        </section>

        <div className="pt-2 border-t border-brand-gray-100 flex flex-wrap gap-4 text-sm">
          <Link href="/terms" className="text-brand-red font-medium hover:underline">Syarat &amp; Ketentuan</Link>
          <Link href="/privacy" className="text-brand-red font-medium hover:underline">Kebijakan Privasi</Link>
          <Link href="/" className="text-brand-gray-700 hover:underline">Kembali ke Beranda</Link>
        </div>
      </div>
    </div>
  );
}
