import { useEffect, useRef, useCallback, useState } from 'react';

declare global {
  interface ImportMeta {
    env: Record<string, string>;
  }
}

// Строим WebSocket URL динамически на основе текущего хоста
function getWebSocketURL() {
  const hostname = window.location.hostname;
  const port = window.location.port;
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  
  console.log('🔗 Current location:', { hostname, port, protocol });
  
  // Используем тот же хост что и фронтенд
  let wsUrl;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Локально - подключаемся к бэкенду напрямую на 3001 через WS (не безопасный)
    wsUrl = `ws://localhost:3001`;
    console.log('🔗 Local detected, using direct backend connection');
  } else if (hostname.includes('ngrok') || hostname.includes('cave.ngrok.app')) {
    // ngrok - подключаемся через безопасный WebSocket (wss) на тот же домен
    // ngrok проксирует вебсокет автоматически
    wsUrl = `wss://${hostname}`;
    console.log('🔗 ngrok detected, using secure WebSocket proxy');
  } else {
    // Удалённый хост - используем протокол из location
    wsUrl = `${protocol}//${hostname}${port ? ':' + port : ''}`;
    console.log('🔗 Remote host detected');
  }
  
  console.log('🔗 Final WebSocket URL:', wsUrl);
  return wsUrl;
}

export function useGameWebSocket(roomId, userId, username) {
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [roomState, setRoomState] = useState(null);
  const [error, setError] = useState(null);
  const reconnectTimeoutRef = useRef(null);
  const shouldReconnectRef = useRef(true);

  useEffect(() => {
    if (!roomId || !userId || !username) {
      console.log('⏳ Waiting for roomId, userId, username...', { roomId, userId, username });
      return;
    }

    const wsUrl = getWebSocketURL();
    console.log('🔗 Connecting to WebSocket:', wsUrl, { roomId, userId, username });
    shouldReconnectRef.current = true;

    const connectWebSocket = () => {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ WebSocket connected, joining room:', roomId);
        setConnected(true);
        setError(null);

        ws.send(JSON.stringify({
          type: 'join_room',
          userId,
          payload: { roomId, username }
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          const { type, payload } = message;
          console.log('📨 WebSocket message received:', { type, payload });
          
          // Обрабатываем все события комнаты
          if (type === 'room_state' || type === 'player_joined' || 
              type === 'character_selected' || type === 'game_started' ||
              type === 'player_left' || type === 'player_disconnected' ||
              type === 'creator_changed') {
            console.log('🔄 Updating roomState with:', type, payload);
            if (type === 'game_started') {
              console.log('🎮 GAME_STARTED payload:', payload);
            }
            setRoomState(payload);
          } 
          // ===== НОВОЕ: Обработка карты от сервера =====
          else if (type === 'card_revealed') {
            console.log('💎 Card revealed from server:', payload);
            // Отправляем событие как part of roomState обновления
            // Компонент App.tsx будет ждать этого события и обновлять UI
            setRoomState(prev => prev ? { 
              ...prev, 
              lastCardRevealed: payload 
            } : { lastCardRevealed: payload });
          }
          // ===== НОВОЕ: Обработка результатов решений =====
          else if (type === 'decisions_processed') {
            console.log('✅ Decisions processed from server:', payload);
            setRoomState(prev => prev ? { 
              ...prev, 
              decisionsResult: payload 
            } : { decisionsResult: payload });
          }
          // ===== НОВОЕ: Обработка обновления решений (текущее состояние) =====
          else if (type === 'decisions_updated') {
            console.log('📝 Decisions updated from server:', payload);
            setRoomState(prev => prev ? { 
              ...prev, 
              currentDecisions: payload.decisions 
            } : { currentDecisions: payload.decisions });
          }
          // ===== НОВОЕ: Обработка обновления раунда =====
          else if (type === 'round_updated') {
            console.log('🔄 Round updated:', payload);
            setRoomState(prev => prev ? { 
              ...prev, 
              roundInfo: payload 
            } : { roundInfo: payload });
          }
          else if (type === 'error') {
            const errorMsg = payload?.message || message?.message || 'An error occurred';
            console.error('❌ WebSocket error:', errorMsg);
            setError(errorMsg);
          } else if (type === 'player_action') {
            // Обрабатываем действия других игроков
            console.log('⚔️ Player action:', payload);
            // Здесь можно обновить состояние игры
          } else if (type === 'chat_message') {
            console.log('💬 Chat message:', payload);
          }
        } catch (err) {
          console.error('❌ Message parse error:', err);
        }
      };

      ws.onerror = (error) => {
        const errorMsg = error instanceof Event ? 'WebSocket error' : String(error);
        console.error('❌ WebSocket error:', errorMsg, error);
        setError(`Connection error: ${errorMsg}`);
        setConnected(false);
      };

      ws.onclose = () => {
        console.log('👋 WebSocket disconnected');
        setConnected(false);
        
        if (shouldReconnectRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('🔄 Attempting to reconnect...');
            connectWebSocket();
          }, 3000);
        }
      };
    };

    connectWebSocket();

    return () => {
      shouldReconnectRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(JSON.stringify({
            type: 'leave_room',
            userId
          }));
        } catch (e) {
          console.warn('Error sending leave_room:', e);
        }
        wsRef.current.close();
      }
    };
  }, [roomId, userId, username]);

  const sendMessage = useCallback((type, payload) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected');
      return false;
    }

    try {
      wsRef.current.send(JSON.stringify({
        type,
        userId,
        payload
      }));
      return true;
    } catch (err) {
      console.error('Send error:', err);
      return false;
    }
  }, [userId]);

  const selectCharacter = useCallback((avatar) => {
    return sendMessage('select_character', { characterId: avatar });
  }, [sendMessage]);

  const startGame = useCallback(() => {
    return sendMessage('start_game', {});
  }, [sendMessage]);

  const sendPlayerAction = useCallback((action, data = {}) => {
    return sendMessage('player_action', { action, data });
  }, [sendMessage]);

  const sendChatMessage = useCallback((text) => {
    return sendMessage('send_message', { text });
  }, [sendMessage]);

  const leaveRoom = useCallback(() => {
    return sendMessage('leave_room', {});
  }, [sendMessage]);

  return {
    roomState,
    connected,
    error,
    selectCharacter,
    startGame,
    sendPlayerAction,
    sendChatMessage,
    leaveRoom
  };
}

export default useGameWebSocket;
