"use client";

import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import { useAuthStore } from '@/lib/store/authStore';
import { API_URL } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';

interface ChatContextType {
  isConnected: boolean;
  sendTypingIndicator: (roomId: string, isTyping: boolean) => void;
  subscribeToMessages: (roomId: string, callback: (msg: any) => void) => () => void;
  subscribeToTyping: (roomId: string, callback: (msg: any) => void) => () => void;
  subscribeToOrders: (callback: (msg: any) => void) => () => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const isMounted = useRef(true);

  const messageListeners = useRef<Set<{ roomId: string; cb: (msg: any) => void }>>(new Set());
  const typingListeners = useRef<Set<{ roomId: string; cb: (msg: any) => void }>>(new Set());
  // Order events tidak ber-room; satu set listener global cukup.
  const orderListeners = useRef<Set<{ cb: (msg: any) => void }>>(new Set());

  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  const connect = useCallback(() => {
    if (!accessToken) return;

    const wsUrl = API_URL.replace('http', 'ws') + '/ws';
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      setIsConnected(true);
      reconnectAttempts.current = 0;
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'auth',
          token: accessToken,
          room_id: '', // Global connection
        }));
      }
      // Setelah (re)connect, segarkan data yang bergantung pada push WS: event yang
      // terlewat selagi soket putus TIDAK dikirim ulang server, jadi tarik ulang di
      // sini agar UI catch-up (mis. status order berubah saat sinyal hilang).
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['chat-rooms'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'message' && msg.data) {
          // Notify specific room listeners
          messageListeners.current.forEach((listener) => {
            if (!listener.roomId || listener.roomId === msg.data.room_id) {
              listener.cb(msg.data);
            }
          });
          // Invalidate chat rooms list query so it re-fetches latest messages and unread counts!
          queryClient.invalidateQueries({ queryKey: ['chat-rooms'] });
        } else if (msg.type === 'typing' && msg.data) {
          typingListeners.current.forEach((listener) => {
            if (!listener.roomId || listener.roomId === msg.data.room_id) {
              listener.cb(msg.data);
            }
          });
        } else if (msg.type === 'order_status' && msg.data) {
          // Event order realtime (dikirim backend notify.ToUser). Invalidate cache
          // pesanan → React Query refetch → UI menyegar tanpa reload.
          const orderId = msg.data.order_id;
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          if (orderId) queryClient.invalidateQueries({ queryKey: ['order', orderId] });
          queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
          orderListeners.current.forEach((listener) => listener.cb(msg.data));
        }
      } catch (e) {
        console.error('Failed to parse WS message', e);
      }
    };

    socket.onclose = (event) => {
      setIsConnected(false);
      // Tangani 403: Stop reconnecting
      if (event.code === 1008 || event.code === 4003 || event.code === 403) return;

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
  }, [accessToken, queryClient]);

  useEffect(() => {
    isMounted.current = true;
    if (accessToken) {
      connect();
    }

    return () => {
      isMounted.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
    };
  }, [accessToken, connect]);

  const sendTypingIndicator = useCallback((roomId: string, isTyping: boolean) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'typing',
        room_id: roomId,
        is_typing: isTyping,
      }));
    }
  }, []);

  const subscribeToMessages = useCallback((roomId: string, callback: (msg: any) => void) => {
    const listener = { roomId, cb: callback };
    messageListeners.current.add(listener);
    return () => {
      messageListeners.current.delete(listener);
    };
  }, []);

  const subscribeToTyping = useCallback((roomId: string, callback: (msg: any) => void) => {
    const listener = { roomId, cb: callback };
    typingListeners.current.add(listener);
    return () => {
      typingListeners.current.delete(listener);
    };
  }, []);

  // subscribeToOrders: dipanggil halaman pesanan yang butuh reaksi imperatif atas
  // event order (mis. toast / refetch list bermanfaat), selain invalidasi cache
  // yang sudah otomatis di onmessage. Mengembalikan fungsi unsubscribe.
  const subscribeToOrders = useCallback((callback: (msg: any) => void) => {
    const listener = { cb: callback };
    orderListeners.current.add(listener);
    return () => {
      orderListeners.current.delete(listener);
    };
  }, []);

  return (
    <ChatContext.Provider value={{ isConnected, sendTypingIndicator, subscribeToMessages, subscribeToTyping, subscribeToOrders }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useGlobalChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useGlobalChat must be used within a ChatProvider');
  }
  return context;
}
