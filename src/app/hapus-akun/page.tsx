import type { Metadata } from 'next';
import Link from 'next/link';
import { Mail, Trash2 } from 'lucide-react';
import MobilePageHeader from '@/components/layout/MobilePageHeader';
import { API_URL } from '@/lib/api';

// Halaman publik permintaan hapus akun . syarat Google Play.
//
// WAJIB bisa dibuka TANPA login. Jalur di dalam aplikasi (/profile/security)
// butuh sesi aktif, jadi orang yang lupa kata sandi, akunnya tersuspend, atau
// sudah menghapus aplikasinya tidak punya jalan lewat sana. Halaman ini yang
// menutup celah itu, dan URL-nya yang dicantumkan di formulir Data Safety.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Permintaan Hapus Akun',
  description:
    'Cara menghapus akun POSKO Jasa, data apa yang dihapus, dan data apa yang tetap disimpan beserta alasannya.',
  alternates: { canonical: 'https://poskojasa.com/hapus-akun' },
};

const SERVER_API = API_URL.startsWith('http') ? API_URL : 'https://api.poskojasa.com/api/v1';

async function getSupportEmail(): Promise<string> {
  try {
    const res = await fetch(`${SERVER_API}/config`, {
      headers: { 'X-Platform': 'web', 'X-App-Version': '1.0.0' },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return '';
    const json = await res.json();
    return json?.data?.profile?.support_email ?? '';
  } catch {
    return '';
  }
}

export default async function HapusAkunPage() {
  const email = await getSupportEmail();

  return (
    <div className="page-h bg-brand-gray-60">
      <MobilePageHeader title="Hapus Akun" titleAs="p" backHref="/" maxWidthClass="max-w-2xl" />
      <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">
        <h1 className="text-2xl lg:text-3xl font-bold text-brand-gray-900 mb-2">
          Permintaan Hapus Akun
        </h1>
        <p className="text-sm text-brand-gray-700 mb-8">
          Halaman ini menjelaskan cara menghapus akun POSKO Jasa dan apa yang
          terjadi pada data Anda.
        </p>

        <div className="bg-white rounded-lg border border-brand-gray-100 p-6 md:p-8 space-y-7 text-sm text-brand-gray-700 leading-relaxed">
          <section>
            <h2 className="text-base font-bold text-brand-gray-900 mb-3">
              Cara menghapus akun
            </h2>
            <p className="mb-3">
              <strong>Jika Anda masih bisa masuk:</strong> buka{' '}
              <strong>Profil → Keamanan Akun → Hapus Akun</strong>, lalu
              konfirmasi. Akun langsung dinonaktifkan.
            </p>
            <Link
              href="/profile/security"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-red text-white text-sm font-bold rounded-md hover:bg-brand-red-dark transition-colors"
            >
              <Trash2 className="w-4 h-4" /> Buka halaman Keamanan Akun
            </Link>

            <p className="mt-5 mb-2">
              <strong>Jika Anda tidak bisa masuk</strong> - lupa kata sandi, akun
              tersuspend, atau aplikasi sudah dihapus - kirim permintaan lewat
              email:
            </p>
            {email ? (
              <a
                href={`mailto:${email}?subject=Permintaan%20Hapus%20Akun`}
                className="inline-flex items-center gap-2 text-brand-red font-semibold hover:underline"
              >
                <Mail className="w-4 h-4" /> {email}
              </a>
            ) : (
              <p className="text-brand-gray-450">
                Alamat email dukungan sedang dilengkapi. Sementara ini gunakan
                menu Bantuan di aplikasi.
              </p>
            )}
            <p className="mt-2 text-xs text-brand-gray-450">
              Sertakan nomor HP atau email yang terdaftar agar kami dapat
              memverifikasi kepemilikan akun sebelum memprosesnya.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-brand-gray-900 mb-2">
              Data yang dihapus
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Nama, nomor HP, email, dan foto profil</li>
              <li>Data rekening bank</li>
              <li>Akses masuk - seluruh sesi dicabut dan Anda tidak bisa masuk lagi</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-brand-gray-900 mb-2">
              Data yang tetap disimpan
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Riwayat pesanan, pembayaran, dan mutasi dompet</li>
              <li>Ulasan, percakapan, dan berkas sengketa</li>
              <li>Dokumen verifikasi mitra, bagi pengguna mitra</li>
            </ul>
            <p className="mt-2">
              Data ini diperlukan untuk menyelesaikan sengketa atas pekerjaan
              yang telah berjalan dan memenuhi kewajiban pembukuan serta
              perpajakan - bukan untuk pemasaran. Rinciannya ada di{' '}
              <Link href="/privacy" className="text-brand-red font-medium hover:underline">
                Kebijakan Privasi
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-brand-gray-900 mb-2">
              Sebelum menghapus
            </h2>
            <p>
              Akun dengan <strong>pesanan yang masih berjalan tidak dapat
                dihapus</strong>. Selesaikan atau batalkan pesanan tersebut lebih
              dahulu. Bila Anda mitra, pastikan saldo sudah ditarik - penghapusan
              akun tidak membatalkan hak atas saldo, tetapi pencairannya menjadi
              lebih rumit.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
