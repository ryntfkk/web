import ChatClient from './ChatClient';

export function generateStaticParams() {
  return [{ order_id: '1' }];
}

export default function ChatRoomPage() {
  return <ChatClient />;
}
