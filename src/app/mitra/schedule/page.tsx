"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';

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
  const { isAuthenticated, user } = useAuthStore();
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
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    if (user?.active_role !== 'mitra') { router.push('/'); return; }
    fetchSchedule();
  }, [isAuthenticated, user?.active_role]);

  const fetchSchedule = async () => {
    setLoading(true);
    const res = await fetchAPI<any>('/mitra/schedule');
    if (res.success && res.data) {
      // Merge with default if partial
      setSchedule({ ...schedule, ...res.data });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await fetchAPI('/mitra/schedule', {
      method: 'PUT',
      body: JSON.stringify(schedule)
    });
    if (res.success) {
      showToast('Jadwal berhasil disimpan!');
    } else {
      showToast(res.message || 'Gagal menyimpan jadwal', 'error');
    }
    setSaving(false);
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  if (!isAuthenticated || user?.active_role !== 'mitra') return null;

  return (
    <div className="min-h-screen bg-[#f7f5f4] pb-24">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-md text-white text-sm font-medium shadow-lg transition-all ${toast.type === 'success' ? 'bg-[#38A169]' : 'bg-[#E53E3E]'}`}>
          {toast.message}
        </div>
      )}

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
          <Button
            className="w-full bg-[#b51822] hover:bg-[#90121a] rounded h-12 text-base font-bold"
            onClick={handleSave}
            disabled={loading || saving}
          >
            {saving ? 'Menyimpan...' : 'Simpan Jadwal'}
          </Button>
        </div>
      </div>
    </div>
  );
}
