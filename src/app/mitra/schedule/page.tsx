"use client";
import { useToast } from '@/components/ui/toast';

import { useCallback, useEffect, useState } from 'react';
import { CalendarOff, Clock, Plus, Trash2, X } from 'lucide-react';
import MitraPageHeader from '@/components/mitra/MitraPageHeader';
import { Button } from '@/components/ui/button';
import MitraModal from '@/components/mitra/MitraModal';
import MitraSection from '@/components/mitra/MitraSection';
import DataState from '@/components/mitra/DataState';
import { fetchAPI } from '@/lib/api';
import { track } from '@/lib/analytics';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { getErrorMessage } from '@/types/api';
import { Loader2 } from 'lucide-react';
import { PageSkeleton } from '@/components/ui/skeleton';


const DAYS = [
  { id: 'monday', label: 'Senin' },
  { id: 'tuesday', label: 'Selasa' },
  { id: 'wednesday', label: 'Rabu' },
  { id: 'thursday', label: 'Kamis' },
  { id: 'friday', label: 'Jumat' },
  { id: 'saturday', label: 'Sabtu' },
  { id: 'sunday', label: 'Minggu' },
];

/** Baris jam kerja sebagaimana dikirim backend (DTO WorkingHourResponse). */
interface WorkingHourRow {
  day_of_week: string;
  open_time: string;
  close_time: string;
  is_open: boolean;
  /** Jeda istirahat; tidak dikirim sama sekali bila hari itu tanpa jeda. */
  break_start?: string | null;
  break_end?: string | null;
}

/** Cuti/libur per tanggal (migrasi 000070). */
interface TimeOff {
  id: string;
  start_date: string;
  end_date: string;
  reason?: string;
  /** Pesanan aktif yang TERLANJUR terjadwal di rentang ini. */
  affected_orders: number;
}

interface DaySchedule {
  is_active: boolean;
  start_time: string;
  end_time: string;
  /** '' = tanpa jeda. Keduanya selalu diisi/dikosongkan bersama. */
  break_start: string;
  break_end: string;
}

const DEFAULT_BREAK = { break_start: '12:00', break_end: '13:00' };

