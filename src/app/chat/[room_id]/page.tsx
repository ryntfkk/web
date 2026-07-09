import ChatClient from './ChatClient';

export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export default async function ChatRoomPage({ params }: { params: Promise<{ room_id: string }> }) {
  const resolvedParams = await params;
  return <ChatClient roomId={resolvedParams.room_id} />;
}
