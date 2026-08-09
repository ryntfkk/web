import SupportChat from '@/components/support/SupportChat';

export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export default async function SupportThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SupportChat reportId={id} backHref="/bantuan" />;
}
