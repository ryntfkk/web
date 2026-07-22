// SE6: structured data schema.org (JSON-LD) untuk rich result Google.
// Server Component — data berasal dari sumber tepercaya (API kita sendiri),
// bukan input pengguna, sehingga dangerouslySetInnerHTML di sini aman.
// JSON.stringify + escape `<` mencegah pemutusan tag <script> bila ada data aneh.
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/</g, '\u003c');
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
