"use client";

import { getInitial } from '@/lib/utils';
import { useCallback, useEffect, useState } from 'react';
import {
  User, ShieldCheck, CreditCard, LogOut, FileText, CheckCircle,
  RefreshCw, Image as ImageIcon, MapPin, Bell, SlidersHorizontal, Phone, ExternalLink,
  CalendarDays, Building2, Trash2,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { fetchAPI } from '@/lib/api';
import { track } from '@/lib/analytics';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { SwitchRoleModal } from '@/components/ui/switch-role-modal';
import { MenuCard, MenuListItem } from '@/components/ui/menu-list-item';
import { PageSkeleton } from '@/components/ui/skeleton';
import ProfileCompleteness from '@/components/mitra/ProfileCompleteness';
import CategorySlots from '@/components/mitra/CategorySlots';
import MitraPageContainer from '@/components/mitra/MitraPageContainer';
import Image from 'next/image';

export default function MitraProfilePage() {
  const { isLoading: authLoading, isAuthorized, user, isAuthenticated } = useRequireAuth();
  const { logout } = useAuth();

  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  // Nama TAMPIL dari /partners/me (view partner_identity), bukan `user.name`.
  // Untuk vendor keduanya BEDA: user.name adalah nama PIC (orang), sedangkan
  // yang dilihat pelanggan adalah display_name badan usaha. Halaman ini dulu
  // menampilkan nama PIC di bawah judul "Profil Bisnis".
  const [partner, setPartner] = useState<{
    name?: string;
    partner_type?: string;
    pic_name?: string;
  } | null>(null);

  const fetchProfile = useCallback(async () => {
    const res = await fetchAPI<{
      verification_status?: string;
      name?: string;
      partner_type?: string;
      pic_name?: string;
    }>('/partners/me');
    if (res.success && res.data) {
      // F2: default fail-closed ke PENDING (bukan VERIFIED) . lihat plan §2.
      // Backend enum lowercase; .toUpperCase() di render.
      setVerificationStatus(res.data.verification_status || 'pending');
      setPartner(res.data);
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchProfile();
  }, [isAuthenticated, fetchProfile]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleLogout = () => logout();

  if (authLoading) return <PageSkeleton />;
  if (!isAuthorized) return null;

  const vs = (verificationStatus || '').toUpperCase();
  const isVerified = vs === 'APPROVED' || vs === 'VERIFIED';
  const isPending = vs === 'PENDING';
  const isVendor = partner?.partner_type === 'vendor';
  // Fallback ke user.name hanya selama /partners/me belum termuat. Untuk
  // perorangan keduanya memang sama (view partner_identity ber-COALESCE ke
  // users.name), jadi tidak ada kedipan nama yang terlihat.
  const displayName = partner?.name || user?.name || '';

  return (
    <div className="pb-6">
      {/* Header . hero premium */}
      <div className="bg-gradient-to-br from-brand-red via-brand-red-accent to-brand-red text-white py-5 md:py-10 relative overflow-hidden shadow-md">
        {/* Decorative background shapes */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4"></div>

        <MitraPageContainer variant="profile" className="py-0 relative z-10 flex items-center gap-4 md:gap-6">
          {/* Foto profil hanya DITAMPILKAN di sini. Jalur ubahnya ada di
              /mitra/account (PATCH /users/me . avatar milik `users`, bukan
              `partners`). Dulu ada jangkar `#foto-profil` di sini yang tidak
              menuju kontrol apa pun. */}
          <div className="relative shrink-0">
            <div className="relative w-16 h-16 md:w-24 md:h-24 rounded-lg bg-white/10 backdrop-blur-md flex items-center justify-center text-2xl md:text-4xl font-extrabold text-white overflow-hidden border border-white/30 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
              {user?.avatar_url
                ? <Image src={user.avatar_url} alt="Foto profil" fill sizes="(max-width: 768px) 64px, 96px" className="object-cover" />
                : getInitial(displayName)}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-3xl font-extrabold truncate tracking-tight drop-shadow-sm">{displayName}</h1>
            {/* Vendor: nama PIC ditampilkan terpisah supaya tetap terlihat siapa
                penanggung jawabnya tanpa mengaburkan nama yang dilihat pelanggan. */}
            {isVendor && partner?.pic_name && (
              <p className="text-white/80 text-[11px] md:text-xs font-medium mt-0.5 drop-shadow-sm truncate">
                PIC: {partner.pic_name}
              </p>
            )}
            <p className="text-white/90 text-[13px] md:text-sm font-medium mt-0.5 md:mt-1 drop-shadow-sm">{user?.phone || 'Nomor HP belum diisi'}</p>
            <div className="mt-2 md:mt-3 flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center px-2.5 py-1 md:px-3 md:py-1.5 rounded-full text-[10px] md:text-xs font-bold text-white bg-white/20 backdrop-blur-sm border border-white/20 shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> Mode Mitra
              </span>
              {verificationStatus !== null && (
                <span
                  title={isVerified ? 'Terverifikasi' : undefined}
                  aria-label={isVerified ? 'Terverifikasi' : undefined}
                  className={`px-2.5 py-1 md:px-3 md:py-1.5 rounded-full text-[9px] md:text-[10px] font-bold uppercase inline-flex items-center gap-1.5 shadow-sm border ${isVerified ? 'bg-brand-success-soft/90 backdrop-blur-sm text-brand-success-dark border-brand-success-light' :
                    isPending ? 'bg-brand-orange-soft/90 backdrop-blur-sm text-brand-amber-dark border-brand-orange-light' :
                      'bg-white/90 backdrop-blur-sm text-brand-error-dark border-brand-error-light'
                  }`}>
                  {isVerified ? (
                    <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
                  ) : (
                    isPending ? 'Menunggu Verifikasi' : 'Ditolak'
                  )}
                </span>
              )}
            </div>
          </div>
        </MitraPageContainer>
      </div>

      {/* Dua kolom di desktop, seperti /profile pelanggan. Sebagai satu kolom
          tunggal, daftar menu ini jadi tumpukan pita selebar layar . urutan DOM
          sengaja dipertahankan supaya urutan bacanya di ponsel tidak berubah. */}
      <MitraPageContainer
        variant="profile"
        className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-5 lg:items-start lg:space-y-0"
      >
        <div className="space-y-4">
        {/* Ditaruh paling atas: yang belum terisi punya akibat langsung .
            tanpa layanan aktif mitra tak muncul di pencarian sama sekali. */}
        <ProfileCompleteness />

        {/* Slot kategori (000080). Ditaruh di /mitra/profile, bukan halaman
            sendiri: halaman ini level `always`, jadi mitra yang masih pending
            pun bisa mengurusnya . dan merekalah yang paling perlu. */}
        <CategorySlots />

        <MenuCard title="Mode">
          <MenuListItem icon={RefreshCw} label="Beralih ke Mode Pelanggan" subtitle="Pesan layanan sebagai pelanggan" onClick={() => setShowSwitchModal(true)} />
        </MenuCard>

        {/* Mitra tidak punya cara melihat dirinya sebagaimana dilihat pelanggan
            (P2). Tanpa ini, satu-satunya cara mengecek hasil suntingan profil
            adalah menebak. */}
        {user?.username && (
          <MenuCard title="Etalase">
            {/* Klik ditangkap di pembungkus: MenuListItem versi href merender
                Link dan tidak menerima onClick. */}
            <div onClick={() => track('partner_profile_previewed')}>
              <MenuListItem
                icon={ExternalLink}
                label="Lihat Profil Publik"
                subtitle="Tampilan profilmu di mata pelanggan"
                href={`/${user.username}`}
              />
            </div>
          </MenuCard>
        )}
        </div>

        <div className="space-y-4">
        <MenuCard title="Akun & Mitra">
          {/* Tanpa baris ini mode mitra tidak punya SATU PUN jalan ke halaman
              nama/email/HP . mitra perorangan tidak bisa mengganti namanya
              sendiri karena namanya hidup di `users`, bukan `partners`. */}
          <MenuListItem
            icon={User}
            label="Informasi Akun"
            subtitle={isVendor ? 'Nama PIC, nomor HP & email pribadi' : 'Nama, nomor HP & email'}
            href="/mitra/account"
          />
          {/* Vendor punya identitas kedua (nama tampil, PIC, kontak bisnis) yang
              tidak ada padanannya di akun perorangan. */}
          {isVendor && (
            <MenuListItem
              icon={Building2}
              label="Identitas Usaha"
              subtitle="Nama tampil, PIC & kontak bisnis"
              href="/mitra/business"
            />
          )}
          <MenuListItem icon={ShieldCheck} label="Status Verifikasi Dokumen" subtitle="Cek status & unggah ulang dokumen" href="/mitra/verification-status" />
          <MenuListItem icon={FileText} label="Dokumen Pendukung" subtitle="SKCK, sertifikat, izin usaha" href="/mitra/documents" />
          <MenuListItem icon={User} label="Keamanan Akun" subtitle="Ubah kata sandi & keamanan" href="/mitra/security" />
          <MenuListItem icon={MapPin} label="Alamat Basecamp" subtitle="Titik lokasi & jangkauan layanan" href="/mitra/basecamp" />
          <MenuListItem icon={CalendarDays} label="Jam Operasional" subtitle="Atur jam kerja & cuti" href="/mitra/schedule" />
          <MenuListItem icon={CreditCard} label="Rekening Bank" subtitle="Tujuan pencairan saldo" href="/mitra/bank-account" />
          <MenuListItem icon={ImageIcon} label="Galeri Portofolio" subtitle="Foto hasil pekerjaan" href="/mitra/portfolio" />
          {/* Dua hal berbeda, dan subtitle lama menjanjikan yang kedua sambil
              menuju yang pertama (P1-14). */}
          <MenuListItem icon={Bell} label="Notifikasi" subtitle="Kotak masuk pemberitahuan" href="/notifications" />
          <MenuListItem icon={SlidersHorizontal} label="Preferensi Notifikasi" subtitle="Atur pemberitahuan push & email" href="/mitra/notifications" />
        </MenuCard>

        <MenuCard title="Bantuan & Legal">
          <MenuListItem icon={Phone} label="Bantuan Mitra" subtitle="FAQ mitra, chat CS & sengketa" href="/mitra/bantuan" />
          {/* Bukan "Syarat & Ketentuan Mitra": tujuannya /terms (ketentuan
              pelanggan). Dokumen mitra ada di /legal/partner-terms dan masih
              draf . labelnya dulu menjanjikan dokumen yang tidak pernah dibuka. */}
          <MenuListItem icon={FileText} label="Syarat & Ketentuan" href="/terms" />
          <MenuListItem icon={ShieldCheck} label="Kebijakan Privasi" href="/privacy" />
        </MenuCard>

        {/* Mode pelanggan punya baris ini (`/profile`), mode mitra tidak .
            padahal rutenya sama-sama ada. Jalan keluar dari sebuah akun tidak
            boleh cuma bisa ditemukan dengan berpindah mode dulu.
            Subtitle menyebut retensi: data pesanan & dokumen mitra memang
            DIPERTAHANKAN setelah akun dihapus (§7d), dan mitra berhak tahu itu
            SEBELUM menekan, bukan sesudahnya. */}
        <MenuCard title="Zona Berbahaya">
          <MenuListItem
            icon={Trash2}
            label="Hapus Akun"
            subtitle="Ajukan penghapusan akun permanen"
            href="/hapus-akun"
          />
        </MenuCard>


        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 bg-white py-3 rounded-md border border-brand-red text-brand-red font-semibold hover:bg-brand-red-soft transition-colors"
        >
          <LogOut className="w-5 h-5" /> Keluar dari Akun
        </button>

        <p className="text-center text-xs text-brand-gray-400">Versi 1.0.0</p>
        </div>
      </MitraPageContainer>

      <SwitchRoleModal isOpen={showSwitchModal} onClose={() => setShowSwitchModal(false)} />
    </div>
  );
}
