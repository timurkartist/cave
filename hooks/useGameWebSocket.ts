import { useCallback, useEffect, useRef, useState } from 'react';
import { getTelegramInitData } from '../utils/telegramUtils';

export function useGameWebSocket(roomId: string, userId: string, username: string) {
  const [roomState, setRoomState] = useState<any>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const hasConnectedRef = useRef(false);

  // Сбросить флаг при смене roomId/userId/username
  useEffect(() => {
    hasConnectedRef.current = false;
  }, [roomId, userId, username]);

  // ===== CONNECT =====
  useEffect(() => {
    if (!roomId || !userId || !username) return;
    if (hasConnectedRef.current) return;

    hasConnectedRef.current = true;

    const getWebSocketURL = () => {
      if (typeof window === 'undefined') return '';
      const { hostname, protocol } = window.location;
      const wsProto = protocol === 'https:' ? 'wss' : 'ws';

      if (hostname.includes('ngrok')) {
        return `wss://${hostname}`;
      }

      // PROD через nginx на 443 - WebSocket должен быть на /ws
      return `${wsProto}://${hostname}/ws`;
    };

    const wsUrl = getWebSocketURL();
    console.log('🔗 Connecting to WebSocket:', wsUrl);

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('✅ WebSocket connected');
      setConnected(true);
      setError(null);

      // Получаем initData для валидации на сервере
      const initData = getTelegramInitData();

      ws.send(JSON.stringify({
        type: 'join_room',
        userId,
        payload: { roomId, username },
        initData  // Отправляем для серверной валидации
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const { type, payload } = message;

        if (type === 'room_state') {
          console.log('🎮 Room state updated:', payload);
          setRoomState(payload);
        } else if (type === 'error') {
          console.error('❌ Server error:', payload?.message);
          setError(payload?.message);
        }
      } catch (err) {
        console.error('❌ Failed to parse message:', err);
      }
    };

    ws.onerror = (err) => {
      console.error('❌ WebSocket error:', err);
      setError('Connection error');
    };

    ws.onclose = () => {
      console.log('❌ WebSocket closed');
      setConnected(false);
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [roomId, userId, username]);

  // ===== SEND MESSAGE =====
  const sendMessage = useCallback((type: string, payload: any) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected');
      return false;
    }

    try {
      wsRef.current.send(JSON.stringify({ type, userId, payload }));
      return true;
    } catch (err) {
      console.error('Send error:', err);
      return false;
    }
  }, [userId]);

  // ===== ACTIONS =====
  const selectCharacter = useCallback((avatar: string) => {
    console.log(`📤 [selectCharacter] Sending to server: ${avatar}`);
    const result = sendMessage('select_character', { characterId: avatar });
    console.log(`📤 [selectCharacter] Result: ${result}`);
    return result;
  }, [sendMessage]);

  const startGame = useCallback(() => {
    return sendMessage('start_game', {});
  }, [sendMessage]);

  const sendPlayerAction = useCallback((action: string, data: any) => {
    return sendMessage('player_action', { action, data });
  }, [sendMessage]);

  return {
    roomState,
    connected,
    error,
    selectCharacter,
    startGame,
    sendPlayerAction
  };
}
