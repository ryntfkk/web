import type { Metadata } from 'next';
import React from 'react';
import MobilePageHeader from '@/components/layout/MobilePageHeader';

export const metadata: Metadata = {
  title: 'Syarat & Ketentuan',
  description: 'Syarat & Ketentuan penggunaan platform POSKO Jasa — aturan dan kewajiban bagi pelanggan dan mitra.',
  alternates: { canonical: 'https://poskojasa.com/terms' },
};

export default function TermsPage() {
  return (
    <div className="page-h bg-brand-gray-60">
      <MobilePageHeader title="Syarat & Ketentuan" titleAs="p" backHref="/" maxWidthClass="max-w-2xl" />
      <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">
        <h1 className="hidden lg:block text-3xl font-bold text-brand-gray-900 mb-2">Syarat &amp; Ketentuan</h1>
        <p className="text-sm text-brand-gray-400 mb-8">Terakhir diperbarui: 1 Januari 2025</p>

        <div className="bg-white rounded-lg border border-brand-gray-100 p-6 md:p-8 space-y-6 text-sm text-brand-gray-700 leading-relaxed">
          <section>
            <h2 className="text-base font-bold text-brand-gray-900 mb-2">1. Penerimaan Ketentuan</h2>
            <p>Dengan mendaftar dan menggunakan POSKO Jasa, Anda menyetujui Syarat &amp; Ketentuan ini. Jika Anda tidak menyetujui, mohon tidak menggunakan platform kami.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-brand-gray-900 mb-2">2. Definisi</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Platform:</strong> poskojasa.com dan seluruh layanan terkait.</li>
              <li><strong>Pelanggan:</strong> pengguna yang memesan jasa.</li>
              <li><strong>Mitra:</strong> penyedia jasa yang terdaftar di platform.</li>
              <li><strong>Pesanan:</strong> transaksi jasa antara pelanggan dan mitra.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-brand-gray-900 mb-2">3. Akun Pengguna</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Anda bertanggung jawab menjaga kerahasiaan akun dan kata sandi.</li>
              <li>Data yang diberikan harus benar dan akurat.</li>
              <li>Akun bersifat pribadi dan tidak boleh dipindahkan ke pihak lain.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-brand-gray-900 mb-2">4. Pesanan &amp; Pembayaran</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Pesanan yang dibuat bersifat mengikat setelah pembayaran berhasil.</li>
              <li>Harga yang ditampilkan sudah termasuk biaya layanan platform.</li>
              <li>Pembayaran dilakukan melalui metode yang tersedia di platform.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-brand-gray-900 mb-2">5. Kewajiban Mitra</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Menyediakan jasa dengan kualitas yang dijanjikan.</li>
              <li>Hadir tepat waktu sesuai jadwal yang disepakati.</li>
              <li>Tidak menerima pembayaran di luar platform.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-brand-gray-900 mb-2">6. Pembatalan &amp; Pengembalian</h2>
            <p>Pembatalan pesanan dapat dilakukan sesuai kebijakan pembatalan yang berlaku. Pengembalian dana diproses sesuai metode pembayaran dan dapat memakan waktu 3–7 hari kerja.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-brand-gray-900 mb-2">7. Sengketa</h2>
            <p>Jika terjadi sengketa antara pelanggan dan mitra, platform menyediakan fitur dispute untuk mediasi. Keputusan akhir berada di tangan platform setelah investigasi.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-brand-gray-900 mb-2">8. Perubahan Ketentuan</h2>
            <p>Kami berhak mengubah Syarat &amp; Ketentuan ini sewaktu-waktu. Perubahan berlaku sejak dipubasikan di platform.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-brand-gray-900 mb-2">9. Kontak</h2>
            <p>Untuk pertanyaan terkait ketentuan, hubungi kami melalui halaman <a href="/help" className="text-brand-red font-medium hover:underline">Bantuan</a>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
