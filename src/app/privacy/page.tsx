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
        {/* Tanggal ini masih manual; pindah ke legal_documents.effective_at di
            Fase 5 (PLAN-KONTEN-LEGAL-CMS.md §5.4) agar tak bisa basi lagi. */}
        <p className="text-sm text-brand-gray-400 mb-8">Terakhir diperbarui: 3 Agustus 2026</p>

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
              <li>Menghapus akun Anda melalui <strong>Profil → Keamanan Akun → Hapus Akun</strong>.</li>
              <li>Berhenti berlangganan notifikasi promosi.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-brand-gray-900 mb-2">7. Penghapusan Akun &amp; Masa Penyimpanan</h2>
            <p className="mb-2">
              Saat Anda menghapus akun, data identitas di profil aktif Anda
              (nama, nomor HP, email, foto, dan data rekening) segera dianonimkan
              dan seluruh sesi Anda dicabut. Anda tidak dapat masuk kembali.
            </p>
            <p className="mb-2">
              Sebagian data <strong>tetap kami simpan</strong> setelah akun dihapus,
              sebatas yang diperlukan untuk menyelesaikan sengketa atas pekerjaan
              yang telah berjalan, memenuhi kewajiban pembukuan dan perpajakan,
              serta membela hak kami dan hak Anda apabila timbul tuntutan hukum:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Riwayat pesanan, pembayaran, dompet, dan penarikan dana.</li>
              <li>Ulasan, percakapan, laporan, dan berkas sengketa.</li>
              <li>Dokumen verifikasi mitra (KTP dan swafoto), bagi pengguna mitra.</li>
              <li>Catatan persetujuan atas Syarat &amp; Ketentuan.</li>
            </ul>
            <p className="mt-2">
              Data tersebut tidak digunakan untuk pemasaran, dan dimusnahkan
              setelah masa penyimpanan yang berlaku berakhir.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-brand-gray-900 mb-2">8. Kontak</h2>
            <p>Untuk pertanyaan terkait privasi, hubungi kami melalui halaman <a href="/help" className="text-brand-red font-medium hover:underline">Bantuan</a>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
