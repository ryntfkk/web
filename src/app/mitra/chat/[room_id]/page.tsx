import MitraChatClient from './MitraChatClient';

export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export default async function MitraChatRoomPage({ params }: { params: Promise<{ room_id: string }> }) {
  const resolvedParams = await params;
  return <MitraChatClient roomId={resolvedParams.room_id} />;
}
