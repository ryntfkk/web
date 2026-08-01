import type { Metadata } from 'next';
import React from 'react';
import MobilePageHeader from '@/components/layout/MobilePageHeader';

export const metadata: Metadata = {
  title: 'Kebijakan Privasi',
  description: 'Kebijakan Privasi POSKO Jasa — bagaimana kami mengumpulkan, menggunakan, dan melindungi data pribadi Anda.',
  alternates: { canonical: 'https://poskojasa.com/privacy' },
};

export default function PrivacyPage() {
  return (
    <div className="page-h bg-brand-gray-60">
      <MobilePageHeader title="Kebijakan Privasi" titleAs="p" backHref="/" maxWidthClass="max-w-2xl" />
      <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">
        <h1 className="hidden lg:block text-3xl font-bold text-brand-gray-900 mb-2">Kebijakan Privasi</h1>
        <p className="text-sm text-brand-gray-400 mb-8">Terakhir diperbarui: 1 Januari 2025</p>

        <div className="bg-white rounded-lg border border-brand-gray-100 p-6 md:p-8 space-y-6 text-sm text-brand-gray-700 leading-relaxed">
          <section>
            <h2 className="text-base font-bold text-brand-gray-900 mb-2">1. Pendahuluan</h2>
            <p>POSKO Jasa ("kami") menghormati privasi Anda. Kebijakan ini menjelaskan bagaimana kami mengumpulkan, menggunakan, menyimpan, dan melindungi data pribadi Anda saat menggunakan platform kami (poskojasa.com).</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-brand-gray-900 mb-2">2. Data yang Kami Kumpulkan</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Data akun:</strong> nama, nomor HP, email, kata sandi (terenkripsi).</li>
              <li><strong>Data profil:</strong> foto profil, alamat, lokasi.</li>
              <li><strong>Data transaksi:</strong> riwayat pesanan, pembayaran, dompet, ulasan.</li>
              <li><strong>Data perangkat:</strong> alamat IP, jenis browser, sistem operasi.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-brand-gray-900 mb-2">3. Penggunaan Data</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Memproses pesanan dan pembayaran.</li>
              <li>Memfasilitasi komunikasi antara pelanggan dan mitra.</li>
              <li>Meningkatkan layanan, keamanan, dan pencegahan penipuan.</li>
              <li>Mengirim notifikasi terkait pesanan dan promosi.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-brand-gray-900 mb-2">4. Berbagi Data</h2>
            <p>Kami membagi data Anda kepada mitra penyedia jasa hanya untuk memproses pesanan Anda. Kami tidak menjual data pribadi Anda kepada pihak ketiga. Data dapat dibagikan kepada penyedia pembayaran dan otoritas hukum jika diwajibkan oleh hukum.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-brand-gray-900 mb-2">5. Keamanan Data</h2>
            <p>Kami menerapkan langkah teknis dan organisasi untuk melindungi data Anda, termasuk enkripsi kata sandi, HTTPS, dan akses terbatas. Namun, tidak ada metode transmisi internet yang 100% aman.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-brand-gray-900 mb-2">6. Hak Anda</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Mengakses dan memperbarui data pribadi Anda.</li>
              <li>Meminta penghapusan akun dan data terkait.</li>
              <li>Berhenti berlangganan notifikasi promosi.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-brand-gray-900 mb-2">7. Kontak</h2>
            <p>Untuk pertanyaan terkait privasi, hubungi kami melalui halaman <a href="/help" className="text-brand-red font-medium hover:underline">Bantuan</a>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
