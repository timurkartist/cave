import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import http from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { CardType, HazardType } from './types.js';
import { validateTelegramInitData } from './utils/telegramValidation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(express.json());
app.use(cors({ origin: '*', credentials: true }));
app.use(express.static(path.join(__dirname, 'dist')));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// ws readyState: 0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED
const WS_OPEN = WebSocketServer.OPEN ?? 1;

function isWsOpen(ws) {
  return ws && ws.readyState === WS_OPEN;
}

// ===== GAME STATE =====
const wsRooms = new Map(); // { roomId → roomState }
const wsClients = new Map(); // { userId → { ws, roomId, username, character } }
const inlineMessageToRoom = new Map(); // { inline_message_id → roomId } - маппинг для inline игр

// Deck initialization
const INITIAL_DECK = [
  // Treasures (15 total)
  { id: 't1', type: CardType.TREASURE, value: 1 },
  { id: 't2', type: CardType.TREASURE, value: 1 },
  { id: 't3', type: CardType.TREASURE, value: 1 },
  { id: 't4', type: CardType.TREASURE, value: 2 },
  { id: 't5', type: CardType.TREASURE, value: 2 },
  { id: 't6', type: CardType.TREASURE, value: 2 },
  { id: 't7', type: CardType.TREASURE, value: 3 },
  { id: 't8', type: CardType.TREASURE, value: 3 },
  { id: 't9', type: CardType.TREASURE, value: 4 },
  { id: 't10', type: CardType.TREASURE, value: 5 },
  { id: 't11', type: CardType.TREASURE, value: 5 },
  { id: 't12', type: CardType.TREASURE, value: 6 },
  { id: 't13', type: CardType.TREASURE, value: 6 },
  { id: 't14', type: CardType.TREASURE, value: 8 },
  { id: 't15', type: CardType.TREASURE, value: 11 },
  // Hazards (15 total, 3 of each type)
  { id: 'h1', type: CardType.HAZARD, hazardType: HazardType.SNAKE },
  { id: 'h2', type: CardType.HAZARD, hazardType: HazardType.SNAKE },
  { id: 'h3', type: CardType.HAZARD, hazardType: HazardType.SPIDER },
  { id: 'h4', type: CardType.HAZARD, hazardType: HazardType.SPIDER },
  { id: 'h5', type: CardType.HAZARD, hazardType: HazardType.ROCKFALL },
  { id: 'h6', type: CardType.HAZARD, hazardType: HazardType.ROCKFALL },
  { id: 'h7', type: CardType.HAZARD, hazardType: HazardType.FIRE },
  { id: 'h8', type: CardType.HAZARD, hazardType: HazardType.FIRE },
  { id: 'h9', type: CardType.HAZARD, hazardType: HazardType.MUMMY },
  { id: 'h10', type: CardType.HAZARD, hazardType: HazardType.MUMMY },
  { id: 'h11', type: CardType.HAZARD, hazardType: HazardType.SNAKE },
  { id: 'h12', type: CardType.HAZARD, hazardType: HazardType.SPIDER },
  { id: 'h13', type: CardType.HAZARD, hazardType: HazardType.ROCKFALL },
  { id: 'h14', type: CardType.HAZARD, hazardType: HazardType.FIRE },
  { id: 'h15', type: CardType.HAZARD, hazardType: HazardType.MUMMY },
];

function initializeDeck() {
  return [...INITIAL_DECK].sort(() => Math.random() - 0.5);
}

function createRoomState(roomId) {
  return {
    roomId,
    phase: 'LOBBY', // LOBBY, EXPEDITION, VOTING, RESULTS, ROUND_END, GAME_OVER
    round: 1,
    deck: [],
    revealedCards: [],
    activeHazards: [],
    pathGems: 0,
    currentDecisions: {}, // { userId: null | 'stay' | 'leave' }
    decisionsResult: null, // { decisions, leavers }
    nextRoundAcks: {}, // { userId: boolean } - кто готов к следующему раунду
    newGameAcks: {}, // { userId: boolean } - кто готов к новой игре
    players: {}, // { userId: { username, character, isInside, bankedTotal, roundStash } }
    playerOrder: [], // Порядок игроков для очереди ходов
    currentTurnUserId: null, // ID игрока, чей сейчас ход
    createdBy: null,
    createdAt: new Date()
  };
}

