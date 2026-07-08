import ChatClient from './ChatClient';

export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export default async function ChatRoomPage({ params }: { params: Promise<{ order_id: string }> }) {
  const resolvedParams = await params;
  return <ChatClient orderId={resolvedParams.order_id} />;
}
