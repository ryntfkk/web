import ReactMarkdown from 'react-markdown';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';

// Render Markdown dokumen legal.
//
// WAJIB tersanitasi: isinya diketik admin lewat panel, dan panel admin hanya
// punya satu tingkat hak akses. Tanpa sanitasi, satu akun admin yang jebol bisa
// menyuntikkan <script> ke halaman yang dilihat semua pengunjung.
//
// Skema dipersempit dari bawaan rehype-sanitize: dokumen legal hanya butuh
// heading, paragraf, daftar, penekanan, dan tautan. Tidak ada gambar, tabel,
// atau HTML mentah.
const schema = {
  ...defaultSchema,
  tagNames: [
    'h2', 'h3', 'h4', 'p', 'ul', 'ol', 'li',
    'strong', 'em', 'a', 'blockquote', 'br', 'hr', 'code',
  ],
  attributes: {
    a: ['href', 'title'],
  },
  // Hanya tautan yang bisa diklik dengan aman; javascript: dan data: ditolak.
  protocols: {
    href: ['http', 'https', 'mailto'],
  },
};

export default function LegalMarkdown({ body }: { body: string }) {
  return (
    <div className="space-y-4 text-sm text-brand-gray-700 leading-relaxed">
      <ReactMarkdown
        rehypePlugins={[[rehypeSanitize, schema]]}
        components={{
          h2: ({ children }) => (
            <h2 className="text-base font-bold text-brand-gray-900 mb-2 mt-6 first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-bold text-brand-gray-900 mb-1.5 mt-4">{children}</h3>
          ),
          p: ({ children }) => <p className="mb-2">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 mb-2">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 mb-2">{children}</ol>,
          strong: ({ children }) => <strong className="font-semibold text-brand-gray-900">{children}</strong>,
          a: ({ href, children }) => (
            <a href={href} className="text-brand-red font-medium hover:underline">
              {children}
            </a>
          ),
          hr: () => <hr className="border-brand-gray-100 my-4" />,
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}
