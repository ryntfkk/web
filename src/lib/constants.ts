export const ROLE_PARTNER = 'partner';

// Nomor WhatsApp CS Posko Jasa (set NEXT_PUBLIC_CS_WHATSAPP di env produksi)
export const CS_WHATSAPP = process.env.NEXT_PUBLIC_CS_WHATSAPP || '6281234567890';

export const csWhatsAppUrl = (text: string) =>
  `https://wa.me/${CS_WHATSAPP}?text=${encodeURIComponent(text)}`;
