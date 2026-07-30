import type { FaqItem } from '@/lib/seo';

// FAQ terlihat (server component, pakai <details> native → tanpa JS klien).
// Teks yang sama diemit sebagai JSON-LD FAQPage terpisah oleh pemanggil.
export default function FaqSection({ items, title = 'Pertanyaan Umum' }: { items: FaqItem[]; title?: string }) {
  if (!items.length) return null;
  return (
    <section className="mt-10">
      <h2 className="text-[15px] font-bold text-brand-gray-900 mb-3">{title}</h2>
      <div className="space-y-2">
        {items.map((it) => (
          <details
            key={it.q}
            className="group rounded-xl border border-brand-gray-100 bg-white px-4 py-3 [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="flex cursor-pointer items-center justify-between gap-2 text-[14px] font-semibold text-brand-gray-900">
              {it.q}
              <span className="text-brand-gray-400 transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2 text-[13px] leading-relaxed text-brand-gray-700">{it.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