function getRoomState(roomId) {
  const room = wsRooms.get(roomId);
  if (!room) return null;

  // Только игроки с живыми WS соединениями (исключаем "призраков")
  const players = Array.from(wsClients.entries())
    .filter(([_, client]) => client.roomId === roomId && isWsOpen(client.ws))
    .map(([userId, client]) => {
      const playerData = room.players[userId] || {
        isInside: true,
        bankedTotal: 0,
        roundStash: 0
      };
      return {
        userId,
        username: client.username,
        character: client.character,
        isCreator: room.createdBy === userId,
        isInside: playerData.isInside,
        bankedTotal: playerData.bankedTotal,
        roundStash: playerData.roundStash
      };
    });

  return {
    roomId: room.roomId,
    createdBy: room.createdBy,
    phase: room.phase,
    round: room.round,
    players,
    revealedCards: room.revealedCards,
    activeHazards: room.activeHazards,
    pathGems: room.pathGems,
    currentDecisions: room.currentDecisions,
    decisionsResult: room.decisionsResult,
    nextRoundAcks: room.nextRoundAcks,
    newGameAcks: room.newGameAcks,
    playerOrder: room.playerOrder,
    currentTurnUserId: room.currentTurnUserId
  };
}

function broadcastToRoom(roomId) {
  const payload = getRoomState(roomId);
  if (!payload) return;

  const msg = JSON.stringify({ type: 'room_state', payload });
  Array.from(wsClients.values())
    .filter(client => client.roomId === roomId && isWsOpen(client.ws))
    .forEach(client => {
      try {
        client.ws.send(msg);
      } catch (err) {
        // Ignore send errors
      }
    });
}

// ===== GAME LOGIC =====

function processCard(room, card) {
  const insideCount = Object.values(room.players).filter(p => p.isInside).length;
  
  if (card.type === CardType.TREASURE) {
    const share = Math.floor(card.value / insideCount);
    const remainder = card.value % insideCount;
    
    // Раздаём каждому
    Object.entries(room.players).forEach(([userId, player]) => {
      if (player.isInside) {
        player.roundStash += share;
      }
    });
    
    // Остаток на тропе
    room.pathGems += remainder;
  } else if (card.type === CardType.HAZARD) {
    // Проверяем дубль опасности
    const alreadyHas = room.activeHazards.some(h => h.hazardType === card.hazardType);
    
    if (alreadyHas) {
      // ВЗРЫВ! Все внутри теряют roundStash и выходят
      room.activeHazards = [];
      room.pathGems = 0;
      Object.entries(room.players).forEach(([_, player]) => {
        if (player.isInside) {
          player.roundStash = 0; // Сгорело!
          player.isInside = false;
        }
      });
      return { roundFailed: true };
    } else {
      room.activeHazards.push({ hazardType: card.hazardType });
    }
  }
  
  return { roundFailed: false };
}

function handleDecisions(room) {
  const { currentDecisions } = room;
  const leavers = Object.entries(currentDecisions)
    .filter(([_, choice]) => choice === 'leave')
    .map(([userId]) => userId);
  
  const stayers = Object.entries(currentDecisions)
    .filter(([_, choice]) => choice === 'stay')
    .map(([userId]) => userId);
  
  // Запоминаем pathGems ДО того как поделимся
  const pathGemsThisRound = room.pathGems;
  const leaversGemsData = {};
  
  // Leavers банкуют roundStash, делят pathGems
  if (leavers.length > 0) {
    const gemsPerLeaver = Math.floor(pathGemsThisRound / leavers.length);
    leavers.forEach(userId => {
      const roundStash = room.players[userId].roundStash;
      const totalGems = roundStash + gemsPerLeaver;
      leaversGemsData[userId] = { roundStash, pathShare: gemsPerLeaver, total: totalGems };
      
      console.log(`[${room.roomId}] ${userId} left: roundStash=${roundStash}, pathShare=${gemsPerLeaver}, total=${totalGems}, isInside now=false`);
      room.players[userId].bankedTotal += totalGems;
      room.players[userId].roundStash = 0;
      room.players[userId].isInside = false;
    });
    room.pathGems = 0; // Поделились
  }
  
  // Если все вышли - раунд кончается
  if (stayers.length === 0) {
    // Очищаем оставшиеся gems если они есть (на случай ошибки)
    room.pathGems = 0;
  }
  
  // Stayers продолжают с roundStash
  return { leavers, stayers, leaversGemsData };
}

