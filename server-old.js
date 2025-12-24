import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import dotenv from 'dotenv';
import http from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// ========== GAME LOGIC IMPORTS ==========
// Импортируем игровые константы (CardType, HazardType, INITIAL_DECK)
import { CardType, HazardType } from './types.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

// Middleware
app.use(express.json());

// Обработка ngrok валидации
app.use((req, res, next) => {
  // Если запрос с ngrok domain, добавляем заголовок для валидации
  if (req.hostname && req.hostname.includes('ngrok-free.dev')) {
    res.setHeader('ngrok-skip-browser-warning', 'true');
  }
  next();
});

app.use(cors({
  origin: '*', // Разрешаем все источники для разработки/ngrok
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning']
}));

// Подаём статические файлы фронтенда из dist
app.use(express.static(path.join(__dirname, 'dist')));

// Ngrok browser warning bypass - отвечаем 200 на запросы от ngrok-browser
app.get('/api/ngrok', (req, res) => {
  res.json({ status: 'ok', message: 'ngrok tunnel is active' });
});

// SPA fallback - все остальные маршруты идут на index.html
app.get('*', (req, res, next) => {
  // Пропускаем API маршруты
  if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
    return next();
  }
  
  console.log(`[SPA] GET ${req.path}?${new URLSearchParams(req.query).toString()}`);
  
  // Если есть query параметры, перенаправляем на URL с hash
  if (Object.keys(req.query).length > 0) {
    const queryString = new URLSearchParams(req.query).toString();
    const hashUrl = `/#${queryString}`;
    console.log(`[SPA] Redirecting to ${hashUrl}`);
    return res.redirect(hashUrl);
  }
  
  // Иначе подаём index.html
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  console.log(`[SPA] Serving ${indexPath}`);
  res.sendFile(indexPath);
});

// ==================== WEBSOCKET SETUP ====================
const wsRooms = new Map();
const wsClients = new Map();

// In-memory session storage (для продакшена нужна БД)
const sessions = new Map();
const games = new Map();

// ==================== GAME LOGIC HELPERS ====================

// Инициализирует колоду для комнаты
function initializeDeckForRoom() {
  // Создаём новую колоду с сокровищами и опасностями
  const treasures = [1, 2, 3, 4, 5, 5, 7, 7, 9, 11, 11, 13, 14, 15, 17].map((v, i) => ({
    id: `treasure-${i}`,
    type: CardType.TREASURE,
    value: v,
    remainder: 0
  }));
  
  const hazards = [];
  Object.values(HazardType).forEach((ht, i) => {
    for (let j = 1; j <= 3; j++) {
      hazards.push({
        id: `hazard-${ht}-${j}`,
        type: CardType.HAZARD,
        hazardType: ht
      });
    }
  });
  
  const deck = [...treasures, ...hazards];
  // Перемешиваем детерминированно (для одной комнаты - всегда один порядок)
  return deck.sort(() => Math.random() - 0.5);
}

// ===== НОВОЕ: Mapping для chatId -> roomId (для Telegram) =====
const telegramGameSessions = new Map(); // { chatId: { roomId, creatorId, creatorName, createdAt } }

// Обрабатывает действие копания (dig)
function processDigAction(room, userId, x, y) {
  if (room.deck.length === 0) {
    return { error: 'No cards left in deck' };
  }
  
  const card = room.deck.shift();
  card.x = x;
  card.y = y;
  
  // Проверяем на опасность
  let hazardMatch = false;
  if (card.type === CardType.HAZARD) {
    if (room.activeHazards && room.activeHazards.includes(card.hazardType)) {
      hazardMatch = true;
      // Раунд провален - все игроки теряют текущие очки
      room.roundFailed = true;
      console.log(`[${room.roomId}] Hazard match! Round failed.`);
    }
    if (!room.activeHazards) room.activeHazards = [];
    room.activeHazards.push(card.hazardType);
  }
  
  room.revealedCards.push(card);
  
  return {
    card,
    hazardMatch,
    roundFailed: room.roundFailed,
    cardsRemaining: room.deck.length,
    activeHazards: room.activeHazards
  };
}

// ==================== AUTH & TELEGRAM ROUTES ====================

