'use client';

import { useEffect, useRef, useState } from 'react';
import { getBackendOrigin } from '@/lib/api/auth';

type MessageHandler = (data: any) => void;

export function useChatWebSocket(roomName?: string, onMessage?: MessageHandler) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!roomName) {
      setIsConnected(false);
      return;
    }

    const origin = getBackendOrigin() || 'http://localhost:8000';
    const wsUrl = origin.replace('http://', 'ws://').replace('https://', 'wss://') + `/ws/chat/${encodeURIComponent(roomName)}/`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => setIsConnected(true);
      ws.onclose = () => setIsConnected(false);
      ws.onerror = () => setIsConnected(false);
      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          onMessage && onMessage(payload);
        } catch (_) {}
      };
    } catch (_) {
      setIsConnected(false);
    }

    return () => {
      try {
        wsRef.current?.close();
      } catch (_) {}
      wsRef.current = null;
      setIsConnected(false);
    };
  }, [roomName]);

  const send = (data: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  };

  return { isConnected, send };
}


