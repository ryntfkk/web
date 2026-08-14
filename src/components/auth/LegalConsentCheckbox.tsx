"use client";

import Link from 'next/link';

// Checkbox persetujuan S&K.
//
// Sengaja checkbox yang HARUS dicentang, bukan kalimat pasif "dengan mendaftar
// Anda dianggap setuju". Persetujuan pasif jauh lebih lemah sebagai bukti, dan
// tidak menghasilkan satu momen jelas yang bisa dicatat waktunya.

interface Props {
  checked: boolean;
  onChange: (v: boolean) => void;
  /** Konteks tambahan di atas checkbox . mis. rincian komisi untuk mitra. */
  children?: React.ReactNode;
  id?: string;
  /**
   * Form PENDAFTARAN MITRA menyetel true: S&K Mitra ikut disetujui di momen
   * daftar (model mitra instan . mitra bisa menerima order sejak detik
   * pertama, kontraknya tidak boleh menyusul lewat modal re-consent).
   * Form pelanggan biasa JANGAN menyalakannya.
   */
  includePartnerTerms?: boolean;
}

export default function LegalConsentCheckbox({ checked, onChange, children, id = 'legal-consent', includePartnerTerms = false }: Props) {
  return (
    <div className="rounded-2xl border border-brand-gray-100 bg-brand-gray-50/50 p-3.5">
      {children}
      <label htmlFor={id} className="flex items-start gap-2.5 cursor-pointer">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-brand-gray-300 text-brand-red focus:ring-brand-red"
        />
        <span className="text-xs leading-relaxed text-brand-gray-700">
          Saya telah membaca dan menyetujui{' '}
          <Link
            href="/terms"
            target="_blank"
            className="font-semibold text-brand-red hover:underline"
          >
            Syarat &amp; Ketentuan
          </Link>{' '}
          {includePartnerTerms ? ', ' : ' dan '}
          <Link
            href="/privacy"
            target="_blank"
            className="font-semibold text-brand-red hover:underline"
          >
            Kebijakan Privasi
          </Link>
          {includePartnerTerms && (
            <>
              , dan{' '}
              <Link
                href="/legal/partner-terms"
                target="_blank"
                className="font-semibold text-brand-red hover:underline"
              >
                S&amp;K Mitra
              </Link>
            </>
          )}
          , termasuk ketentuan penyimpanan data setelah akun dihapus.
        </span>
      </label>
    </div>
  );
}