function formatDateRange(start: string, end: string): string {
  const fmt = (v: string) =>
    new Date(`${v}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  return start === end ? fmt(start) : `${fmt(start)} – ${fmt(end)}`;
}

export default function MitraSchedulePage() {
  const { isLoading: authLoading, isAuthorized, user, isAuthenticated } = useRequireAuth();

  const [schedule, setSchedule] = useState<Record<string, DaySchedule>>({
    monday: { is_active: true, start_time: '08:00', end_time: '17:00', break_start: '', break_end: '' },
    tuesday: { is_active: true, start_time: '08:00', end_time: '17:00', break_start: '', break_end: '' },
    wednesday: { is_active: true, start_time: '08:00', end_time: '17:00', break_start: '', break_end: '' },
    thursday: { is_active: true, start_time: '08:00', end_time: '17:00', break_start: '', break_end: '' },
    friday: { is_active: true, start_time: '08:00', end_time: '17:00', break_start: '', break_end: '' },
    saturday: { is_active: false, start_time: '08:00', end_time: '15:00', break_start: '', break_end: '' },
    sunday: { is_active: false, start_time: '08:00', end_time: '12:00', break_start: '', break_end: '' },
  });

  // Cuti/libur . daftar terpisah dari pola mingguan karena memang beda sifatnya:
  // pola mingguan berulang, cuti adalah pengecualian bertanggal.
  const [timeOff, setTimeOff] = useState<TimeOff[]>([]);
  const [timeOffError, setTimeOffError] = useState<string | null>(null);
  const [showTimeOffModal, setShowTimeOffModal] = useState(false);
  const [timeOffForm, setTimeOffForm] = useState({ start_date: '', end_date: '', reason: '' });
  const [savingTimeOff, setSavingTimeOff] = useState(false);
  const [deletingTimeOff, setDeletingTimeOff] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();
  const [activeOrderCount, setActiveOrderCount] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(false);
  // Jadwal di DB. Selama belum tersimpan, nilai di layar hanyalah default UI
  // dan pelanggan TIDAK bisa memesan . tampilkan peringatan.
  const [hasSavedSchedule, setHasSavedSchedule] = useState(true);


  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    try {
      const [schedRes, summaryRes, timeOffRes] = await Promise.all([
        fetchAPI<WorkingHourRow[]>('/partners/me/working-hours'),
        // Ringkasan, BUKAN daftar pesanan (P1-02). Dulu mengunduh /orders yang
        // default 10 baris lalu menghitung sendiri, jadi peringatan "ada N
        // pesanan aktif" bisa salah tanpa ada yang menyadarinya.
        fetchAPI<{ active: number }>('/orders/summary'),
        fetchAPI<TimeOff[]>('/partners/me/time-off'),
      ]);

      if (schedRes.success && schedRes.data) {
        const schedData = (schedRes.data as WorkingHourRow[]);
        if (Array.isArray(schedData)) {
          setHasSavedSchedule(schedData.length > 0);
          const next = { ...schedule };
          const hhmm = (v: unknown) => String(v ?? '').match(/(\d{2}:\d{2})/)?.[1];
          for (const row of schedData) {
            const day = String(row.day_of_week || '');
            if (next[day]) {
              const bs = row.break_start ? hhmm(row.break_start) : '';
              const be = row.break_end ? hhmm(row.break_end) : '';
              next[day] = {
                is_active: Boolean(row.is_open),
                start_time: hhmm(row.open_time) || next[day].start_time,
                end_time: hhmm(row.close_time) || next[day].end_time,
                // Jeda hanya dianggap ada bila KEDUANYA terbaca. Separuh jeda
                // tidak menutup apa pun dan lebih baik tampil sebagai "tidak ada".
                break_start: bs && be ? bs : '',
                break_end: bs && be ? be : '',
              };
            }
          }
          setSchedule(next);
        }
      }

      if (summaryRes.success && summaryRes.data) {
        setActiveOrderCount((summaryRes.data as { active: number })?.active ?? 0);
      }

      // Gagal memuat cuti TIDAK boleh tampak seperti "tidak punya cuti":
      // mitra akan mengira cutinya hilang lalu membuat yang dobel.
      if (timeOffRes.success) {
        setTimeOff(timeOffRes.data ?? []);
        setTimeOffError(null);
      } else {
        setTimeOffError(timeOffRes.message || 'Gagal memuat jadwal cuti');
      }
    } finally {
      setLoading(false);
    }
    // schedule sengaja tidak jadi dependensi: fungsi ini MENULIS ke schedule,
    // memasukkannya akan membuat loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchSchedule();
  }, [isAuthenticated, user?.active_role, fetchSchedule]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const confirmSave = () => {
    // Validasi: jam buka harus lebih awal dari jam tutup untuk setiap hari aktif.
    const invalid = DAYS.find(d => {
      const s = schedule[d.id];
      return s.is_active && s.start_time >= s.end_time;
    });
    if (invalid) {
      showToast(`Jam ${invalid.label} tidak valid: jam buka harus sebelum jam tutup`, 'error');
      return;
    }
    // Cerminan validasi backend . supaya mitra tahu sebelum menekan simpan,
    // bukan sesudah request gagal.
    const badBreak = DAYS.find(d => {
      const s2 = schedule[d.id];
      if (!s2.is_active || !s2.break_start || !s2.break_end) return false;
      return (
        s2.break_start >= s2.break_end ||
        s2.break_start < s2.start_time ||
        s2.break_end > s2.end_time
      );
    });
    if (badBreak) {
      const s2 = schedule[badBreak.id];
      showToast(
        `Jam istirahat ${badBreak.label} harus berada di dalam jam buka (${s2.start_time}–${s2.end_time}) dan mulai sebelum selesai`,
        'error',
      );
      return;
    }
    if (activeOrderCount > 0) {
      setShowWarningModal(true);
    } else {
      handleSave();
    }
  };

  const handleSave = async () => {
    setSaving(true);
    // SATU request untuk seluruh minggu (P1-03). Dulu tujuh PUT paralel: bila
    // sebagian gagal, mitra tertinggal dengan jadwal campuran . sebagian hari
    // baru, sebagian lama . tanpa cara tahu yang mana. Sekarang backend
    // menyimpannya dalam satu transaksi: semua tersimpan, atau tidak sama sekali.
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const toHms = (t: string) => (t && t.length === 5 ? `${t}:00` : t);
    try {
      const res = await fetchAPI<{ updated: boolean; affected_orders_count: number }>(
        '/partners/me/working-hours/batch',
        {
          method: 'PUT',
          body: JSON.stringify({
            hours: days.map((day) => {
              const d = schedule[day];
              const hasBreak = Boolean(d.break_start && d.break_end);
              return {
                day_of_week: day,
                open_time: toHms(d.start_time),
                close_time: toHms(d.end_time),
                is_open: d.is_active,
                // String kosong = hapus jeda. Backend menimpanya dengan NULL,
                // jadi mematikan jeda memang harus mengirim kosong, bukan
                // menghilangkan field-nya.
                break_start: hasBreak ? toHms(d.break_start) : '',
                break_end: hasBreak ? toHms(d.break_end) : '',
              };
            }),
          }),
        },
      );

      // Selalu sinkronkan dari server: yang tampil harus keadaan tersimpan,
      // bukan yang diketik.
      await fetchSchedule();

      if (res.success) {
        track('partner_schedule_saved', {
          open_days: days.filter(d => schedule[d].is_active).length,
          days_with_break: days.filter(d => schedule[d].break_start && schedule[d].break_end).length,
        });
        showToast('Jadwal berhasil disimpan!');
      } else {
        showToast(getErrorMessage(res) || 'Gagal menyimpan jadwal', 'error');
      }
    } catch {
      showToast('Gagal menyimpan jadwal', 'error');
      await fetchSchedule();
    }
    setSaving(false);
  };


  const handleAddTimeOff = async () => {
    if (!timeOffForm.start_date || !timeOffForm.end_date) {
      showToast('Isi tanggal mulai dan selesai', 'error');
      return;
    }
    if (timeOffForm.end_date < timeOffForm.start_date) {
      showToast('Tanggal selesai tidak boleh sebelum tanggal mulai', 'error');
      return;
    }
    setSavingTimeOff(true);
    const res = await fetchAPI<TimeOff>('/partners/me/time-off', {
      method: 'POST',
      body: JSON.stringify(timeOffForm),
    });
    setSavingTimeOff(false);

    if (res.success) {
      setShowTimeOffModal(false);
      setTimeOffForm({ start_date: '', end_date: '', reason: '' });
      await fetchSchedule();
      // Cuti TIDAK membatalkan pesanan yang sudah masuk . katakan itu sekarang,
      // bukan biarkan mitra menemukannya saat pelanggan menunggu di rumah.
      const affected = res.data?.affected_orders ?? 0;
      showToast(
        affected > 0
          ? `Cuti tersimpan. ${affected} pesanan sudah terjadwal di rentang ini dan TETAP jadi kewajibanmu.`
          : 'Cuti tersimpan.',
      );
    } else {
      showToast(getErrorMessage(res) || 'Gagal menyimpan cuti', 'error');
    }
  };

  const handleDeleteTimeOff = async (id: string) => {
    setDeletingTimeOff(id);
    const res = await fetchAPI(`/partners/me/time-off/${id}`, { method: 'DELETE' });
    setDeletingTimeOff(null);
    if (res.success) {
      setTimeOff(prev => prev.filter(t => t.id !== id));
      showToast('Cuti dihapus');
    } else {
      showToast(getErrorMessage(res) || 'Gagal menghapus cuti', 'error');
    }
  };

  if (authLoading) return <PageSkeleton />;
  if (!isAuthorized) return null;

  return (
    <div className="page-h bg-brand-gray-60 pb-24">

      {/* Header */}
      <MitraPageHeader
        title="Atur Jadwal Operasional"
        variant="form"
        backHref="/mitra/dashboard"
        breadcrumbs={[{ label: 'Dashboard', href: '/mitra/dashboard' }, { label: 'Jadwal Operasional' }]}
      />

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="bg-brand-error-soft border border-brand-error-border rounded-lg p-4 flex gap-3 items-start mb-2">
          <Clock className="w-5 h-5 text-brand-error shrink-0 mt-0.5" />
          <p className="text-sm text-brand-error font-medium leading-relaxed">
            Tentukan hari dan jam Anda bersedia menerima pesanan. Pelanggan hanya bisa memesan pada jam operasional yang aktif.
          </p>
        </div>

        {!loading && !hasSavedSchedule && (
          <div className="bg-brand-warning-soft border border-brand-warning-border rounded-lg p-4 flex gap-3 items-start mb-2">
            <Clock className="w-5 h-5 text-brand-warning-dark shrink-0 mt-0.5" />
            <p className="text-sm text-brand-warning-dark font-semibold leading-relaxed">
              Jadwal Anda belum tersimpan. Jam di bawah ini hanyalah contoh - pelanggan belum bisa memesan sampai Anda menekan &quot;Simpan Jadwal&quot;.
            </p>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6, 7].map(i => (
              <div key={i} className="bg-white rounded-lg border border-brand-gray-100 p-4 h-16 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-brand-gray-100 overflow-hidden">
            {DAYS.map((day, index) => {
              const dayData = schedule[day.id];
              const hasBreak = Boolean(dayData.break_start && dayData.break_end);
              return (
                <div key={day.id} className={`p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${index < DAYS.length - 1 ? 'border-b border-brand-gray-100' : ''}`}>
                  <label className="flex items-center gap-3 cursor-pointer min-w-[120px]">
                    <input
                      type="checkbox"
                      checked={dayData.is_active}
                      onChange={e => setSchedule({ ...schedule, [day.id]: { ...dayData, is_active: e.target.checked } })}
                      className="w-4 h-4 text-brand-red rounded-md focus:ring-brand-red"
                    />
                    <span className="font-semibold text-brand-gray-900">{day.label}</span>
                  </label>

                  {dayData.is_active ? (
                    <div className="flex flex-col gap-2 pl-7 sm:items-end sm:pl-0">
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          aria-label={`Jam buka ${day.label}`}
                          value={dayData.start_time}
                          onChange={e => setSchedule({ ...schedule, [day.id]: { ...dayData, start_time: e.target.value } })}
                          className="p-2 border border-brand-gray-100 rounded-md text-sm text-brand-gray-900 focus:outline-none focus:border-brand-red"
                        />
                        <span className="text-brand-gray-450 font-medium">-</span>
                        <input
                          type="time"
                          aria-label={`Jam tutup ${day.label}`}
                          value={dayData.end_time}
                          onChange={e => setSchedule({ ...schedule, [day.id]: { ...dayData, end_time: e.target.value } })}
                          className="p-2 border border-brand-gray-100 rounded-md text-sm text-brand-gray-900 focus:outline-none focus:border-brand-red"
                        />
                      </div>

                      {/* Jeda istirahat. Tanpa ini mitra yang buka 08:00-17:00
                          tetap bisa dipesan tepat pukul 12:00, dan menolaknya
                          manual dihitung sebagai mitra yang tak bisa diandalkan. */}
                      {hasBreak ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-brand-gray-450">Istirahat</span>
                          <input
                            type="time"
                            aria-label={`Mulai istirahat ${day.label}`}
                            value={dayData.break_start}
                            onChange={e => setSchedule({ ...schedule, [day.id]: { ...dayData, break_start: e.target.value } })}
                            className="p-1.5 border border-brand-gray-100 rounded-md text-xs text-brand-gray-900 focus:outline-none focus:border-brand-red"
                          />
                          <span className="text-brand-gray-450">-</span>
                          <input
                            type="time"
                            aria-label={`Selesai istirahat ${day.label}`}
                            value={dayData.break_end}
                            onChange={e => setSchedule({ ...schedule, [day.id]: { ...dayData, break_end: e.target.value } })}
                            className="p-1.5 border border-brand-gray-100 rounded-md text-xs text-brand-gray-900 focus:outline-none focus:border-brand-red"
                          />
                          <button
                            type="button"
                            onClick={() => setSchedule({ ...schedule, [day.id]: { ...dayData, break_start: '', break_end: '' } })}
                            className="rounded-md p-1 text-brand-gray-450 hover:bg-brand-gray-60 hover:text-brand-error"
                            aria-label={`Hapus jam istirahat ${day.label}`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSchedule({ ...schedule, [day.id]: { ...dayData, ...DEFAULT_BREAK } })}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-red hover:underline"
                        >
                          <Plus className="h-3 w-3" aria-hidden /> Tambah jam istirahat
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="pl-7 sm:pl-0">
                      <span className="text-sm font-semibold text-brand-gray-450 bg-brand-gray-60 px-3 py-1.5 rounded-md">Tutup</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Cuti / libur ──────────────────────────────────────────
            Terpisah dari pola mingguan karena memang beda sifatnya: pola
            mingguan berulang, cuti adalah pengecualian bertanggal. Sebelum ini
            satu-satunya cara menyatakan cuti adalah menutup hari itu SELAMANYA
            lalu ingat membukanya kembali. */}
        <MitraSection
          className="pt-4"
          title="Cuti & Libur"
          description="Pelanggan tidak bisa membuat pesanan baru pada tanggal ini. Pesanan yang sudah terjadwal tetap berjalan."
          action={
            <Button
              variant="outline"
              size="sm"
              className="rounded-md"
              onClick={() => {
                setTimeOffForm({ start_date: '', end_date: '', reason: '' });
                setShowTimeOffModal(true);
              }}
            >
              <Plus className="mr-1 h-4 w-4" aria-hidden /> Tambah
            </Button>
          }
        >
          <DataState
            isLoading={loading}
            error={timeOffError}
            onRetry={fetchSchedule}
            isEmpty={timeOff.length === 0}
            emptyIcon={<CalendarOff className="mx-auto mb-3 h-10 w-10 text-brand-gray-100" />}
            emptyTitle="Belum ada jadwal cuti."
            emptyDescription="Tambahkan tanggal saat kamu tidak bisa menerima pesanan."
            skeleton={<div className="h-20 animate-pulse rounded-lg border border-brand-gray-100 bg-white" />}
          >
            <ul className="space-y-2">
              {timeOff.map(t => (
                <li
                  key={t.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-brand-gray-100 bg-white p-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-brand-gray-900">
                      {formatDateRange(t.start_date, t.end_date)}
                    </p>
                    {t.reason && <p className="mt-0.5 text-xs text-brand-gray-450">{t.reason}</p>}
                    {t.affected_orders > 0 && (
                      <p className="mt-1 text-xs font-medium text-brand-warning-dark">
                        {t.affected_orders} pesanan sudah terjadwal di rentang ini - tetap jadi kewajibanmu.
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteTimeOff(t.id)}
                    disabled={deletingTimeOff === t.id}
                    className="shrink-0 rounded-md p-2 text-brand-gray-450 transition-colors hover:bg-brand-error-soft hover:text-brand-error disabled:cursor-wait"
                    aria-label={`Hapus cuti ${formatDateRange(t.start_date, t.end_date)}`}
                  >
                    {deletingTimeOff === t.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </DataState>
        </MitraSection>

        <div className="pt-6">
          <div className="bg-brand-warning-soft border border-brand-warning-border rounded-md p-3 mb-4 flex gap-2 items-start">
            <Clock className="w-4 h-4 text-brand-warning-dark shrink-0 mt-0.5" />
            <p className="text-xs text-brand-warning-dark font-medium leading-relaxed">
              Catatan: Perubahan jam operasional hanya akan berlaku pada pesanan yang baru masuk. Pesanan yang sudah terjadwal tidak akan terpengaruh.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Bar.
          lg:left-60 = lebar sidebar. Tanpa ini bilah mulai dari left-0 dan
          menutupi bagian bawah sidebar (menu footer + "Beralih ke Pelanggan")
          di desktop, sekaligus membuat tombol terpusat pada viewport penuh,
          bukan area konten . terlihat bergeser dari form di atasnya. */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-brand-gray-100 p-4 z-50 lg:left-60">
        <div className="max-w-2xl mx-auto">
          <Button
            className="w-full bg-brand-red hover:bg-brand-red-dark text-white rounded-lg h-12 text-sm font-bold shadow-sm"
            onClick={confirmSave}
            disabled={loading || saving}
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Simpan Jadwal'}
          </Button>
        </div>
      </div>

      <MitraModal
        open={showTimeOffModal}
        onClose={() => setShowTimeOffModal(false)}
        title="Tambah Cuti"
        description="Pada tanggal ini pelanggan tidak bisa membuat pesanan baru untukmu."
        footer={
          <>
            <Button variant="outline" className="flex-1 rounded-md" onClick={() => setShowTimeOffModal(false)}>
              Batal
            </Button>
            <Button
              className="flex-1 rounded-md bg-brand-red text-white"
              onClick={handleAddTimeOff}
              disabled={savingTimeOff || !timeOffForm.start_date || !timeOffForm.end_date}
            >
              {savingTimeOff ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : 'Simpan'}
            </Button>
          </>
        }
      >
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-brand-gray-700">Mulai</span>
              <input
                type="date"
                value={timeOffForm.start_date}
                onChange={e =>
                  setTimeOffForm(f => ({
                    ...f,
                    start_date: e.target.value,
                    // Rentang sehari adalah kasus paling umum; menyamakan
                    // tanggal selesai menghemat satu langkah dan mencegah
                    // pengajuan dengan tanggal selesai yang lupa diisi.
                    end_date: f.end_date && f.end_date >= e.target.value ? f.end_date : e.target.value,
                  }))
                }
                className="w-full rounded-md border border-brand-gray-100 px-2.5 py-2 text-sm text-brand-gray-900 focus:border-brand-red focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-brand-gray-700">Selesai</span>
              <input
                type="date"
                min={timeOffForm.start_date || undefined}
                value={timeOffForm.end_date}
                onChange={e => setTimeOffForm(f => ({ ...f, end_date: e.target.value }))}
                className="w-full rounded-md border border-brand-gray-100 px-2.5 py-2 text-sm text-brand-gray-900 focus:border-brand-red focus:outline-none"
              />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-brand-gray-700">
              Alasan <span className="font-normal text-brand-gray-450">(opsional, hanya kamu yang lihat)</span>
            </span>
            <input
              type="text"
              value={timeOffForm.reason}
              onChange={e => setTimeOffForm(f => ({ ...f, reason: e.target.value }))}
              placeholder="Contoh: mudik Lebaran"
              className="w-full rounded-md border border-brand-gray-100 px-2.5 py-2 text-sm text-brand-gray-900 focus:border-brand-red focus:outline-none"
            />
          </label>
          <p className="text-xs leading-relaxed text-brand-gray-450">
            Cuti hanya menutup pemesanan <strong>baru</strong>. Pesanan yang sudah terjadwal di rentang ini
            tetap jadi kewajibanmu - batalkan lewat halaman pesanan bila perlu.
          </p>
        </div>
      </MitraModal>

      <MitraModal
        open={showWarningModal}
        onClose={() => setShowWarningModal(false)}
        title="Konfirmasi Perubahan"
        footer={
          <>
            <Button variant="outline" className="flex-1 rounded-md" onClick={() => setShowWarningModal(false)}>
              Batal
            </Button>
            <Button
              className="flex-1 rounded-md bg-brand-red text-white"
              onClick={() => {
                setShowWarningModal(false);
                handleSave();
              }}
            >
              Simpan
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-brand-gray-700">
          Perubahan jam operasional tidak akan memengaruhi <strong>{activeOrderCount}</strong> pesanan
          aktif/terjadwal yang sudah ada. Tetap simpan?
        </p>
      </MitraModal>
    </div>
  );
}
