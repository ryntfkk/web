'use client';

import { useEffect, useState, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { VariationsEditor } from '@/components/ui/variations-editor';
import CategoryPicker from '@/components/mitra/CategoryPicker';
import { DynamicStringList } from '@/components/ui/dynamic-string-list';
import { DynamicFaqList, type Faq } from '@/components/ui/dynamic-faq-list';
import {
  RequirementsEditor,
  type RequirementCatalogItem,
  type ServiceRequirement,
} from '@/components/ui/requirements-editor';
import { fetchAPI } from '@/lib/api';
import { unitLabel } from '@/lib/order-utils';
import { formatPrice } from '@/lib/format';
import { usePlatformConfig } from '@/hooks/usePlatformConfig';

/**
 * Satu form untuk BUAT dan EDIT layanan (P2).
 *
 * Sebelumnya `/mitra/services/new` dan `/mitra/services/[id]/edit` adalah dua
 * berkas ~450 baris yang isinya nyaris identik . termasuk seluruh aturan
 * validasi harga, durasi, dan variasi. Setiap perbaikan harus dikerjakan dua
 * kali, dan yang terjadi berulang kali adalah dikerjakan sekali: form edit
 * sempat tidak menampilkan batas harga minimum yang sudah lama ada di form
 * buat.
 *
 * Yang TIDAK disatukan adalah foto. Alurnya memang beda secara mendasar: saat
 * membuat, foto baru bisa diunggah setelah layanannya punya id; saat mengedit,
 * foto lama sudah ada di server dan dihapus lewat endpointnya sendiri. Itu
 * masuk lewat slot `photoSection`.
 */
export interface ServiceFormValues {
  name: string;
  category_id: string;
  /** Terformat ribuan untuk ditampilkan; dinormalkan saat submit. */
  price: string;
  unit: string;
  duration_minutes: string;
  min_order: string;
  description: string;
  included_items: string[];
  excluded_items: string[];
  faqs: Faq[];
  requirements: ServiceRequirement[];
}

export interface ServiceVariationDraft {
  name: string;
  price: string;
}

/** Bentuk badan request yang diterima backend untuk POST maupun PATCH layanan. */
export interface ServiceSubmitPayload {
  name: string;
  category_id: string;
  price: number;
  unit: string;
  estimated_duration: number;
  min_order: number;
  variations: { name: string; price: number }[];
  description: string;
  included_items: string[];
  excluded_items: string[];
  faqs: { question: string; answer: string }[];
  requirements: {
    code?: string;
    custom_label?: string;
    note: string;
    is_mandatory: boolean;
  }[];
}

export const EMPTY_SERVICE_FORM: ServiceFormValues = {
  name: '',
  category_id: '',
  price: '',
  unit: 'per_service',
  duration_minutes: '60',
  min_order: '1',
  description: '',
  included_items: [],
  excluded_items: [],
  faqs: [],
  requirements: [],
};

interface ServiceFormProps {
  initialValues?: ServiceFormValues;
  /**
   * Kategori UTAMA milik layanan yang sedang diedit (`category_main_id` dari
   * server). Diteruskan ke CategoryPicker supaya ia tak perlu meresolusinya
   * sendiri lewat endpoint publik . yang kini 404 untuk kategori nonaktif.
   */
  initialMainCategoryId?: string;
  initialVariations?: ServiceVariationDraft[];
  submitLabel: string;
  submitting?: boolean;
  /** Teks pengganti saat menyimpan bertahap, mis. "Mengunggah foto 2/3…". */
  progressLabel?: string;
  /** Error dari pemanggil (kegagalan server). Error validasi ditangani di sini. */
  error?: string;
  onSubmit: (payload: ServiceSubmitPayload) => void;
  /** Blok foto; dirender setelah durasi. */
  photoSection?: ReactNode;
}

const INPUT_CLASS =
  'w-full p-3 border border-brand-gray-100 rounded-md text-sm text-brand-gray-900 focus:outline-none focus:border-brand-red';

export default function ServiceForm({
  initialValues,
  initialMainCategoryId,
  initialVariations,
  submitLabel,
  submitting = false,
  progressLabel,
  error: externalError,
  onSubmit,
  photoSection,
}: ServiceFormProps) {
  // MinTransaction dari platform_settings . bukan konstanta 50000 yang harus
  // disamakan manual dengan backend setiap kali admin mengubahnya.
  const MIN_PRICE = usePlatformConfig().min_transaction;

  const [form, setForm] = useState<ServiceFormValues>(initialValues ?? EMPTY_SERVICE_FORM);
  const [variations, setVariations] = useState<ServiceVariationDraft[]>(initialVariations ?? []);
  const [validationError, setValidationError] = useState('');
  // Katalog persyaratan datang dari backend, bukan dihardcode . admin bisa
  // menambah/menonaktifkan item tanpa deploy web.
  const [reqCatalog, setReqCatalog] = useState<RequirementCatalogItem[]>([]);

  /* eslint-disable react-hooks/set-state-in-effect */
  // Halaman edit memuat datanya secara asinkron, jadi nilai awal baru tiba
  // setelah render pertama. Tanpa sinkronisasi ini form edit selalu kosong.
  useEffect(() => {
    if (initialValues) setForm(initialValues);
  }, [initialValues]);

  useEffect(() => {
    if (initialVariations) setVariations(initialVariations);
  }, [initialVariations]);

  useEffect(() => {
    // Pelengkap: gagal memuat katalog TIDAK boleh menghalangi mitra menyimpan .
    // ia masih bisa menulis persyaratan sebagai teks bebas.
    let alive = true;
    fetchAPI<RequirementCatalogItem[]>('/partners/requirement-catalog')
      .then((res) => {
        if (alive && res.success && res.data) setReqCatalog(res.data);
      })
      .catch(() => { });
    return () => {
      alive = false;
    };
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    setForm((f) => ({
      ...f,
      price: val ? new Intl.NumberFormat('id-ID').format(parseInt(val, 10)) : '',
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const numPrice = parseInt(form.price.replace(/\D/g, ''), 10) || 0;
    const isPerHour = form.unit === 'per_hour';
    // per_hour: estimasi otomatis 1 jam (60 menit); selain itu dari input mitra.
    const numDuration = isPerHour ? 60 : parseInt(form.duration_minutes, 10);
    const numMinOrder = Math.max(1, parseInt(form.min_order || '1', 10) || 1);
    const included = form.included_items.map((i) => i.trim()).filter(Boolean);
    const excluded = form.excluded_items.map((i) => i.trim()).filter(Boolean);
    const faqs = form.faqs
      .map((f) => ({ question: f.question.trim(), answer: f.answer.trim() }))
      .filter((f) => f.question && f.answer);
    // Buang baris teks-bebas yang dibiarkan kosong; backend menolak item tanpa
    // code maupun custom_label.
    const requirements = form.requirements
      .map((r) => ({
        code: r.code,
        custom_label: r.custom_label?.trim() || undefined,
        note: r.note?.trim() || '',
        is_mandatory: r.is_mandatory,
      }))
      .filter((r) => r.code || r.custom_label);

    // Variasi: buang baris kosong; bila ada, harga produk = variasi termurah.
    const parsedVariations = variations
      .map((v) => ({ name: v.name.trim(), price: parseInt(v.price || '0', 10) || 0 }))
      .filter((v) => v.name || v.price);
    const hasVariations = parsedVariations.length > 0;

    if (!form.name || !form.category_id || !numDuration || included.length === 0 || excluded.length === 0) {
      setValidationError('Semua field wajib diisi, termasuk minimal 1 include dan 1 exclude');
      return;
    }
    if (hasVariations) {
      for (const v of parsedVariations) {
        if (!v.name || !v.price) {
          setValidationError('Setiap variasi wajib punya nama dan harga.');
          return;
        }
        if (v.price < MIN_PRICE) {
          setValidationError(`Harga setiap variasi minimal ${formatPrice(MIN_PRICE)}`);
          return;
        }
      }
    } else {
      if (!numPrice) {
        setValidationError('Harga wajib diisi (atau tambahkan variasi).');
        return;
      }
      if (numPrice < MIN_PRICE) {
        setValidationError(`Harga minimum layanan adalah ${formatPrice(MIN_PRICE)}`);
        return;
      }
    }
    if (!isPerHour && numDuration < 15) {
      setValidationError('Durasi minimum layanan adalah 15 menit');
      return;
    }

    setValidationError('');
    onSubmit({
      name: form.name,
      category_id: form.category_id,
      price: hasVariations ? Math.min(...parsedVariations.map((v) => v.price)) : numPrice,
      unit: form.unit,
      estimated_duration: numDuration,
      min_order: numMinOrder,
      variations: hasVariations ? parsedVariations : [],
      description: form.description,
      included_items: included,
      excluded_items: excluded,
      faqs,
      requirements,
    });
  };

  const shownError = validationError || externalError;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-brand-gray-100 bg-white p-6">
      <div>
        <label htmlFor="service-name" className="mb-2 block text-sm font-semibold text-brand-gray-900">
          Nama Layanan
        </label>
        <input
          id="service-name"
          type="text"
          placeholder="Contoh: Cuci AC 0.5 - 1 PK"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className={INPUT_CLASS}
        />
      </div>

      <CategoryPicker
        value={form.category_id}
        mainCategoryId={initialMainCategoryId}
        onChange={(id) => setForm((f) => ({ ...f, category_id: id }))}
      />

      <div>
        <label htmlFor="service-unit" className="mb-2 block text-sm font-semibold text-brand-gray-900">
          Satuan Harga
        </label>
        <select
          id="service-unit"
          value={form.unit}
          onChange={(e) => {
            const unit = e.target.value;
            // per_hour: estimasi otomatis dikunci ke 60 menit (1 jam).
            setForm((f) => ({
              ...f,
              unit,
              duration_minutes: unit === 'per_hour' ? '60' : f.duration_minutes,
            }));
          }}
          className={`${INPUT_CLASS} bg-white`}
        >
          <option value="per_service">Per Jasa (borongan)</option>
          <option value="per_hour">Per Jam</option>
          <option value="per_unit">Per Unit</option>
          <option value="per_kg">Per Kg</option>
        </select>
        <p className="mt-1 text-xs text-brand-gray-450">
          Harga ditagih per {unitLabel(form.unit)}. Pelanggan memilih jumlah saat memesan.
        </p>
      </div>

      {/* Variasi (opsional) . bila diisi, harga tunggal disembunyikan. */}
      <VariationsEditor value={variations} onChange={setVariations} minPrice={MIN_PRICE} />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="service-price" className="mb-2 block text-sm font-semibold text-brand-gray-900">
            Harga
          </label>
          {variations.length === 0 ? (
            <>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-brand-gray-900">
                  Rp
                </span>
                <input
                  id="service-price"
                  type="text"
                  inputMode="numeric"
                  value={form.price}
                  onChange={handlePriceChange}
                  placeholder="0"
                  className={`${INPUT_CLASS} pl-10 font-bold`}
                />
              </div>
              <p className="mt-1 text-xs text-brand-gray-450">Minimal {formatPrice(MIN_PRICE)}</p>
            </>
          ) : (
            <div className="w-full rounded-md border border-dashed border-brand-gray-100 bg-brand-gray-60 p-3 text-sm text-brand-gray-450">
              Otomatis dari variasi termurah
            </div>
          )}
        </div>
        <div>
          <label htmlFor="service-min-order" className="mb-2 block text-sm font-semibold text-brand-gray-900">
            Minimal Order
          </label>
          <input
            id="service-min-order"
            type="number"
            min="1"
            step="1"
            value={form.min_order}
            onChange={(e) => setForm({ ...form, min_order: e.target.value })}
            className={INPUT_CLASS}
          />
          <p className="mt-1 text-xs text-brand-gray-450">
            Jumlah minimal per pesanan ({unitLabel(form.unit)})
          </p>
        </div>
      </div>

      <div>
        <label htmlFor="service-duration" className="mb-2 block text-sm font-semibold text-brand-gray-900">
          Estimasi Durasi (Menit)
        </label>
        <input
          id="service-duration"
          type="number"
          min="15"
          step="15"
          value={form.unit === 'per_hour' ? 60 : form.duration_minutes}
          disabled={form.unit === 'per_hour'}
          onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
          className={`${INPUT_CLASS} disabled:bg-brand-gray-60 disabled:text-brand-gray-450`}
        />
        <p className="mt-1 text-xs text-brand-gray-450">
          {form.unit === 'per_hour' ? 'Otomatis 1 jam / satuan' : 'Minimal 15 menit'}
        </p>
      </div>

      {photoSection}

      <DynamicStringList
        label="Termasuk (Include)"
        items={form.included_items}
        onChange={(items) => setForm({ ...form, included_items: items })}
        placeholder="Contoh: Pengecekan AC"
        required
      />

      <DynamicStringList
        label="Tidak Termasuk (Exclude)"
        items={form.excluded_items}
        onChange={(items) => setForm({ ...form, excluded_items: items })}
        placeholder="Contoh: Penambahan Freon"
        required
      />

      <RequirementsEditor
        items={form.requirements}
        catalog={reqCatalog}
        onChange={(items) => setForm({ ...form, requirements: items })}
      />

      <DynamicFaqList
        label="Pertanyaan Umum (FAQ) (opsional)"
        items={form.faqs}
        onChange={(items) => setForm({ ...form, faqs: items })}
      />

      <div>
        <label htmlFor="service-description" className="mb-2 block text-sm font-semibold text-brand-gray-900">
          Deskripsi <span className="font-normal text-brand-gray-450">(opsional)</span>
        </label>
        <textarea
          id="service-description"
          placeholder="Deskripsi detail tentang layanan ini..."
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={3}
          className={`${INPUT_CLASS} resize-none`}
        />
      </div>

      {shownError && (
        <div
          role="alert"
          className="rounded-md border border-brand-error-border bg-brand-error-soft p-3 text-sm text-brand-error"
        >
          {shownError}
        </div>
      )}

      <div className="border-t border-brand-gray-100 pt-4">
        <Button
          type="submit"
          className="h-12 w-full rounded-md bg-brand-red text-base font-bold hover:bg-brand-red-dark"
          disabled={submitting}
        >
          {submitting ? progressLabel || 'Menyimpan...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