// ===== НОВОЕ: Регистрация игры из Telegram бота =====
app.post('/api/telegram/register-game', (req, res) => {
  try {
    const { roomId, chatId, creatorId, creatorName } = req.body;

    if (!roomId || !chatId) {
      return res.status(400).json({ error: 'Missing roomId or chatId' });
    }

    // Сохраняем mapping chatId -> roomId
    telegramGameSessions.set(chatId.toString(), {
      roomId,
      creatorId,
      creatorName,
      createdAt: Date.now()
    });

    console.log(`📱 Game registered for Telegram chat ${chatId}: ${roomId}`);

    res.json({
      success: true,
      roomId,
      message: 'Game session registered'
    });
  } catch (error) {
    console.error('Telegram game registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== Получить информацию о игре по chatId =====
app.get('/api/telegram/game/:chatId', (req, res) => {
  try {
    const { chatId } = req.params;
    const gameSession = telegramGameSessions.get(chatId.toString());

    if (!gameSession) {
      return res.status(404).json({ error: 'Game not found for this chat' });
    }

    res.json({ gameSession });
  } catch (error) {
    console.error('Get game error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Валидация Telegram WebApp initData
function validateInitData(initData, botToken) {
  if (!initData) return false;

  const data_check_string = initData
    .split('&')
    .filter(str => !str.startsWith('hash='))
    .sort()
    .map(str => str.replace('=', '\u001d'))
    .join('\n');

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();

  const hash = initData
    .split('&')
    .find(str => str.startsWith('hash='))
    ?.split('=')[1];

  const computed_hash = crypto
    .createHmac('sha256', secretKey)
    .update(data_check_string)
    .digest('hex');

  return hash === computed_hash;
}

app.post('/api/auth/validate', (req, res) => {
  try {
    const { initData, userId } = req.body;

    if (!initData || !userId) {
      return res.status(400).json({ error: 'Missing initData or userId' });
    }

    // Валидируем подпись (если есть BOT_TOKEN)
    if (BOT_TOKEN && !validateInitData(initData, BOT_TOKEN)) {
      console.warn(`Invalid initData for user ${userId}`);
      // В режиме разработки разрешаем, в продакшене - блокируем
      if (process.env.NODE_ENV === 'production') {
        return res.status(401).json({ error: 'Invalid initData' });
      }
    }

    // Генерируем сессионный токен
    const token = crypto.randomBytes(32).toString('hex');
    const session = {
      userId,
      token,
      createdAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 часа
    };

    sessions.set(token, session);

    res.json({
      token,
      userId,
      expiresIn: 24 * 60 * 60
    });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== GAME ROUTES ====================

// Создать игровую сессию из Telegram бота
app.post('/api/bot/create-game', (req, res) => {
  try {
    const { createdBy, chatId, creatorName } = req.body;

    if (!createdBy || !chatId) {
      return res.status(400).json({ error: 'Missing createdBy or chatId' });
    }

    const gameId = crypto.randomBytes(6).toString('hex').toUpperCase();
    const game = {
      id: gameId,
      createdBy,
      chatId,
      creatorName,
      createdAt: Date.now(),
      players: [{ userId: createdBy, avatar: '🤠', name: creatorName, ready: false }],
      state: 'LOBBY',
      round: 1,
      revealedCards: [],
      activeHazards: [],
      scores: {}
    };

    games.set(gameId, game);

    res.json({
      gameId,
      game
    });
  } catch (error) {
    console.error('Bot game creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Создать игровую сессию
app.post('/api/games/create', (req, res) => {
  try {
    const { token } = req.body;

    if (!token || !sessions.has(token)) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const session = sessions.get(token);
    const gameId = crypto.randomBytes(6).toString('hex').toUpperCase();
    const game = {
      id: gameId,
      createdBy: session.userId,
      createdAt: Date.now(),
      players: [{ userId: session.userId, avatar: '🤠', ready: false }],
      state: 'LOBBY',
      round: 1,
      revealedCards: [],
      activeHazards: [],
      scores: {}
    };

    games.set(gameId, game);

    res.json({
      gameId,
      game
    });
  } catch (error) {
    console.error('Game creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Присоединиться к игре
app.post('/api/games/join', (req, res) => {
  try {
    const { gameId, token, avatar } = req.body;

    if (!token || !sessions.has(token)) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    if (!gameId || !games.has(gameId)) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const session = sessions.get(token);
    const game = games.get(gameId);

    if (game.players.length >= 10) {
      return res.status(400).json({ error: 'Game is full' });
    }

    if (game.players.some(p => p.userId === session.userId)) {
      return res.status(400).json({ error: 'Already in game' });
    }

    game.players.push({
      userId: session.userId,
      avatar: avatar || '🐱',
      ready: false
    });

    res.json({ game });
  } catch (error) {
    console.error('Join game error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Получить состояние игры
app.get('/api/games/:gameId', (req, res) => {
  try {
    const { gameId } = req.params;
    const { token } = req.query;

    if (!token || !sessions.has(token)) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    if (!gameId || !games.has(gameId)) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const game = games.get(gameId);
    res.json({ game });
  } catch (error) {
    console.error('Get game error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Обновить действие в игре
app.post('/api/games/:gameId/action', (req, res) => {
  try {
    const { gameId } = req.params;
    const { token, action, data } = req.body;

    if (!token || !sessions.has(token)) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    if (!gameId || !games.has(gameId)) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const game = games.get(gameId);
    const session = sessions.get(token);

    // Логирование действия
    console.log(`[Game ${gameId}] User ${session.userId} action: ${action}`, data);

    // Здесь будет логика обработки действий (dig, stay, leave и т.д.)
    // Для теперь просто подтверждаем

    res.json({
      success: true,
      game
    });
  } catch (error) {
    console.error('Game action error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==================== CREATE HTTP SERVER WITH WEBSOCKET ====================
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// WebSocket helper functions
function broadcastToRoom(roomId, message) {
  if (!wsRooms.has(roomId)) return;
  
  for (const [userId, client] of wsClients.entries()) {
    if (client.roomId === roomId && client.ws && client.ws.readyState === 1) {
      client.ws.send(JSON.stringify(message));
    }
  }
}

function getRoomState(roomId) {
  const room = wsRooms.get(roomId);
  if (!room) return null;
  
  const players = Array.from(wsClients.entries())
    .filter(([_, client]) => client.roomId === roomId)
    .map(([userId, client]) => {
      const status = room.playerStatus[userId] || { isInside: true, totalScore: 0, currentRoundScore: 0 };
      return {
        userId,
        username: client.username,
        character: client.character || null,
        isCreator: room.createdBy === userId,
        isInside: status.isInside, // ✅ НОВОЕ: текущий статус в пещере
        totalScore: status.totalScore, // ✅ НОВОЕ: итоговые очки
        currentRoundScore: status.currentRoundScore // ✅ НОВОЕ: очки в текущем раунде
      };
    });
  
  return {
    roomId,
    players,
    gameState: room.gameState,
    gameStarted: room.gameState === 'playing',
    createdBy: room.createdBy,
    createdAt: room.createdAt,
    decisionOpen: room.decisionOpen, // ✅ НОВОЕ: статус голосования
    currentDecisions: room.pendingDecisions // ✅ НОВОЕ: текущие решения
  };
}

// WebSocket connections
wss.on('connection', (ws) => {
  console.log(`[WS] New connection, total clients: ${wss.clients.size}`);
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      const { type, userId, payload } = message;
      
      if (!type || !userId) {
        ws.send(JSON.stringify({ type: 'error', message: 'Missing type or userId' }));
        return;
      }
      
      switch (type) {
        case 'join_room': {
          const { roomId, username } = payload;
          
          if (!wsRooms.has(roomId)) {
            wsRooms.set(roomId, {
              roomId,
              gameState: 'waiting',
              createdBy: userId,
              createdAt: new Date(),
              // ===== НОВОЕ: Игровое состояние =====
              phase: 'LOBBY', // ✅ ФАЗЫ: LOBBY, EXPEDITION, VOTING, RESULTS, ROUND_END, GAME_OVER
              deck: [], // На сервере - не на клиенте!
              round: 1,
              revealedCards: [],
              activeHazards: [],
              roundFailed: false,
              currentDecisions: {}, // { userId: null | 'stay' | 'leave' } (только в VOTING)
              decisionsResult: null, // { decisions, leavers, timestamp }
              pathGems: 0, // Остатки на тропе (как в Diamant)
              playerStatus: {}, // { userId: { isInside: boolean, totalScore: number, currentRoundScore: number } }
              lastEventId: 0 // Счетчик событий для дедупликации клиентом
            });
          }
          
          wsClients.set(userId, { ws, roomId, userId, username, character: null });
          
          broadcastToRoom(roomId, {
            type: 'room_state',
            payload: getRoomState(roomId)
          });
          
          console.log(`[${roomId}] ${username} joined, total: ${Array.from(wsClients.values()).filter(c => c.roomId === roomId).length}`);
          break;
        }
        
        case 'select_character': {
          const client = wsClients.get(userId);
          if (!client) return;
          
          const { characterId } = payload;
          client.character = characterId;
          
          broadcastToRoom(client.roomId, {
            type: 'character_selected',
            payload: getRoomState(client.roomId)
          });
          
          console.log(`[${client.roomId}] ${client.username} selected ${characterId}`);
          break;
        }
        
        case 'start_game': {
          const client = wsClients.get(userId);
          if (!client) return;
          
          const room = wsRooms.get(client.roomId);
          if (!room || room.createdBy !== userId) {
            ws.send(JSON.stringify({ type: 'error', message: 'Only room creator can start game' }));
            return;
          }
          
          console.log(`[START_GAME] Starting game for room ${client.roomId}`);
          
          // ===== НОВОЕ: Инициализируем колоду =====
          room.gameState = 'playing';
          room.deck = initializeDeckForRoom();
          room.round = 1;
          room.revealedCards = [];
          room.activeHazards = [];
          room.roundFailed = false;
          room.decisionOpen = false; // ✅ НОВОЕ: закрыто голосование в начале
          room.pendingDecisions = {};
          room.playerScores = {};
          room.playerStatus = {}; // ✅ НОВОЕ: инициализируем статус
          
          console.log(`[START_GAME] Room state: gameState=${room.gameState}, deck.length=${room.deck.length}`);
          
          // Инициализируем счёты и статус для всех игроков
          Array.from(wsClients.entries()).forEach(([pid, client]) => {
            if (client.roomId === room.roomId) {
              room.playerScores[pid] = 0;
              room.playerStatus[pid] = { isInside: true, totalScore: 0, currentRoundScore: 0 }; // ✅ НОВОЕ
            }
          });
          
          const roomStatePayload = getRoomState(client.roomId);
          console.log(`[START_GAME] Broadcasting game_started with roomState:`, roomStatePayload);
          
          broadcastToRoom(client.roomId, {
            type: 'game_started',
            payload: roomStatePayload
          });
          
          console.log(`[${client.roomId}] Game started with deck of ${room.deck.length} cards`);
          break;
        }
        
        case 'leave_room': {
          const client = wsClients.get(userId);
          if (!client) return;
          
          const roomId = client.roomId;
          wsClients.delete(userId);
          
          broadcastToRoom(roomId, {
            type: 'player_left',
            payload: getRoomState(roomId)
          });
          
          const remaining = Array.from(wsClients.values()).filter(c => c.roomId === roomId);
          if (remaining.length === 0) {
            wsRooms.delete(roomId);
          }
          
          console.log(`[${roomId}] Player left`);
          break;
        }
        
        // ===== НОВОЕ: Обработка игровых действий =====
        case 'player_action': {
          const client = wsClients.get(userId);
          if (!client) return;
          
          const room = wsRooms.get(client.roomId);
          if (!room || room.gameState !== 'playing') {
            ws.send(JSON.stringify({ type: 'error', message: 'Game not in playing state' }));
            return;
          }
          
          const { action, data } = payload;
          
          if (action === 'dig') {
            const { x, y } = data;
            
            // ✅ БЛОКИРУЕМ dig пока открыто голосование
            if (room.decisionOpen) {
              ws.send(JSON.stringify({ type: 'error', message: 'Cannot dig during voting phase' }));
              return;
            }
            
            const result = processDigAction(room, userId, x, y);
            
            if (result.error) {
              ws.send(JSON.stringify({ type: 'error', message: result.error }));
              return;
            }
            
            console.log(`[${client.roomId}] ${client.username} dug at (${x}, ${y}):`, result.card.type);
            
            // Подсчитываем активных игроков в комнате (они ещё в игре)
            const activePlayerIds = Array.from(wsClients.entries())
              .filter(([_, c]) => c.roomId === client.roomId)
              .map(([uid]) => uid);
            
            // ✅ ОТКРЫВАЕМ голосование после каждого dig
            room.decisionOpen = true;
            room.pendingDecisions = {};
            activePlayerIds.forEach(id => {
              room.pendingDecisions[id] = null; // Инициализируем null для всех активных
            });
            
            // Отправляем одинаковую карту ВСЕМ игрокам
            broadcastToRoom(client.roomId, {
              type: 'card_revealed',
              payload: {
                card: result.card,
                hazardMatch: result.hazardMatch,
                roundFailed: result.roundFailed,
                cardsRemaining: result.cardsRemaining,
                activeHazards: result.activeHazards,
                activePlayers: activePlayerIds, // Передаём ID активных игроков для правильного расчёта
                decisionOpen: true, // ✅ Сообщаем что голосование открыто
                currentDecisions: room.pendingDecisions // ✅ Инициализируем решения
              }
            });
          } 
          // ===== НОВОЕ: Обработка решения игрока (stay/leave) =====
          else if (action === 'submit_decision') {
            const { choice } = data; // 'stay' или 'leave'
            room.pendingDecisions[userId] = choice;
            
            console.log(`[${client.roomId}] ${client.username} decided to ${choice}`);
            
            // ✅ ЕСЛИ КТО-ТО ВЫБРАЛ "LEAVE" - все тут выходят
            if (choice === 'leave') {
              // Зафиксируем всех как проголосовавших с выходом
              const activePlayers = Array.from(wsClients.entries())
                .filter(([_, c]) => c.roomId === client.roomId)
                .map(([uid]) => uid);
              
              console.log(`[${client.roomId}] Player chose to leave! Ending expedition round.`);
              
              // Все получают выход
              const decisions = {};
              activePlayers.forEach(uid => {
                decisions[uid] = uid === userId ? 'leave' : 'leave'; // Все выходят
              });
              
              // Определяем кто выходит - все в этом раунде
              const leavers = activePlayers;
              
              // Отправляем результаты
              broadcastToRoom(client.roomId, {
                type: 'decisions_processed',
                payload: {
                  decisions,
                  leavers,
                  timestamp: Date.now()
                }
              });
              
              // Сбрасываем для следующего раунда
              room.pendingDecisions = {};
              return;
            }
            
            // ✅ СРАЗУ отправляем обновленные решения всем игрокам (не ждем всех)
            broadcastToRoom(client.roomId, {
              type: 'decisions_updated',
              payload: {
                decisions: room.pendingDecisions,
                timestamp: Date.now()
              }
            });
            
            // Проверяем собрали ли все решения
            const activePlayers = Array.from(wsClients.entries())
              .filter(([_, c]) => c.roomId === client.roomId)
              .filter(([uid]) => room.pendingDecisions.hasOwnProperty(uid));
            
            const allDecided = activePlayers.length > 0 && 
              activePlayers.every(([uid]) => room.pendingDecisions[uid] !== null);
            
            if (allDecided) {
              // Все решения собраны - обрабатываем
              const decisions = room.pendingDecisions;
              
              // Применяем решения
              const leavers = Object.entries(decisions)
                .filter(([_, choice]) => choice === 'leave')
                .map(([uid]) => uid);
              
              console.log(`[${client.roomId}] Decisions processed. Leavers: ${leavers.length}`);
              
              // ✅ ВАЖНО: Обновляем статус игроков в сервере
              leavers.forEach(uid => {
                if (room.playerStatus[uid]) {
                  room.playerStatus[uid].isInside = false; // Игрок вышел из пещеры
                }
              });
              
              // Отправляем результаты всем
              broadcastToRoom(client.roomId, {
                type: 'decisions_processed',
                payload: {
                  decisions,
                  leavers,
                  timestamp: Date.now()
                }
              });
              
              // ✅ ЗАКРЫВАЕМ голосование
              room.decisionOpen = false;
              room.pendingDecisions = {};
              
              // Разославливаем обновленный room_state с закрытым голосованием и новым статусом игроков
              broadcastToRoom(client.roomId, {
                type: 'room_state',
                payload: getRoomState(client.roomId)
              });
            }
          }
          // ===== НОВОЕ: Переход на следующий раунд =====
          else if (action === 'next_round') {
            room.round = (room.round || 1) + 1;
            room.revealedCards = [];
            room.activeHazards = [];
            room.roundFailed = false;
            room.deck = initializeDeckForRoom();
            
            console.log(`[${client.roomId}] Moving to round ${room.round}`);
            
            broadcastToRoom(client.roomId, {
              type: 'round_updated',
              payload: {
                round: room.round,
                deckRemaining: room.deck.length
              }
            });
          }
          
          break;
        }
      }
    } catch (error) {
      console.error('[WS] Error:', error);
    }
  });
  
  ws.on('close', () => {
    for (const [userId, client] of wsClients.entries()) {
      if (client.ws === ws) {
        const roomId = client.roomId;
        wsClients.delete(userId);
        
        if (roomId) {
          broadcastToRoom(roomId, {
            type: 'player_disconnected',
            payload: getRoomState(roomId)
          });
          
          const remaining = Array.from(wsClients.values()).filter(c => c.roomId === roomId);
          if (remaining.length === 0) {
            wsRooms.delete(roomId);
          }
        }
        
        console.log(`[WS] Client disconnected`);
        break;
      }
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server started on port ${PORT}`);
  console.log(`🔗 WebSocket available at ws://localhost:${PORT}`);
  console.log(`📱 Telegram Bot Token: ${BOT_TOKEN ? 'Configured' : 'Not configured'}`);
});
