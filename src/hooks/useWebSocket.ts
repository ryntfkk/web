import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '@/lib/store/authStore';
import { API_URL } from '@/lib/api';

interface WSMessage {
  type: string;
  data?: any;
}

interface UseWebSocketProps {
  roomId?: string;
  onMessage?: (message: any) => void;
  onTyping?: (typingData: any) => void;
  onError?: (error: any) => void;
}

export function useWebSocket({ roomId, onMessage, onTyping, onError }: UseWebSocketProps = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const isMounted = useRef(true);

  // Store callbacks in ref so effect doesn't re-run when they change
  const callbacksRef = useRef({ onMessage, onTyping, onError });
  useEffect(() => {
    callbacksRef.current = { onMessage, onTyping, onError };
  }, [onMessage, onTyping, onError]);

  const accessToken = useAuthStore((s) => s.accessToken);

  const connect = useCallback(() => {
    if (!accessToken) return;

    let wsUrl = API_URL.replace('http', 'ws') + `/chat/ws?token=${accessToken}`;
    if (roomId) {
      wsUrl += `&room_id=${roomId}`;
    }

    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      setIsConnected(true);
      reconnectAttempts.current = 0;
      // We pass room_id during connection, but can also send join event
      if (roomId && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'auth',
          token: accessToken,
          room_id: roomId
        }));
      }
    };

    socket.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);
        const { onMessage: cbMsg, onTyping: cbTyping, onError: cbErr } = callbacksRef.current;
        switch (msg.type) {
          case 'message':
            if (cbMsg) cbMsg(msg.data);
            break;
          case 'typing':
            if (cbTyping) cbTyping(msg.data);
            break;
          case 'error':
            if (cbErr) cbErr(msg.data);
            break;
        }
      } catch (e) {
        console.error('Failed to parse WS message', e);
      }
    };

    socket.onclose = () => {
      setIsConnected(false);
      if (isMounted.current && reconnectAttempts.current < maxReconnectAttempts) {
        const timeout = Math.pow(2, reconnectAttempts.current) * 1000;
        reconnectTimer.current = setTimeout(() => {
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
  }, [accessToken, roomId]);

  useEffect(() => {
    isMounted.current = true;
    connect();

    return () => {
      isMounted.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
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
        room_id: roomId,
        is_typing: isTyping,
      }));
    }
  }, [roomId]);

  return { isConnected, sendTypingIndicator };
}
