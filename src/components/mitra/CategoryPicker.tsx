'use client';

import { useEffect, useRef, useState } from 'react';
import { fetchAPI } from '@/lib/api';

interface Cat {
  id: string;
  name: string;
  parent_id: string | null;
}

/**
 * Pemilih kategori 2 langkah (Utama → Subkategori) untuk form layanan mitra.
 *
 * `value` = category_id yang tersimpan (bisa kategori utama ATAU subkategori).
 * onChange dipanggil dengan category_id efektif: subkategori bila dipilih, jika
 * tidak maka kategori utama (Opsi B — subkategori opsional / campuran diizinkan).
 *
 * Saat edit, komponen meresolusi `value` awal: bila punya parent_id → itu sub
 * (main = parent, sub = value); bila tidak → itu kategori utama.
 */
export default function CategoryPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (categoryId: string) => void;
}) {
  const [mains, setMains] = useState<Cat[]>([]);
  const [subs, setSubs] = useState<Cat[]>([]);
  const [mainId, setMainId] = useState('');
  const [subId, setSubId] = useState('');
  const [resolved, setResolved] = useState(false);
  const interacted = useRef(false);

  const selectCls =
    'w-full p-3 border border-brand-gray-100 rounded text-sm text-brand-gray-900 focus:outline-none focus:border-brand-red bg-white';

  // Muat kategori utama sekali.
  useEffect(() => {
    (async () => {
      const res = await fetchAPI<Cat[]>('/categories');
      if (res.success && res.data) {
        const data = (res.data as Cat[]);
        if (Array.isArray(data)) setMains(data);
      }
    })();
  }, []);

  // Resolusi nilai awal (mode edit). value tiba async → tunggu sampai non-kosong.
  // interacted: jangan timpa pilihan user (form baru: user pilih dulu, value baru terisi).
  useEffect(() => {
    if (resolved || interacted.current || !value) return;
    (async () => {
      const res = await fetchAPI<Cat>(`/categories/${value}`);
      if (res.success && res.data) {
        const cat = (res.data as Cat);
        if (cat?.parent_id) {
          setMainId(cat.parent_id);
          setSubId(value);
        } else {
          setMainId(value);
          setSubId('');
        }
      }
      setResolved(true);
    })();
  }, [value, resolved]);

  // Muat subkategori setiap kategori utama berubah.
  useEffect(() => {
    if (!mainId) {
      setSubs([]);
      return;
    }
    (async () => {
      const res = await fetchAPI<Cat[]>(`/categories/${mainId}/subcategories`);
      const data = res.success && res.data ? (res.data as Cat[]) : [];
      setSubs(Array.isArray(data) ? data : []);
    })();
  }, [mainId]);

  const handleMain = (id: string) => {
    interacted.current = true;
    setMainId(id);
    setSubId('');
    onChange(id); // category_id = utama sampai subkategori dipilih
  };

  const handleSub = (id: string) => {
    interacted.current = true;
    setSubId(id);
    onChange(id || mainId);
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-semibold text-brand-gray-900 mb-2">Kategori Utama</label>
        <select value={mainId} onChange={(e) => handleMain(e.target.value)} className={selectCls}>
          <option value="">Pilih Kategori</option>
          {mains.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {subs.length > 0 && (
        <div>
          <label className="block text-sm font-semibold text-brand-gray-900 mb-2">
            Subkategori <span className="font-normal text-brand-gray-400">(opsional, lebih spesifik)</span>
          </label>
          <select value={subId} onChange={(e) => handleSub(e.target.value)} className={selectCls}>
            <option value="">— Umum (tanpa subkategori) —</option>
            {subs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
