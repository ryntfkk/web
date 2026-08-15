"use client";

import { useMemo, useState, type ReactNode } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';

/** Satu persyaratan pada layanan. Tepat SATU dari code / custom_label terisi. */
export interface ServiceRequirement {
  code?: string;
  custom_label?: string;
  note?: string;
  is_mandatory: boolean;
}

export interface RequirementCatalogItem {
  code: string;
  kind: string;
  label: string;
  hint: string;
  icon: string;
}

interface RequirementsEditorProps {
  items: ServiceRequirement[];
  catalog: RequirementCatalogItem[];
  onChange: (items: ServiceRequirement[]) => void;
  /** Tombol bantuan opsional, dirender di sebelah label. */
  help?: ReactNode;
}

/** Cerminan batas backend. Kalau berbeda, mitra baru tahu ditolak setelah submit. */
const MAX_ITEMS = 10;
const MAX_CUSTOM_LABEL = 120;
const MAX_NOTE = 200;

/**
 * Editor persyaratan yang harus disiapkan PELANGGAN sebelum mitra datang.
 *
 * Katalog baku + teks bebas: katalog menjaga kalimatnya konsisten (pelanggan
 * tidak membaca 40 variasi untuk "butuh listrik"), teks bebas menampung kasus
 * yang belum ada di katalog.
 */
export function RequirementsEditor({ items, catalog, onChange, help }: RequirementsEditorProps) {
  const [picked, setPicked] = useState('');

  const usedCodes = useMemo(
    () => new Set(items.map((i) => i.code).filter(Boolean) as string[]),
    [items],
  );
  const available = useMemo(
    () => catalog.filter((c) => !usedCodes.has(c.code)),
    [catalog, usedCodes],
  );
  const labelFor = (r: ServiceRequirement) =>
    r.code ? (catalog.find((c) => c.code === r.code)?.label ?? r.code) : '';
  const hintFor = (r: ServiceRequirement) =>
    r.code ? (catalog.find((c) => c.code === r.code)?.hint ?? '') : '';

  const isFull = items.length >= MAX_ITEMS;

  const update = (index: number, patch: Partial<ServiceRequirement>) => {
    const next = [...items];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const remove = (index: number) => {
    const next = [...items];
    next.splice(index, 1);
    onChange(next);
  };

  const addFromCatalog = () => {
    if (!picked || isFull) return;
    onChange([...items, { code: picked, note: '', is_mandatory: true }]);
    setPicked('');
  };

  const addCustom = () => {
    if (isFull) return;
    onChange([...items, { custom_label: '', note: '', is_mandatory: true }]);
  };

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center gap-1">
          <label className="block text-sm font-semibold text-brand-gray-900">
            Yang Perlu Disiapkan Pelanggan{' '}
            <span className="text-brand-gray-450 font-normal">(opsional)</span>
          </label>
          {help}
        </div>
        <p className="mt-1 text-xs text-brand-gray-450">
          Pelanggan menyetujui daftar ini sebelum membayar. Isi seperlunya saja.
        </p>
      </div>

      {items.map((r, index) => (
        <div
          key={index}
          className="rounded-lg border border-brand-gray-100 p-3 space-y-2"
        >
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              {r.code ? (
                <>
                  <p className="text-sm font-medium text-brand-gray-900">{labelFor(r)}</p>
                  {hintFor(r) && (
                    <p className="mt-0.5 text-xs text-brand-gray-450">{hintFor(r)}</p>
                  )}
                </>
              ) : (
                <input
                  type="text"
                  value={r.custom_label ?? ''}
                  maxLength={MAX_CUSTOM_LABEL}
                  onChange={(e) => update(index, { custom_label: e.target.value })}
                  placeholder="Contoh: Sediakan tangga minimal 3 meter"
                  className="w-full p-2 border border-brand-gray-100 rounded text-sm text-brand-gray-900 focus:outline-none focus:border-brand-red"
                />
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => remove(index)}
              aria-label="Hapus persyaratan"
              className="shrink-0 text-brand-gray-450 hover:text-brand-red"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <input
            type="text"
            value={r.note ?? ''}
            maxLength={MAX_NOTE}
            onChange={(e) => update(index, { note: e.target.value })}
            placeholder="Catatan tambahan (opsional)"
            className="w-full p-2 border border-brand-gray-100 rounded text-sm text-brand-gray-900 focus:outline-none focus:border-brand-red"
          />

          <div className="flex items-center justify-between">
            <span className="text-xs text-brand-gray-450">
              {r.is_mandatory
                ? 'Wajib - pekerjaan tidak bisa dilakukan tanpa ini'
                : 'Disarankan - sebaiknya ada, tapi tidak menghalangi'}
            </span>
            <Toggle
              checked={r.is_mandatory}
              onChange={(v) => update(index, { is_mandatory: v })}
              aria-label={`Tandai ${labelFor(r) || 'persyaratan'} sebagai wajib`}
            />
          </div>
        </div>
      ))}

      {isFull ? (
        <p className="text-xs text-brand-gray-450">
          Maksimal {MAX_ITEMS} persyaratan per layanan.
        </p>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={picked}
            onChange={(e) => setPicked(e.target.value)}
            aria-label="Pilih persyaratan dari katalog"
            className="flex-1 p-2 border border-brand-gray-100 rounded text-sm text-brand-gray-900 focus:outline-none focus:border-brand-red"
          >
            <option value="">Pilih dari daftar…</option>
            {available.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addFromCatalog}
              disabled={!picked}
            >
              <Plus className="w-4 h-4 mr-1" />
              Tambah
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addCustom}
              className="text-brand-red hover:bg-brand-red/10"
            >
              Tambah persyaratan lain
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
