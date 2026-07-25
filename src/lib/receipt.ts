// U3: cetak/unduh struk pesanan. Struk dirender di window baru yang terisolasi
// dari layout aplikasi (header/bottom-nav ada di root layout → tak boleh ikut
// tercetak), lalu window.print() → pengguna bisa "Simpan sebagai PDF".

export interface ReceiptItem {
  service_name: string;
  price: number;
  quantity: number;
}
export interface ReceiptFee {
  item_name: string;
  total: number;
  status: string;
}
export interface ReceiptOrder {
  order_number: string;
  status: string;
  created_at: string;
  paid_at?: string;
  completed_at?: string;
  total_amount: number;
  total_service_price: number;
  transport_fee: number;
  admin_fee: number;
  promo_discount: number;
  partner?: { name: string };
  items?: ReceiptItem[];
  additional_fees?: ReceiptFee[];
}

const rp = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0);

const tgl = (d?: string) =>
  d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

// Escape agar konten (mis. nama layanan) tak merusak markup struk.
const esc = (s: string) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

const STATUS_LABEL: Record<string, string> = {
  paid: 'Dibayar', confirmed: 'Dikonfirmasi', in_progress: 'Dikerjakan',
  completed: 'Selesai', disputed: 'Sengketa', cancelled: 'Dibatalkan',
};

export function buildReceiptHtml(o: ReceiptOrder): string {
  const items = o.items ?? [];
  const paidFees = (o.additional_fees ?? []).filter((f) => f.status === 'paid');
  const paidFeesTotal = paidFees.reduce((s, f) => s + (f.total || 0), 0);
  const grandTotal = (o.total_amount || 0) + paidFeesTotal;

  const itemRows = items
    .map(
      (it) => `<tr>
        <td>${esc(it.service_name)}${it.quantity > 1 ? ` <span class="muted">×${it.quantity}</span>` : ''}</td>
        <td class="r">${rp(it.price * it.quantity)}</td>
      </tr>`
    )
    .join('');

  const feeRows = paidFees
    .map((f) => `<tr><td>${esc(f.item_name)}</td><td class="r">${rp(f.total)}</td></tr>`)
    .join('');

  const line = (label: string, val: string, cls = '') =>
    `<tr class="${cls}"><td>${esc(label)}</td><td class="r">${val}</td></tr>`;

  return `<!doctype html><html lang="id"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Struk ${esc(o.order_number)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #1c1b1b; margin: 0; padding: 24px; max-width: 420px; }
  h1 { font-size: 20px; margin: 0; color: #b51822; }
  .sub { font-size: 12px; color: #8f6f6d; margin: 2px 0 16px; }
  .box { border: 1px solid #e5e2e1; border-radius: 10px; padding: 16px; }
  .row { display: flex; justify-content: space-between; font-size: 13px; margin: 4px 0; }
  .row .k { color: #8f6f6d; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }
  td { padding: 6px 0; vertical-align: top; }
  .r { text-align: right; white-space: nowrap; }
  .muted { color: #8f6f6d; }
  .divider td { border-top: 1px dashed #e5e2e1; padding-top: 0; height: 8px; }
  .total td { border-top: 2px solid #1c1b1b; padding-top: 10px; font-weight: 700; font-size: 15px; }
  .disc td { color: #38A169; }
  .foot { text-align: center; font-size: 11px; color: #8f6f6d; margin-top: 20px; }
  @media print { body { padding: 0; } .box { border: none; } }
</style></head><body>
  <h1>Posko Jasa</h1>
  <div class="sub">Struk Pesanan</div>
  <div class="box">
    <div class="row"><span class="k">No. Pesanan</span><span>${esc(o.order_number)}</span></div>
    <div class="row"><span class="k">Status</span><span>${esc(STATUS_LABEL[o.status] || o.status)}</span></div>
    <div class="row"><span class="k">Tanggal</span><span>${esc(tgl(o.created_at))}</span></div>
    ${o.paid_at ? `<div class="row"><span class="k">Dibayar</span><span>${esc(tgl(o.paid_at))}</span></div>` : ''}
    ${o.completed_at ? `<div class="row"><span class="k">Selesai</span><span>${esc(tgl(o.completed_at))}</span></div>` : ''}
    ${o.partner?.name ? `<div class="row"><span class="k">Mitra</span><span>${esc(o.partner.name)}</span></div>` : ''}
    <table>
      ${itemRows}
      <tr class="divider"><td colspan="2"></td></tr>
      ${line('Subtotal layanan', rp(o.total_service_price))}
      ${o.transport_fee ? line('Biaya transport', rp(o.transport_fee)) : ''}
      ${o.admin_fee ? line('Biaya admin', rp(o.admin_fee)) : ''}
      ${o.promo_discount ? `<tr class="disc"><td>Diskon promo</td><td class="r">-${rp(o.promo_discount)}</td></tr>` : ''}
      ${feeRows}
      <tr class="total"><td>Total</td><td class="r">${rp(grandTotal)}</td></tr>
    </table>
  </div>
  <div class="foot">Terima kasih telah menggunakan Posko Jasa.<br>Struk ini dibuat otomatis dan sah tanpa tanda tangan.</div>
</body></html>`;
}

export function printOrderReceipt(o: ReceiptOrder): void {
  const w = window.open('', '_blank', 'width=420,height=700');
  if (!w) {
    alert('Popup diblokir. Izinkan popup untuk mencetak struk.');
    return;
  }
  w.document.write(buildReceiptHtml(o));
  w.document.close();
  w.focus();
  // document.write tak selalu memicu onload → cetak setelah jeda singkat.
  setTimeout(() => {
    try { w.print(); } catch { /* pengguna bisa cetak manual */ }
  }, 350);
}
