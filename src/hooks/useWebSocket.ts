import { useEffect } from 'react';
import { useGlobalChat } from '@/components/providers/chat-provider';

interface UseWebSocketProps {
  roomId?: string;
  onMessage?: (message: any) => void;
  onTyping?: (typingData: any) => void;
  onError?: (error: any) => void;
}

export function useWebSocket({ roomId, onMessage, onTyping, onError }: UseWebSocketProps = {}) {
  const { isConnected, sendTypingIndicator, subscribeToMessages, subscribeToTyping } = useGlobalChat();

  useEffect(() => {
    if (!roomId) return;
    
    let unsubMsg: (() => void) | undefined;
    let unsubTyping: (() => void) | undefined;

    if (onMessage) {
      unsubMsg = subscribeToMessages(roomId, onMessage);
    }
    if (onTyping) {
      unsubTyping = subscribeToTyping(roomId, onTyping);
    }

    return () => {
      if (unsubMsg) unsubMsg();
      if (unsubTyping) unsubTyping();
    };
  }, [roomId, onMessage, onTyping, subscribeToMessages, subscribeToTyping]);

  const sendTyping = (isTyping: boolean) => {
    if (roomId) {
      sendTypingIndicator(roomId, isTyping);
    }
  };

  return { isConnected, sendTypingIndicator: sendTyping };
}
