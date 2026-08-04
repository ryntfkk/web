"use client";
import { useToast } from '@/components/ui/toast';

import { useCallback, useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import MobilePageHeader from '@/components/layout/MobilePageHeader';
import { Button } from '@/components/ui/button';
import { fetchAPI } from '@/lib/api';
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

/** Baris jam kerja sebagaimana dikirim backend (kolom TIME bisa RFC3339). */
interface WorkingHourRow {
  day_of_week: string;
  open_time: string;
  close_time: string;
  is_open: boolean;
}

export default function MitraSchedulePage() {
  const { isLoading: authLoading, isAuthorized, user, isAuthenticated } = useRequireAuth();

  const [schedule, setSchedule] = useState<Record<string, { is_active: boolean; start_time: string; end_time: string }>>({
    monday: { is_active: true, start_time: '08:00', end_time: '17:00' },
    tuesday: { is_active: true, start_time: '08:00', end_time: '17:00' },
    wednesday: { is_active: true, start_time: '08:00', end_time: '17:00' },
    thursday: { is_active: true, start_time: '08:00', end_time: '17:00' },
    friday: { is_active: true, start_time: '08:00', end_time: '17:00' },
    saturday: { is_active: false, start_time: '08:00', end_time: '15:00' },
    sunday: { is_active: false, start_time: '08:00', end_time: '12:00' },
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();
  const [activeOrderCount, setActiveOrderCount] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(false);
  // Jadwal di DB. Selama belum tersimpan, nilai di layar hanyalah default UI
  // dan pelanggan TIDAK bisa memesan — tampilkan peringatan.
  const [hasSavedSchedule, setHasSavedSchedule] = useState(true);


  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    try {
      const [schedRes, summaryRes] = await Promise.all([
        fetchAPI<WorkingHourRow[]>('/partners/me/working-hours'),
        // Ringkasan, BUKAN daftar pesanan (P1-02). Dulu mengunduh /orders yang
        // default 10 baris lalu menghitung sendiri, jadi peringatan "ada N
        // pesanan aktif" bisa salah tanpa ada yang menyadarinya.
        fetchAPI<{ active: number }>('/orders/summary'),
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
              next[day] = {
                is_active: Boolean(row.is_open),
                start_time: hhmm(row.open_time) || next[day].start_time,
                end_time: hhmm(row.close_time) || next[day].end_time,
              };
            }
          }
          setSchedule(next);
        }
      }

      if (summaryRes.success && summaryRes.data) {
        setActiveOrderCount((summaryRes.data as { active: number })?.active ?? 0);
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
    if (activeOrderCount > 0) {
      setShowWarningModal(true);
    } else {
      handleSave();
    }
  };

  const handleSave = async () => {
    setSaving(true);
    // SATU request untuk seluruh minggu (P1-03). Dulu tujuh PUT paralel: bila
    // sebagian gagal, mitra tertinggal dengan jadwal campuran — sebagian hari
    // baru, sebagian lama — tanpa cara tahu yang mana. Sekarang backend
    // menyimpannya dalam satu transaksi: semua tersimpan, atau tidak sama sekali.
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const toHms = (t: string) => (t && t.length === 5 ? `${t}:00` : t);
    try {
      const res = await fetchAPI<{ updated: boolean; affected_orders_count: number }>(
        '/partners/me/working-hours/batch',
        {
          method: 'PUT',
          body: JSON.stringify({
            hours: days.map((day) => ({
              day_of_week: day,
              open_time: toHms(schedule[day].start_time),
              close_time: toHms(schedule[day].end_time),
              is_open: schedule[day].is_active,
            })),
          }),
        },
      );

      // Selalu sinkronkan dari server: yang tampil harus keadaan tersimpan,
      // bukan yang diketik.
      await fetchSchedule();

      if (res.success) {
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


  if (authLoading) return <PageSkeleton />;
  if (!isAuthorized) return null;

  return (
    <div className="page-h bg-brand-gray-60 pb-24">

      {/* Header */}
      <MobilePageHeader alwaysShow title="Atur Jadwal Operasional" />

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
              Jadwal Anda belum tersimpan. Jam di bawah ini hanyalah contoh — pelanggan belum bisa memesan sampai Anda menekan &quot;Simpan Jadwal&quot;.
            </p>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6, 7].map(i => (
              <div key={i} className="bg-white rounded-xl border border-brand-gray-100 p-4 h-16 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-brand-gray-100 overflow-hidden">
            {DAYS.map((day, index) => {
              const dayData = schedule[day.id];
              return (
                <div key={day.id} className={`p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${index < DAYS.length - 1 ? 'border-b border-brand-gray-100' : ''}`}>
                  <label className="flex items-center gap-3 cursor-pointer min-w-[120px]">
                    <input
                      type="checkbox"
                      checked={dayData.is_active}
                      onChange={e => setSchedule({ ...schedule, [day.id]: { ...dayData, is_active: e.target.checked } })}
                      className="w-4 h-4 text-brand-red rounded focus:ring-brand-red"
                    />
                    <span className="font-semibold text-brand-gray-900">{day.label}</span>
                  </label>

                  {dayData.is_active ? (
                    <div className="flex items-center gap-2 pl-7 sm:pl-0">
                      <input
                        type="time"
                        value={dayData.start_time}
                        onChange={e => setSchedule({ ...schedule, [day.id]: { ...dayData, start_time: e.target.value } })}
                        className="p-2 border border-brand-gray-100 rounded text-sm text-brand-gray-900 focus:outline-none focus:border-brand-red"
                      />
                      <span className="text-brand-gray-450 font-medium">-</span>
                      <input
                        type="time"
                        value={dayData.end_time}
                        onChange={e => setSchedule({ ...schedule, [day.id]: { ...dayData, end_time: e.target.value } })}
                        className="p-2 border border-brand-gray-100 rounded text-sm text-brand-gray-900 focus:outline-none focus:border-brand-red"
                      />
                    </div>
                  ) : (
                    <div className="pl-7 sm:pl-0">
                      <span className="text-sm font-semibold text-brand-gray-450 bg-brand-gray-60 px-3 py-1.5 rounded">Tutup</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="pt-6">
          <div className="bg-brand-warning-soft border border-brand-warning-border rounded p-3 mb-4 flex gap-2 items-start">
            <Clock className="w-4 h-4 text-brand-warning-dark shrink-0 mt-0.5" />
            <p className="text-xs text-brand-warning-dark font-medium leading-relaxed">
              Catatan: Perubahan jam operasional hanya akan berlaku pada pesanan yang baru masuk. Pesanan yang sudah terjadwal tidak akan terpengaruh.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-brand-gray-100 p-4 z-50">
        <div className="max-w-2xl mx-auto">
          <Button 
            className="w-full bg-brand-red hover:bg-brand-red-dark text-white rounded-xl h-12 text-sm font-bold shadow-sm"
            onClick={confirmSave}
            disabled={loading || saving}
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Simpan Jadwal'}
          </Button>
        </div>
      </div>

      {/* Warning Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-brand-gray-900 mb-2">Konfirmasi Perubahan</h3>
            <p className="text-sm text-brand-gray-700 mb-6">
              Perubahan jam operasional tidak akan memengaruhi <strong>{activeOrderCount}</strong> pesanan aktif/terjadwal yang sudah ada. Tetap simpan?
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowWarningModal(false)}>Batal</Button>
              <Button className="flex-1 bg-brand-red text-white rounded-xl" onClick={() => { setShowWarningModal(false); handleSave(); }}>Simpan</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
