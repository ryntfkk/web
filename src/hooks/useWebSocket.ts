import { useEffect, useRef } from 'react';
import { useGlobalChat } from '@/components/providers/chat-provider';

interface UseWebSocketProps {
  roomId?: string;
  onMessage?: (message: any) => void;
  onTyping?: (typingData: any) => void;
  onError?: (error: any) => void;
}

export function useWebSocket({ roomId, onMessage, onTyping }: UseWebSocketProps = {}) {
  const { isConnected, sendTypingIndicator, subscribeToMessages, subscribeToTyping } = useGlobalChat();

  // Pemanggil melewatkan closure inline yang identitasnya berubah setiap render
  // (setiap pesan → setMessages → render → closure baru). Jika dipakai langsung
  // sebagai dep effect, langganan di-cleanup+resubscribe terus-menerus → pesan
  // bisa lolos di jendela unsub/resub. Simpan di ref agar effect hanya bergantung
  // pada roomId + fungsi subscribe yang stabil.
  const onMessageRef = useRef(onMessage);
  const onTypingRef = useRef(onTyping);
  useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);
  useEffect(() => { onTypingRef.current = onTyping; }, [onTyping]);

  useEffect(() => {
    if (!roomId) return;

    const unsubMsg = subscribeToMessages(roomId, (msg: any) => onMessageRef.current?.(msg));
    const unsubTyping = subscribeToTyping(roomId, (data: any) => onTypingRef.current?.(data));

    return () => {
      unsubMsg();
      unsubTyping();
    };
  }, [roomId, subscribeToMessages, subscribeToTyping]);

  const sendTyping = (isTyping: boolean) => {
    if (roomId) {
      sendTypingIndicator(roomId, isTyping);
    }
  };

  return { isConnected, sendTypingIndicator: sendTyping };
}
