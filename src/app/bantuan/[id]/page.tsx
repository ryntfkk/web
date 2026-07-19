import SupportChatClient from './SupportChatClient';

export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export default async function SupportThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SupportChatClient reportId={id} />;
}
