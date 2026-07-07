import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/lib/store/authStore';

type WSMessage = {
  type: string;
  order_id?: string;
  content?: string;
  message_type?: string;
  is_typing?: boolean;
  data?: any;
};

interface UseWebSocketOptions {
  orderId: string;
  onMessage?: (msg: any) => void;
  onTyping?: (data: { order_id: string; user_id: string; is_typing: boolean }) => void;
  onError?: (err: any) => void;
}

export function useWebSocket({ orderId, onMessage, onTyping, onError }: UseWebSocketOptions) {
  const { accessToken } = useAuthStore();
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (!accessToken || !orderId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.poskojasa.com/api/v1';
    const wsUrlStr = apiUrl.replace(/^https?:/, protocol) + `/ws?token=${accessToken}&order_id=${orderId}`;

    const socket = new WebSocket(wsUrlStr);

    socket.onopen = () => {
      setIsConnected(true);
      reconnectAttempts.current = 0;
    };

    socket.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);
        switch (msg.type) {
          case 'message':
            if (onMessage) onMessage(msg.data);
            break;
          case 'typing':
            if (onTyping) onTyping(msg.data);
            break;
          case 'error':
            if (onError) onError(msg.data);
            break;
        }
      } catch (e) {
        console.error('Failed to parse WS message', e);
      }
    };

    socket.onclose = () => {
      setIsConnected(false);
      if (reconnectAttempts.current < maxReconnectAttempts) {
        const timeout = Math.pow(2, reconnectAttempts.current) * 1000;
        setTimeout(() => {
          reconnectAttempts.current += 1;
          connect();
        }, timeout);
      }
    };

    socket.onerror = (err) => {
      console.error('WebSocket Error', err);
      socket.close();
    };

    ws.current = socket;
  }, [accessToken, orderId, onMessage, onTyping, onError]);

  useEffect(() => {
    connect();
    return () => {
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
    };
  }, [connect]);

  const sendTypingIndicator = useCallback((isTyping: boolean) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'typing',
        order_id: orderId,
        is_typing: isTyping,
      }));
    }
  }, [orderId]);

  return { isConnected, sendTypingIndicator };
}
