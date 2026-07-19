"use client";
import { useToast } from '@/components/ui/toast';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchAPI } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { getErrorMessage } from '@/types/api';
import { Loader2 } from 'lucide-react';
import { unwrapData } from '@/lib/order-utils';


const DAYS = [
  { id: 'monday', label: 'Senin' },
  { id: 'tuesday', label: 'Selasa' },
  { id: 'wednesday', label: 'Rabu' },
  { id: 'thursday', label: 'Kamis' },
  { id: 'friday', label: 'Jumat' },
  { id: 'saturday', label: 'Sabtu' },
  { id: 'sunday', label: 'Minggu' },
];

export default function MitraSchedulePage() {
  const { isLoading: authLoading, isAuthorized, user, isAuthenticated } = useRequireAuth();
  const router = useRouter();

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

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchSchedule();
  }, [isAuthenticated, user?.active_role]);

  const fetchSchedule = async () => {
    setLoading(true);
    try {
      const [schedRes, ordersRes] = await Promise.all([
        fetchAPI<any>('/partners/me/working-hours'),
        fetchAPI<any>('/orders?role=partner')
      ]);

      if (schedRes.success && schedRes.data) {
        const schedData = unwrapData<any>(schedRes.data);
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

      if (ordersRes.success && ordersRes.data) {
        const ordersData = unwrapData<any>(ordersRes.data);
        if (Array.isArray(ordersData)) {
          const activeCount = ordersData.filter((o: any) => ['WAITING_CONFIRMATION', 'PAID', 'IN_PROGRESS'].includes(o.status)).length;
          setActiveOrderCount(activeCount);
        }
      }
    } finally {
      setLoading(false);
    }
  };

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
    // Backend menyimpan SATU hari per request dengan field
    // { day_of_week, open_time, close_time, is_open } dan format waktu HH:MM:SS.
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const toHms = (t: string) => (t && t.length === 5 ? `${t}:00` : t);
    try {
      const results = await Promise.all(
        days.map((day) => {
          const d = schedule[day];
          return fetchAPI(`/partners/me/working-hours`, {
            method: 'PUT',
            body: JSON.stringify({
              day_of_week: day,
              open_time: toHms(d.start_time),
              close_time: toHms(d.end_time),
              is_open: d.is_active,
            }),
          });
        })
      );
      // Endpoint ini memakai envelope non-standar (tanpa `success`),
      // jadi anggap berhasil bila status HTTP 2xx atau data.updated true.
      const failed = results.filter((r: any) => !(r?.success || r?.data?.updated || (r?.status >= 200 && r?.status < 300)));
      
      // Always fetch schedule to sync with backend even if there are partial failures
      await fetchSchedule();

      if (failed.length === 0) {
        showToast('Jadwal berhasil disimpan!');
      } else {
        const firstFailed = failed[0];
        showToast(getErrorMessage(firstFailed ?? { success: false }) || `Gagal menyimpan ${failed.length} hari`, 'error');
      }
    } catch {
      showToast('Gagal menyimpan jadwal', 'error');
      await fetchSchedule();
    }
    setSaving(false);
  };


  if (authLoading) return <div className="page-h flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!isAuthorized) return null;

  return (
    <div className="page-h bg-[#f7f5f4] pb-24">

      {/* Header */}
      <div className="bg-white border-b border-[#e5e2e1] sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center px-4 py-4 gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-[#f7f5f4] rounded">
            <ArrowLeft className="w-5 h-5 text-[#5b403e]" />
          </button>
          <h1 className="text-base font-bold text-[#1c1b1b]">Atur Jadwal Operasional</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <div className="bg-[#FFF5F5] border border-[#FEB2B2] rounded-lg p-4 flex gap-3 items-start mb-2">
          <Clock className="w-5 h-5 text-[#E53E3E] shrink-0 mt-0.5" />
          <p className="text-sm text-[#E53E3E] font-medium leading-relaxed">
            Tentukan hari dan jam Anda bersedia menerima pesanan. Pelanggan hanya bisa memesan pada jam operasional yang aktif.
          </p>
        </div>

        {!loading && !hasSavedSchedule && (
          <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 flex gap-3 items-start mb-2">
            <Clock className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-800 font-semibold leading-relaxed">
              Jadwal Anda belum tersimpan. Jam di bawah ini hanyalah contoh — pelanggan belum bisa memesan sampai Anda menekan &quot;Simpan Jadwal&quot;.
            </p>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6, 7].map(i => (
              <div key={i} className="bg-white rounded-xl border border-[#e5e2e1] p-4 h-16 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[#e5e2e1] overflow-hidden">
            {DAYS.map((day, index) => {
              const dayData = schedule[day.id];
              return (
                <div key={day.id} className={`p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${index < DAYS.length - 1 ? 'border-b border-[#e5e2e1]' : ''}`}>
                  <label className="flex items-center gap-3 cursor-pointer min-w-[120px]">
                    <input
                      type="checkbox"
                      checked={dayData.is_active}
                      onChange={e => setSchedule({ ...schedule, [day.id]: { ...dayData, is_active: e.target.checked } })}
                      className="w-4 h-4 text-[#b51822] rounded focus:ring-[#b51822]"
                    />
                    <span className="font-semibold text-[#1c1b1b]">{day.label}</span>
                  </label>

                  {dayData.is_active ? (
                    <div className="flex items-center gap-2 pl-7 sm:pl-0">
                      <input
                        type="time"
                        value={dayData.start_time}
                        onChange={e => setSchedule({ ...schedule, [day.id]: { ...dayData, start_time: e.target.value } })}
                        className="p-2 border border-[#e5e2e1] rounded text-sm text-[#1c1b1b] focus:outline-none focus:border-[#b51822]"
                      />
                      <span className="text-[#9e8e8c] font-medium">-</span>
                      <input
                        type="time"
                        value={dayData.end_time}
                        onChange={e => setSchedule({ ...schedule, [day.id]: { ...dayData, end_time: e.target.value } })}
                        className="p-2 border border-[#e5e2e1] rounded text-sm text-[#1c1b1b] focus:outline-none focus:border-[#b51822]"
                      />
                    </div>
                  ) : (
                    <div className="pl-7 sm:pl-0">
                      <span className="text-sm font-semibold text-[#9e8e8c] bg-[#f7f5f4] px-3 py-1.5 rounded">Tutup</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="pt-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4 flex gap-2 items-start">
            <Clock className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-700 font-medium leading-relaxed">
              Catatan: Perubahan jam operasional hanya akan berlaku pada pesanan yang baru masuk. Pesanan yang sudah terjadwal tidak akan terpengaruh.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#e5e2e1] p-4 z-50">
        <div className="max-w-lg mx-auto">
          <Button 
            className="w-full bg-[#b51822] hover:bg-[#8f131b] text-white rounded-xl h-12 text-sm font-bold shadow-sm"
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
            <h3 className="text-lg font-bold text-[#1c1b1b] mb-2">Konfirmasi Perubahan</h3>
            <p className="text-sm text-[#5b403e] mb-6">
              Perubahan jam operasional tidak akan memengaruhi <strong>{activeOrderCount}</strong> pesanan aktif/terjadwal yang sudah ada. Tetap simpan?
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowWarningModal(false)}>Batal</Button>
              <Button className="flex-1 bg-[#b51822] text-white rounded-xl" onClick={() => { setShowWarningModal(false); handleSave(); }}>Simpan</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
