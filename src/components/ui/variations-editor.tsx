'use client';

import { Plus, Trash2 } from 'lucide-react';

export interface VariationInput {
  name: string;
  price: string; // digit string mentah (tanpa pemisah ribuan)
}

const inputCls =
  'w-full p-2.5 border border-[#e5e2e1] rounded text-sm text-[#1c1b1b] focus:outline-none focus:border-[#b51822]';

/**
 * Editor variasi produk jasa (satu tingkat: nama + harga).
 * Dipakai di form tambah & edit layanan mitra. Bila ada >=1 variasi, harga
 * produk diambil dari variasi termurah oleh backend.
 */
export function VariationsEditor({
  value,
  onChange,
  minPrice,
}: {
  value: VariationInput[];
  onChange: (v: VariationInput[]) => void;
  minPrice: number;
}) {
  const add = () => onChange([...value, { name: '', price: '' }]);
  const remove = (idx: number) => onChange(value.filter((_, i) => i !== idx));
  const update = (idx: number, field: 'name' | 'price', raw: string) => {
    const val = field === 'price' ? raw.replace(/\D/g, '') : raw;
    onChange(value.map((it, i) => (i === idx ? { ...it, [field]: val } : it)));
  };
  const fmt = (digits: string) =>
    digits ? new Intl.NumberFormat('id-ID').format(parseInt(digits, 10)) : '';

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-semibold text-[#1c1b1b]">
          Variasi <span className="text-[#9e8e8c] font-normal">(opsional)</span>
        </label>
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#b51822] hover:underline"
        >
          <Plus className="w-3.5 h-3.5" /> Tambah Variasi
        </button>
      </div>

      {value.length === 0 ? (
        <p className="text-xs text-[#9e8e8c]">
          Belum ada variasi. Tambahkan bila layanan punya beberapa pilihan (mis. Regular / Express).
          Jika diisi, harga produk diambil dari variasi termurah.
        </p>
      ) : (
        <div className="space-y-2">
          {value.map((v, idx) => (
            <div key={idx} className="flex gap-2 items-start">
              <input
                type="text"
                placeholder="Nama variasi (mis. Regular)"
                value={v.name}
                onChange={(e) => update(idx, 'name', e.target.value)}
                className={`flex-1 min-w-0 ${inputCls}`}
              />
              <div className="relative w-32 shrink-0">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#1c1b1b] text-xs font-bold">Rp</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={fmt(v.price)}
                  onChange={(e) => update(idx, 'price', e.target.value)}
                  className={`pl-8 ${inputCls}`}
                />
              </div>
              <button
                type="button"
                onClick={() => remove(idx)}
                className="p-2.5 text-[#9e8e8c] hover:text-[#E53E3E] shrink-0"
                aria-label="Hapus variasi"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <p className="text-xs text-[#9e8e8c]">
            Harga tiap variasi minimal Rp {new Intl.NumberFormat('id-ID').format(minPrice)}. Harga produk = variasi termurah.
          </p>
        </div>
      )}
    </div>
  );
}
