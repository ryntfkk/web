"use client";

import { useMemo, useState } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { useFaqs } from '@/hooks/useFaqs';
import { usePlatformConfig } from '@/hooks/usePlatformConfig';
import { renderFaqAnswer } from '@/lib/faq-tokens';

// Daftar FAQ + pencarian. Dipakai halaman bantuan pelanggan dan mitra; yang
// membedakan hanya `audience`.
//
// Pencarian dijalankan pada jawaban yang SUDAH diinterpolasi, supaya mencari
// "12%" tetap menemukan FAQ yang isinya {{platform_fee_rate}}.
export default function FaqAccordion({
  audience,
  placeholder = 'Cari pertanyaan…',
}: {
  audience: 'CUSTOMER' | 'PARTNER';
  placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const config = usePlatformConfig();
  const { data: groups, isLoading } = useFaqs(audience);

  const rendered = useMemo(
    () =>
      (groups ?? []).map((g) => ({
        ...g,
        items: g.items.map((it) => ({ ...it, answer: renderFaqAnswer(it.answer, config) })),
      })),
    [groups, config],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rendered;
    return rendered
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (it) => it.question.toLowerCase().includes(q) || it.answer.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [query, rendered]);

  return (
    <>
      <div className="relative">
        <Search className="w-5 h-5 text-brand-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-3 py-3 rounded-md text-sm text-brand-gray-900 bg-white border border-brand-gray-100 focus:outline-none focus:border-brand-red"
        />
      </div>

      <div className="space-y-6 mt-6">
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 rounded-lg bg-white border border-brand-gray-100 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title={query ? 'Tidak Ada Hasil' : 'Belum Ada Pertanyaan'}
            description={
              query
                ? `Tidak ada pertanyaan yang cocok dengan "${query}". Coba kata kunci lain atau hubungi kami.`
                : 'Daftar pertanyaan sedang disiapkan.'
            }
          />
        ) : (
          filtered.map((group) => (
            <section key={group.category}>
              <h2 className="text-sm font-semibold text-brand-gray-400 uppercase tracking-wide mb-2 px-1">
                {group.category}
              </h2>
              <div className="bg-white rounded-lg border border-brand-gray-100 divide-y divide-brand-gray-100 overflow-hidden">
                {group.items.map((it) => {
                  const isOpen = open === it.id;
                  return (
                    <div key={it.id}>
                      <button
                        onClick={() => setOpen(isOpen ? null : it.id)}
                        className="w-full flex items-center justify-between gap-3 text-left px-4 py-3.5 hover:bg-brand-gray-60 transition-colors"
                        aria-expanded={isOpen}
                      >
                        <span className="text-sm font-medium text-brand-gray-900">{it.question}</span>
                        <ChevronDown
                          className={`w-4 h-4 text-brand-gray-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        />
                      </button>
                      {isOpen && (
                        <p className="px-4 pb-4 -mt-1 text-sm text-brand-gray-700 leading-relaxed whitespace-pre-line">
                          {it.answer}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </>
  );
}
