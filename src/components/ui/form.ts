/**
 * Kulit form bersama (A14).
 *
 * Dulu konstanta ini di-hoist lokal di `/jadi-mitra/daftar`, sementara halaman
 * auth menulis kelas input panjangnya sendiri-sendiri . empat form login/
 * register/forgot-password/daftar punya empat kulit input berbeda. Satu sumber
 * di sini; komposisi tambahan (mis. `pr-12` untuk tombol lihat-password) tetap
 * ditulis di pemakainya: `` className={`${INPUT_CLASS} pr-12`} ``.
 */
export const INPUT_CLASS =
  'w-full rounded-md border border-brand-gray-100 bg-white px-3 py-2.5 sm:p-3 text-sm text-brand-gray-900 placeholder:text-brand-gray-450 focus:outline-none focus:border-brand-red';

export const LABEL_CLASS = 'mb-2 block text-sm font-semibold text-brand-gray-900';

export const SECTION_CLASS =
  'space-y-3 sm:space-y-4 rounded-2xl border border-brand-gray-100 bg-white p-4 sm:p-5 lg:p-6';
