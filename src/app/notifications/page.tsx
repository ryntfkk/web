"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, FileText, CheckCircle, CreditCard, AlertTriangle, DollarSign } from 'lucide-react';
import { notificationSpec, KNOWN_NOTIFICATION_TYPES } from '@/lib/notification-types';
import { fetchAPI } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useRefreshUnreadNotifications } from '@/hooks/useUnreadNotifications';
import MobilePageHeader from '@/components/layout/MobilePageHeader';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ListItemSkeleton } from '@/components/ui/skeleton';


interface Notification {
  id: string;
  title: string;
  body: string;
  // Backend mengirim string bebas (mis. 'review_reminder', 'order_update').
  type: string;
  reference_id?: string;
  // Backend menaruh id terkait di metadata (mis. { order_id }).
  metadata?: { order_id?: string; [k: string]: unknown };
  is_read: boolean;
  created_at: string;
}

const PER_PAGE = 20;

/**
 * Filter tab dieksekusi SERVER-SIDE: kirim daftar tipe milik kategori sebagai
 * `?types=a,b,c` (backend: `type = ANY(types)`). Dulu filter hanya menyaring
 * halaman yang SUDAH termuat — tab "Transaksi" bisa menampilkan 0 padahal
 * halaman berikutnya berisi item transaksi. Pemetaan tipe→kategori tetap satu
 * sumber kebenaran di lib/notification-types (server tidak menduplikasinya).
 * Catatan jujur: tipe BARU yang belum terdaftar di SPEC tidak ikut tab mana pun
 * (tetap tampil di "Semua") — test KNOWN_NOTIFICATION_TYPES menandainya.
 */
function typesParamFor(filter: string): string {
  if (filter !== 'transaction' && filter !== 'system') return '';
  const types = KNOWN_NOTIFICATION_TYPES.filter(
    (t) => notificationSpec(t).category === filter,
  );
  return `&types=${encodeURIComponent(types.join(','))}`;
}