/**
 * Проверяет наличие доступных ходов для копания
 * Возвращает true если есть хотя бы один доступный ход
 */
function hasAvailableMoves(revealedCards) {
  const GRID_WIDTH = 4;
  
  if (revealedCards.length === 0) {
    // В начале есть первая строка (4 ячейки)
    return true;
  }
  
  const potentialMoves = new Set();
  
  // Для каждой открытой карточки ищем соседние ячейки
  revealedCards.forEach(card => {
    const x = card.x;
    const y = card.y;
    
    const neighbors = [
      { x, y: y + 1 }, // Down
      { x, y: y - 1 }, // Up
      { x: x - 1, y }, // Left
      { x: x + 1, y }  // Right
    ];
    
    neighbors.forEach(move => {
      // Проверяем границы
      if (move.y >= 0 && move.x >= 0 && move.x < GRID_WIDTH) {
        // Проверяем не откопана ли уже эта ячейка
        if (!revealedCards.some(rc => rc.x === move.x && rc.y === move.y)) {
          potentialMoves.add(`${move.x},${move.y}`);
        }
      }
    });
  });
  
  return potentialMoves.size > 0;
}

// ===== WEBSOCKET =====

wss.on('connection', (ws) => {
  console.log(`[WS] New connection, total: ${wss.clients.size}`);

  // Сохраняем метаданные на сокете для очистки при close
  ws._userId = null;
  ws._roomId = null;

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      const { type, userId, payload } = message;

      if (!type || !userId) {
        ws.send(JSON.stringify({ type: 'error', message: 'Missing type or userId' }));
        return;
      }

      // Валидация roomId для join_room
      if (type === 'join_room') {
        const roomId = payload?.roomId;
        if (!roomId || typeof roomId !== 'string' || roomId.trim().length === 0) {
          try { ws.send(JSON.stringify({ type: 'error', payload: { message: 'Invalid roomId' } })); } catch {}
          return;
        }
      }

      switch (type) {
        case 'join_room': {
          const { roomId, username } = payload;
          const initData = message.initData; // Получаем initData для валидации

          console.log(`📥 join_room: username=${username}, roomId=${roomId}, initData=${!!initData}`);

          // ===== TELEGRAM VALIDATION (если initData предоставлен) =====
          // Если игрок присоединяется из Telegram WebApp, валидируем initData
          let validatedUserId = userId;
          let finalUsername = username;
          let inlineMessageId = null;
          
          if (initData) {
            const botToken = process.env.TELEGRAM_BOT_TOKEN;
            if (!botToken) {
              console.warn('⚠️ TELEGRAM_BOT_TOKEN not set, skipping initData validation');
            } else {
              const validation = validateTelegramInitData(initData, botToken);
              if (!validation.valid) {
                console.warn(`❌ initData validation failed for userId: ${userId}`);
                try {
                  ws.send(JSON.stringify({
                    type: 'error',
                    payload: { message: 'Invalid Telegram credentials' }
                  }));
                } catch {}
                ws.close(4001, 'Invalid credentials');
                return;
              }
              
              // Используем валидированный userId из Telegram
              if (validation.user) {
                validatedUserId = String(validation.user.id);
                console.log(`✅ initData validated, Telegram user: ${validatedUserId}`);
                
                // ===== ПЕРЕОПРЕДЕЛЯЕМ username ПО ДАННЫМ ИЗ TELEGRAM =====
                const u = validation.user;
                finalUsername =
                  (u.username && `@${u.username}`) ||
                  [u.first_name, u.last_name].filter(Boolean).join(' ') ||
                  `Player ${u.id}`;
                console.log(`✅ Using Telegram identity: username=${finalUsername}, id=${validatedUserId}`);
              }
              
              // Извлекаем inline_message_id - это уникальный ключ для лобби в Telegram Game API
              // Telegram гарантированно передаёт это в initDataUnsafe.inline_message_id
              if (validation.inlineMessageId) {
                inlineMessageId = validation.inlineMessageId;
                console.log(`📍 Got inline_message_id from Telegram: ${inlineMessageId}`);
              }
            }
          }

          // Если есть inline_message_id - используем его как ключ комнаты для inline игр
          let finalRoomId = roomId;
          
          // roomId может быть в формате GAME_lobby_key (от фронта)
          // Если оно начинается с GAME_ и содержит информацию о лобби - используем как есть
          if (finalRoomId && finalRoomId.startsWith('GAME_')) {
            console.log(`📍 Using lobby-based room from frontend: ${finalRoomId}`);
          } else if (!finalRoomId || finalRoomId === 'GAME_TEMP_' || !finalRoomId.startsWith('GAME_')) {
            // Fallback: используем инлайн ID если есть
            if (inlineMessageId) {
              if (inlineMessageToRoom.has(inlineMessageId)) {
                finalRoomId = inlineMessageToRoom.get(inlineMessageId);
                console.log(`📍 Inline game: reusing room ${finalRoomId} for inline_message_id ${inlineMessageId}`);
              } else {
                finalRoomId = `GAME_${inlineMessageId.substring(0, 20).toUpperCase()}`;
                inlineMessageToRoom.set(inlineMessageId, finalRoomId);
                console.log(`📍 Inline game: created room ${finalRoomId} for inline_message_id ${inlineMessageId}`);
              }
            } else {
              // Крайний fallback
              finalRoomId = `GAME_${Date.now().toString(36).toUpperCase()}_${validatedUserId}`;
              console.log(`⚠️ No lobby key, generated room: ${finalRoomId}`);
            }
          }

          if (!wsRooms.has(finalRoomId)) {
            wsRooms.set(finalRoomId, createRoomState(finalRoomId));
          }

          // Если userId уже существует - закрываем старый сокет
          const existing = wsClients.get(validatedUserId);
          if (existing && existing.ws && existing.ws !== ws) {
            console.log(`⚠️ Closing existing connection for ${validatedUserId}, old room: ${existing.roomId}`);
            try { existing.ws.close(4000, 'Reconnected'); } catch {}
          }

          console.log(`✅ Connecting ${validatedUserId} to room ${finalRoomId}, username: ${finalUsername}`);

          wsClients.set(validatedUserId, { ws, roomId: finalRoomId, userId: validatedUserId, username: finalUsername, character: null });

          // Сохраняем метаданные на ws для очистки
          ws._userId = validatedUserId;
          ws._roomId = finalRoomId;

          const room = wsRooms.get(finalRoomId);
          
          // ✅ Первый игрок становится creator
          if (!room.createdBy) {
            room.createdBy = validatedUserId;
          }
          
          if (!room.players[validatedUserId]) {
            room.players[validatedUserId] = { isInside: true, bankedTotal: 0, roundStash: 0 };
          }

          broadcastToRoom(finalRoomId);
          console.log(`[${finalRoomId}] ${finalUsername} (${validatedUserId}) joined (creator: ${room.createdBy === validatedUserId})`);
          break;
        }

        case 'select_character': {
          const client = wsClients.get(userId);
          if (client) {
            const oldChar = client.character;
            client.character = payload.characterId;
            console.log(`[${client.roomId}] ${userId} selected character: ${payload.characterId} (was: ${oldChar})`);
            broadcastToRoom(client.roomId);
            console.log(`[${client.roomId}] Broadcasted room state`);
          } else {
            console.log(`[select_character] Client not found: ${userId}`);
          }
          break;
        }

        case 'start_game': {
          const client = wsClients.get(userId);
          if (!client) return;

          const room = wsRooms.get(client.roomId);
          if (!room || room.createdBy !== userId) {
            ws.send(JSON.stringify({ type: 'error', message: 'Only creator can start' }));
            return;
          }

          // Проверяем минимум 2 игрока
          const roomPlayers = Array.from(wsClients.entries())
            .filter(([_, c]) => c.roomId === client.roomId && isWsOpen(c.ws));
          if (roomPlayers.length < 2) {
            ws.send(JSON.stringify({ type: 'error', message: 'Need at least 2 players' }));
            return;
          }

          room.phase = 'EXPEDITION';
          room.round = 1;
          room.deck = initializeDeck();
          room.revealedCards = [];
          room.activeHazards = [];
          room.pathGems = 0;
          room.currentDecisions = {};
          room.decisionsResult = null;

          // ✅ Инициализируем порядок игроков и первый ход
          room.playerOrder = Array.from(wsClients.entries())
            .filter(([_, c]) => c.roomId === client.roomId && isWsOpen(c.ws))
            .map(([playerId, _]) => playerId);
          room.currentTurnUserId = room.playerOrder[0] || null;

          // Инициализируем игроков
          Object.entries(room.players).forEach(([_, player]) => {
            player.isInside = true;
            player.roundStash = 0;
            // bankedTotal сохраняется между раундами
          });

          broadcastToRoom(client.roomId);
          console.log(`[${client.roomId}] Game started, round 1, turn: ${room.currentTurnUserId}, order: ${room.playerOrder.join(', ')}`);
          break;
        }

        case 'player_action': {
          const { action, data } = payload;
          const client = wsClients.get(userId);
          if (!client) return;

          const room = wsRooms.get(client.roomId);
          if (!room) return;
          
          console.log(`[${room.roomId}] player_action: ${action}, userId: ${userId}, phase: ${room.phase}`);

          if (action === 'dig') {
            // ✅ Проверяем что это ход текущего игрока
            if (room.phase !== 'EXPEDITION' || !room.players[userId]?.isInside) {
              return;
            }

            if (room.currentTurnUserId !== userId) {
              console.log(`[${room.roomId}] Dig denied: ${userId} tried to dig but it's ${room.currentTurnUserId}'s turn`);
              return;
            }

            if (room.deck.length === 0) {
              room.phase = 'ROUND_END';
              room.nextRoundAcks = {}; // Очищаем для нового раунда
              broadcastToRoom(client.roomId);
              return;
            }

            const card = room.deck.shift();
            // ✅ Используем координаты которые отправил клиент
            card.x = data.x;
            card.y = data.y;
            room.revealedCards.push(card);

            const { roundFailed } = processCard(room, card);

            if (roundFailed) {
              room.phase = 'ROUND_END';
              room.nextRoundAcks = {}; // Очищаем для нового раунда
              broadcastToRoom(client.roomId, { type: 'room_state', payload: getRoomState(client.roomId) });
              return;
            }

            // ✅ Переходим к следующему игроку в очереди
            const currentIndex = room.playerOrder.indexOf(room.currentTurnUserId);
            let nextIndex = (currentIndex + 1) % room.playerOrder.length;
            let nextPlayerId = room.playerOrder[nextIndex];
            
            console.log(`[${room.roomId}] Finding next player: currentIndex=${currentIndex}, nextIndex=${nextIndex}, nextPlayerId=${nextPlayerId}, isInside=${room.players[nextPlayerId]?.isInside}`);
            
            // Пропускаем игроков которые в лагере (не в экспедиции)
            let skippedCount = 0;
            while (!room.players[nextPlayerId]?.isInside && skippedCount < room.playerOrder.length) {
              console.log(`[${room.roomId}] Skipping ${nextPlayerId} (not inside), skippedCount=${skippedCount}`);
              nextIndex = (nextIndex + 1) % room.playerOrder.length;
              nextPlayerId = room.playerOrder[nextIndex];
              skippedCount++;
            }
            
            room.currentTurnUserId = nextPlayerId;
            console.log(`[${room.roomId}] Turn passed to ${room.currentTurnUserId}`);

            // Проверяем есть ли доступные ходы
            if (!hasAvailableMoves(room.revealedCards)) {
              console.log(`[${room.roomId}] No available moves! All players return to camp.`);
              // Все возвращаются в лагерь
              Object.entries(room.players).forEach(([userId, player]) => {
                if (player.isInside) {
                  player.bankedTotal += player.roundStash;
                  player.roundStash = 0;
                  player.isInside = false;
                }
              });
              // Добавляем pathGems поровну
              if (room.pathGems > 0) {
                const stayersCount = Object.values(room.players).length;
                const gemsPerPlayer = Math.floor(room.pathGems / stayersCount);
                Object.entries(room.players).forEach(([_, player]) => {
                  player.bankedTotal += gemsPerPlayer;
                });
                room.pathGems = 0;
              }
              room.phase = 'RESULTS';
              room.currentDecisions = {};
              room.decisionsResult = { decisions: {}, leavers: Object.keys(room.players), leaversGemsData: {} };
              broadcastToRoom(client.roomId);
              
              // Через 3 сек переходим на конец раунда
              setTimeout(() => {
                room.phase = 'ROUND_END';
                room.nextRoundAcks = {};
                broadcastToRoom(client.roomId);
              }, 3000);
              return;
            }

            // Переходим в голосование
            room.phase = 'VOTING';
            room.currentDecisions = {};
            Object.entries(room.players).forEach(([pid, player]) => {
              if (player.isInside) {
                room.currentDecisions[pid] = null;
              }
            });

            broadcastToRoom(client.roomId);
          } else if (action === 'submit_decision') {
            // ✅ Записываем решение
            if (room.phase !== 'VOTING') return;

            room.currentDecisions[userId] = data.choice;

            // Проверяем все ли решили
            const insideIds = Object.entries(room.players)
              .filter(([_, p]) => p.isInside)
              .map(([id]) => id);

            const allDecided = insideIds.every(id => room.currentDecisions[id] !== null);

            if (allDecided) {
              // Применяем результаты
              const { leavers, stayers, leaversGemsData } = handleDecisions(room);
              console.log(`[${room.roomId}] After decisions: leavers=${leavers.length}, stayers=${stayers.length}`);
              room.decisionsResult = { decisions: room.currentDecisions, leavers, leaversGemsData };
              room.phase = 'RESULTS';

              broadcastToRoom(client.roomId, { type: 'room_state', payload: getRoomState(client.roomId) });

              // Через 3 сек возвращаемся в EXPEDITION
              setTimeout(() => {
                if (stayers.length > 0) {
                  room.phase = 'EXPEDITION';
                  room.currentDecisions = {};
                  room.decisionsResult = null;
                  
                  // Устанавливаем ход на первого игрока который в экспедиции
                  const firstInsidePlayer = room.playerOrder.find(playerId => room.players[playerId]?.isInside);
                  room.currentTurnUserId = firstInsidePlayer || null;
                  console.log(`[${room.roomId}] Back to EXPEDITION, turn to: ${room.currentTurnUserId}`);
                } else {
                  console.log(`[${room.roomId}] All players left the mine! Going to ROUND_END`);
                  room.phase = 'ROUND_END';
                  room.nextRoundAcks = {}; // Очищаем для нового раунда
                }
                broadcastToRoom(client.roomId);
              }, 3000);
            } else {
              // Отправляем обновлённое состояние решений
              broadcastToRoom(client.roomId);
            }
          } else if (action === 'next_round') {
            // Обработка перехода на следующий раунд
            if (room.phase !== 'ROUND_END') {
              console.log(`[${room.roomId}] Ignored next_round - wrong phase: ${room.phase}`);
              return;
            }

            // Записываем что этот игрок готов
            room.nextRoundAcks[userId] = true;
            console.log(`[${room.roomId}] Player ${userId} acknowledged next_round, acks:`, room.nextRoundAcks);

            // Получаем всех живых игроков в комнате
            const activePlayers = Array.from(wsClients.entries())
              .filter(([_, c]) => c.roomId === client.roomId && isWsOpen(c.ws))
              .map(([id]) => id);

            // Проверяем все ли нажали кнопку
            const allReady = activePlayers.every(id => room.nextRoundAcks[id] === true);

            if (allReady) {
              // Все готовы - переходим на следующий раунд
              room.round += 1;
              if (room.round > 5) {
                room.phase = 'GAME_OVER';
              } else {
                room.phase = 'EXPEDITION';
                room.deck = initializeDeck();
                room.revealedCards = [];
                room.activeHazards = [];
                room.pathGems = 0;
                room.currentDecisions = {};
                room.decisionsResult = null;
                room.nextRoundAcks = {}; // Очищаем acknowledgments
                // ✅ Переходим на первого игрока в порядке
                room.currentTurnUserId = room.playerOrder[0] || null;
                console.log(`[${room.roomId}] === Resetting isInside for new round ${room.round} ===`);
                Object.entries(room.players).forEach(([userId, player]) => {
                  console.log(`[${room.roomId}] Reset ${userId}: isInside = true (was ${player.isInside}), roundStash = 0`);
                  player.isInside = true;
                  player.roundStash = 0;
                });
                console.log(`[${room.roomId}] New round ${room.round}, first turn: ${room.currentTurnUserId}`);
              }
            }

            broadcastToRoom(client.roomId);
          } else if (action === 'new_game') {
            // Обработка начала новой игры
            if (room.phase !== 'GAME_OVER') {
              console.log(`[${room.roomId}] Ignored new_game - wrong phase: ${room.phase}`);
              return;
            }

            // Записываем что этот игрок готов к новой игре
            room.newGameAcks[userId] = true;
            console.log(`[${room.roomId}] Player ${userId} acknowledged new_game, acks:`, room.newGameAcks);

            // Получаем всех живых игроков в комнате
            const activePlayers = Array.from(wsClients.entries())
              .filter(([_, c]) => c.roomId === client.roomId && isWsOpen(c.ws))
              .map(([id]) => id);

            // Проверяем все ли нажали кнопку
            const allReady = activePlayers.every(id => room.newGameAcks[id] === true);

            if (allReady) {
              // Все готовы - возвращаемся в лобби и начинаем новую игру
              room.phase = 'LOBBY';
              room.round = 1;
              room.deck = initializeDeck();
              room.revealedCards = [];
              room.activeHazards = [];
              room.pathGems = 0;
              room.currentDecisions = {};
              room.decisionsResult = null;
              room.newGameAcks = {}; // Очищаем acknowledgments
              Object.entries(room.players).forEach(([_, player]) => {
                player.character = null;
                player.isInside = true;
                player.bankedTotal = 0;
                player.roundStash = 0;
              });
            }

            broadcastToRoom(client.roomId);
          }
          break;
        }
      }
    } catch (err) {
      console.error('WS error:', err);
    }
  });

  ws.on('close', () => {
    const uid = ws._userId;
    const rid = ws._roomId;

    // Только удаляем если это текущий сокет для userId
    if (uid && wsClients.has(uid)) {
      const current = wsClients.get(uid);
      if (current && current.ws === ws) {
        wsClients.delete(uid);
        
        // Если это был creator - переназначаем creator другому игроку в комнате
        if (rid) {
          const room = wsRooms.get(rid);
          if (room && room.createdBy === uid) {
            // Ищем другого живого игрока в комнате
            const anotherPlayer = Array.from(wsClients.values()).find(
              c => c.roomId === rid && c.userId !== uid
            );
            if (anotherPlayer) {
              room.createdBy = anotherPlayer.userId;
              console.log(`[${rid}] Creator changed to ${anotherPlayer.userId}`);
            } else {
              // Больше нет игроков - creator = null
              room.createdBy = null;
              console.log(`[${rid}] Room empty - creator reset`);
            }
          }
          broadcastToRoom(rid);
        }
        console.log(`[${rid}] ${uid} disconnected`);
        return;
      }
    }

    // Fallback: поиск если метаданные не установлены
    for (const [scanUid, c] of wsClients.entries()) {
      if (c.ws === ws) {
        wsClients.delete(scanUid);
        
        // Переназначение creator при отключении
        if (c.roomId) {
          const room = wsRooms.get(c.roomId);
          if (room && room.createdBy === scanUid) {
            const anotherPlayer = Array.from(wsClients.values()).find(
              cl => cl.roomId === c.roomId && cl.userId !== scanUid
            );
            if (anotherPlayer) {
              room.createdBy = anotherPlayer.userId;
              console.log(`[${c.roomId}] Creator changed to ${anotherPlayer.userId}`);
            } else {
              room.createdBy = null;
              console.log(`[${c.roomId}] Room empty - creator reset`);
            }
          }
          broadcastToRoom(c.roomId);
        }
        console.log(`[${c.roomId}] ${scanUid} disconnected (fallback)`);
        break;
      }
    }
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

server.listen(PORT, () => {
  console.log(`🎮 Server running on port ${PORT}`);
});
