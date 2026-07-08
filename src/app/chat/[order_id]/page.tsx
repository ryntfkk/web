import ChatClient from './ChatClient';

export function generateStaticParams() {
  return [{ order_id: '1' }];
}

export default async function ChatRoomPage({ params }: { params: Promise<{ order_id: string }> }) {
  const resolvedParams = await params;
  return <ChatClient orderId={resolvedParams.order_id} />;
}