export default function NotificationsPage() {
  const { isLoading: authLoading, isAuthorized, user, isAuthenticated } = useRequireAuth();
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  // Badge lonceng di TopNavbar membaca query terpisah . tanpa invalidasi ini ia
  // tetap menampilkan angka lama sampai interval berikutnya, tepat setelah
  // pengguna menekan "Tandai semua dibaca".
  const refreshUnreadBadge = useRefreshUnreadNotifications();

  useEffect(() => {
    // Tunggu auth selesai (silent refresh) sebelum fetch . tanpa gate ini
    // request pertama terkirim tanpa token dan gagal 401.
    if (isAuthenticated) {
      fetchNotifications(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  /**
   * Paginasi . backend SUDAH mendukungnya (`page` & `per_page`, lengkap dengan
   * metadata `pagination`), tapi halaman ini dulu memanggil `/notifications`
   * tanpa parameter apa pun dan tidak punya tombol muat-lagi. Notifikasi lama
   * jadi tak terjangkau begitu melewati batas bawaan (audit E8).
   */
  async function fetchNotifications(targetPage: number, filter: string = activeFilter) {
    const append = targetPage > 1;
    if (append) setLoadingMore(true);
    else setLoading(true);

    const res = await fetchAPI<any>(`/notifications?page=${targetPage}&per_page=${PER_PAGE}${typesParamFor(filter)}`);
    if (res.success && res.data) {
      const list: Notification[] = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
          ? res.data.data
          : [];
      setNotifications((prev) => (append ? [...prev, ...list] : list));
      setTotal(res.pagination?.total ?? list.length);
      setPage(targetPage);
    }
    setLoading(false);
    setLoadingMore(false);
  };

  async function handleMarkAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    await fetchAPI('/notifications/read-all', { method: 'PUT' });
    refreshUnreadBadge();
  };

  async function handleNotificationClick(n: Notification) {
    if (!n.is_read) {
      setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, is_read: true } : item));
      await fetchAPI(`/notifications/${n.id}/read`, { method: 'PUT' });
      refreshUnreadBadge();
    }
    
    // Notifikasi non-order (mis. `support_reply`) dikirim dengan orderID = Nil,
    // dan `notify.ToUser` menuliskannya ke metadata sebagai UUID nol
    // ("0000…0000") . string yang truthy. Tanpa saringan ini, klik notifikasi
    // "Admin membalas laporan Anda" mendarat di `/bantuan/0000…` (thread hampa),
    // bukan di kotak masuk. Perlakukan UUID nol sebagai "tanpa referensi".
    const NIL_UUID = '00000000-0000-0000-0000-000000000000';
    const rawRef = n.reference_id || n.metadata?.order_id;
    const ref = rawRef && rawRef !== NIL_UUID ? rawRef : undefined;

    // A09-T2: tujuan dibaca dari pemetaan eksplisit, bukan substring `type`.
    // Versi lama memeriksa `t === 'withdrawal'` padahal tipe sebenarnya
    // `withdrawal_rejected` . perbandingannya tidak pernah cocok, dan
    // notifikasi penarikan yang ditolak tidak membawa pengguna ke mana pun.
    const { target } = notificationSpec(n.type);
    const isPartner = user?.active_role === 'partner';

    switch (target.kind) {
      case 'wallet':
        router.push(isPartner ? '/mitra/wallet' : '/profile/wallet');
        return;
      case 'support':
        router.push(isPartner ? '/mitra/bantuan/chat' : ref ? `/bantuan/${ref}` : '/bantuan');
        return;
      // Pesanan & pembayaran punya DUA halaman: sisi pelanggan (`/orders/:id`,
      // `/payment/:id`) dan sisi mitra (`/mitra/orders/:id`). Tanpa cabang peran
      // ini, mitra yang menekan "Pesanan Baru Masuk" mendarat di layar pelanggan
      // . lengkap dengan tombol "Bayar Sekarang" / "Konfirmasi Selesai" yang
      // bukan miliknya dan pasti ditolak backend. Mitra tidak pernah membayar
      // pesanan, jadi notifikasi bertarget `payment` pun diarahkan ke detail
      // pesanan versi mitra, bukan ke halaman pembayaran.
      case 'payment':
        if (!ref) return;
        router.push(isPartner ? `/mitra/orders/${ref}` : `/payment/${ref}`);
        return;
      case 'order':
        if (!ref) return;
        router.push(isPartner ? `/mitra/orders/${ref}` : `/orders/${ref}`);
        return;
      case 'none':
        return;
    }
  };

  function getIcon(type: string) {
    // A09-T2: satu sumber kebenaran . lihat lib/notification-types.
    switch (notificationSpec(type).icon) {
      case 'payment':
        return <CreditCard className="w-5 h-5 text-brand-orange" />;
      case 'dispute':
        return <AlertTriangle className="w-5 h-5 text-brand-red" />;
      case 'withdrawal':
        return <DollarSign className="w-5 h-5 text-brand-gray-700" />;
      case 'review':
        return <CheckCircle className="w-5 h-5 text-brand-success" />;
      case 'order':
        return <FileText className="w-5 h-5 text-brand-info" />;
      case 'support':
        return <AlertTriangle className="w-5 h-5 text-brand-info" />;
      default:
        return <Bell className="w-5 h-5 text-brand-gray-400" />;
    }
  };

  function formatTime(time: string) {
    const date = new Date(time);
    const now = new Date();
    
    if (date.toDateString() === now.toDateString()) {
      return 'Hari ini, ' + date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (authLoading) return <div className="page-h bg-brand-gray-60"><ListItemSkeleton count={8} /></div>;
  if (!isAuthorized) return null;

  // Filter dieksekusi server-side saat fetch (lihat typesParamFor); saringan
  // klien di bawah dipertahankan sebagai lapis kedua agar ganti-tab terasa
  // instan atas data yang sudah termuat sebelum hasil server datang.
  const filteredNotifications = notifications.filter(n => {
    if (activeFilter === 'all') return true;
    // A09-T2: dulu `includes('order') || includes('payment')` . sehingga
    // `withdrawal_rejected`, notifikasi yang menyangkut UANG, tidak pernah
    // muncul di tab transaksi.
    if (activeFilter === 'transaction') return notificationSpec(n.type).category === 'transaction';
    if (activeFilter === 'system') return notificationSpec(n.type).category === 'system';
    return true;
  });

  function changeFilter(filter: string) {
    if (filter === activeFilter) return;
    setActiveFilter(filter);
    fetchNotifications(1, filter); // reset ke halaman 1 dengan filter server-side baru
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const dateBucket = (iso: string): string => {
    const d = new Date(iso);
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startYesterday = new Date(startToday); startYesterday.setDate(startToday.getDate() - 1);
    const startWeek = new Date(startToday); startWeek.setDate(startToday.getDate() - 7);
    if (d >= startToday) return 'Hari Ini';
    if (d >= startYesterday) return 'Kemarin';
    if (d >= startWeek) return 'Minggu Ini';
    return 'Lebih Lama';
  };
  const groupedNotifications = ['Hari Ini', 'Kemarin', 'Minggu Ini', 'Lebih Lama']
    .map((label) => ({ label, items: filteredNotifications.filter((n) => dateBucket(n.created_at) === label) }))
    .filter((g) => g.items.length > 0);

  const renderCard = (n: Notification) => (
    // `button`, bukan `div onClick`: seluruh kotak masuk notifikasi dulu tak
    // bisa dibuka dengan keyboard sama sekali (audit D4). `text-left` +
    // `w-full` mempertahankan tampilan kartunya.
    <button
      type="button"
      key={n.id}
      onClick={() => handleNotificationClick(n)}
      className={`w-full text-left bg-white rounded-lg border border-brand-gray-100 p-4 flex gap-4 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue ${!n.is_read ? 'bg-brand-error-soft border-brand-error-border' : 'hover:bg-brand-gray-60'}`}
    >
      <span className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${!n.is_read ? 'bg-white' : 'bg-brand-gray-60'}`}>
        {getIcon(n.type)}
      </span>
      {/* `span`, bukan h3/p: model isi <button> adalah phrasing content, dan
          heading/paragraf di dalamnya menghasilkan HTML tak valid. Tampilannya
          tidak berubah (`block` + kelas yang sama), dan nama aksesibel tombolnya
          justru menjadi judul + isi + waktu sekaligus . persis yang berguna
          dibacakan pembaca layar. */}
      <span className="flex-1 min-w-0">
        <span className={`block text-sm mb-1 ${!n.is_read ? 'font-bold text-brand-gray-900' : 'font-semibold text-brand-gray-700'}`}>
          {n.title}
        </span>
        <span className={`block text-sm mb-2 leading-snug ${!n.is_read ? 'text-brand-gray-800' : 'text-brand-gray-450'}`}>
          {n.body}
        </span>
        <span className="block text-[10px] text-brand-gray-450 font-medium uppercase tracking-wide">
          {formatTime(n.created_at)}
        </span>
      </span>
      {!n.is_read && (
        <span className="shrink-0 pt-1.5">
          <span className="block w-2.5 h-2.5 rounded-full bg-brand-red" />
        </span>
      )}
    </button>
  );

  return (
    <div className="page-h bg-brand-gray-60 pb-20 md:pb-10">
      {/* titleAs="p": H1 halaman ada di badan konten . tanpa ini HTML memuat DUA H1 sekaligus (audit A6). */}
      <MobilePageHeader
        titleAs="p"
        title="Notifikasi"
        maxWidthClass="max-w-3xl"
        right={unreadCount > 0 ? (
          <button onClick={handleMarkAllRead} className="text-sm font-semibold text-brand-red hover:underline">
            Tandai semua dibaca
          </button>
        ) : undefined}
      />

      <div className="hidden lg:flex max-w-3xl mx-auto px-4 pt-8 items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-brand-gray-900">Notifikasi</h1>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead} className="text-sm font-semibold text-brand-red hover:underline">
            Tandai semua dibaca
          </button>
        )}
      </div>

      {/* max-w-3xl: kotak masuk adalah DAFTAR, dan pada 512px ia jadi pita
          tipis di tengah layar 1440px (audit B2). */}
      <div className="max-w-3xl mx-auto px-4 py-4">
        {/* Filters */}
        {/* `scrollbar-hide`, bukan `hide-scrollbar`: yang didefinisikan di
            globals.css adalah yang pertama . nama lama tidak pernah cocok
            dengan apa pun, jadi scrollbar-nya tetap tampil (audit C3). */}
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
          <button
            onClick={() => changeFilter('all')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeFilter === 'all' ? 'bg-brand-red text-white' : 'bg-white border border-brand-gray-100 text-brand-gray-700 hover:bg-brand-gray-60'}`}
          >
            Semua
          </button>
          <button
            onClick={() => changeFilter('transaction')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeFilter === 'transaction' ? 'bg-brand-red text-white' : 'bg-white border border-brand-gray-100 text-brand-gray-700 hover:bg-brand-gray-60'}`}
          >
            Transaksi
          </button>
          <button
            onClick={() => changeFilter('system')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeFilter === 'system' ? 'bg-brand-red text-white' : 'bg-white border border-brand-gray-100 text-brand-gray-700 hover:bg-brand-gray-60'}`}
          >
            Sistem
          </button>
        </div>
        
        {loading ? (
          <ListItemSkeleton count={4} />
        ) : filteredNotifications.length === 0 ? (
          <EmptyState icon={Bell} title="Belum Ada Notifikasi" description="Notifikasi pesanan, pembayaran, dan info penting akan muncul di sini." />
        ) : (
          <div className="space-y-5">
            {groupedNotifications.map((group) => (
              <div key={group.label}>
                <h2 className="text-xs font-semibold text-brand-gray-400 uppercase tracking-wide px-1 mb-2">{group.label}</h2>
                <div className="space-y-2">
                  {group.items.map(renderCard)}
                </div>
              </div>
            ))}

            {notifications.length < total && (
              <div className="pt-2 text-center">
                <Button variant="outline" onClick={() => fetchNotifications(page + 1)} disabled={loadingMore}>
                  {loadingMore ? 'Memuat…' : `Muat lebih banyak (${notifications.length}/${total})`}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

