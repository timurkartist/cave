
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GameState, Player, GameCard, RoundInfo, CardType } from './types';
import { INITIAL_DECK, TOTAL_ROUNDS, HAZARD_ICONS } from './constants';
import { useGameWebSocket } from './hooks/useGameWebSocket';

const GRID_WIDTH = 4;
const MAX_PLAYERS = 10;
const AVAILABLE_EMOJIS = [
  '🤠', '🐱', '🐶', '🦊', '🐸', '🐙', '🦖', '🤖', 
  '👻', '🧙', '🥷', '🧑‍🚀', '🧛', '🧟', '🦄', '🐝',
  '🦁', '🐼', '🦀', '🦏', '🦉', '🦋', '🐥', '🐧'
];

const DugTile: React.FC<{ card: GameCard }> = ({ card }) => {
  const isHazard = card.type === CardType.HAZARD;
  const xPos = (card.x || 0) * 25;
  return (
    <div 
      className={`absolute w-[22%] aspect-square rounded-lg flex flex-col items-center justify-center border-2 shadow-lg transition-all duration-500 animate-in zoom-in ${isHazard ? 'border-red-600 bg-red-900/40' : 'border-blue-500 bg-blue-900/40'}`}
      style={{ left: `${xPos + 1.5}%`, top: `${(card.y || 0) * 110}px` }}
    >
      <span className="text-xl">{isHazard ? HAZARD_ICONS[card.hazardType!] : '💎'}</span>
      {!isHazard && <span className="text-[10px] font-bold text-blue-300">{card.value}</span>}
      {!isHazard && card.remainder! > 0 && (
        <span className="absolute -bottom-1 right-0 bg-amber-500 text-[8px] text-black px-1 rounded-sm font-black">
          +{card.remainder}
        </span>
      )}
    </div>
  );
};

export default function App() {
  // Инициализируем как пустую строку
  const [roomCode, setRoomCode] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  
  const [gameState, setGameState] = useState<GameState>(GameState.LOBBY);
  const [players, setPlayers] = useState<Player[]>([]);
  const [round, setRound] = useState<RoundInfo>({ number: 1, revealedCards: [], activeHazards: [] });
  const [deck, setDeck] = useState<GameCard[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingDecisions, setPendingDecisions] = useState<Record<string, 'stay' | 'leave' | null>>({});
  const [isRevealing, setIsRevealing] = useState(false);
  const [gameId, setGameId] = useState<string>('');
  const [decisionPlayerIndex, setDecisionPlayerIndex] = useState(0); // Индекс игрока который голосует
  const [votingRequired, setVotingRequired] = useState(false); // ✅ НОВОЕ: Показывать ли меню голосования после карты
  
  // ===== ЖЕЛЕЗОБЕТОННО: Один источник истины для инициализации =====
  // Читаем roomCode из URL и генерируем userId/username одновременно
  useEffect(() => {
    console.log('🔴 [APP.TSX] useEffect TRIGGERED - timestamp:', new Date().toISOString());
    
    if (typeof window !== 'undefined') {
      console.log('🔍 [URL INIT] window.location:', {
        href: window.location.href,
        hash: window.location.hash,
        search: window.location.search,
        pathname: window.location.pathname
      });
      
      // Пытаемся несколько вариантов: hash, query params, sessionStorage
      let roomIdValue: string | null = null;
      let userIdValue: string | null = null;
      let usernameValue: string | null = null;
      let foundSource = '';
      
      // 1. Проверяем hash (#roomId=test-room&userId=...) - приоритет 1
      if (window.location.hash) {
        console.log('🔍 [HASH] Parsing hash:', window.location.hash);
        const hashString = window.location.hash.substring(1);
        console.log('🔍 [HASH] Hash string (without #):', hashString);
        const hashParams = new URLSearchParams(hashString);
        const entries = Array.from(hashParams.entries());
        console.log('🔍 [HASH] URLSearchParams entries:', entries);
        
        roomIdValue = hashParams.get('roomId');
        userIdValue = hashParams.get('userId');
        usernameValue = hashParams.get('username');
        
        console.log('🔍 [HASH] Extracted - roomId:', roomIdValue, 'userId:', userIdValue, 'username:', usernameValue);
        if (roomIdValue) {
          foundSource = 'hash';
          console.log('✅ FOUND IN HASH!');
        }
      } else {
        console.log('🔍 [HASH] No hash found in URL');
      }
      
      // 2. Проверяем query params (?roomId=test-room) - приоритет 2
      if (!roomIdValue && window.location.search) {
        console.log('🔍 [QUERY] Parsing search:', window.location.search);
        const queryParams = new URLSearchParams(window.location.search);
        console.log('🔍 [QUERY] URLSearchParams:', Array.from(queryParams.entries()));
        
        roomIdValue = queryParams.get('roomId');
        userIdValue = queryParams.get('userId');
        usernameValue = queryParams.get('username');
        
        console.log('🔍 [QUERY] Extracted - roomId:', roomIdValue, 'userId:', userIdValue, 'username:', usernameValue);
        if (roomIdValue) {
          foundSource = 'query';
          console.log('✅ FOUND IN QUERY!');
        }
      } else if (!window.location.hash) {
        console.log('🔍 [QUERY] No search params found in URL');
      }
      
      // 3. Проверяем sessionStorage - приоритет 3
      if (!roomIdValue) {
        const savedSearch = sessionStorage.getItem('initialSearch');
        console.log('🔍 [SESSION] initialSearch:', savedSearch);
        if (savedSearch) {
          const savedParams = new URLSearchParams(savedSearch);
          roomIdValue = savedParams.get('roomId');
          userIdValue = savedParams.get('userId');
          usernameValue = savedParams.get('username');
          
          console.log('🔍 [SESSION] Extracted - roomId:', roomIdValue, 'userId:', userIdValue, 'username:', usernameValue);
          if (roomIdValue) {
            foundSource = 'sessionStorage';
            console.log('✅ FOUND IN SESSIONSTORAGE!');
          }
        }
      }
      
      // ===== УСТАНОВКА ЗНАЧЕНИЙ: Все одновременно за один раз =====
      if (roomIdValue) {
        console.log('✅✅✅ SETTING ROOMCODE FROM', foundSource + ':', roomIdValue);
        setRoomCode(roomIdValue);
        
        // Если нашли userId/username - используем их, иначе генерируем
        if (userIdValue) {
          console.log('✅ Using userId from', foundSource + ':', userIdValue);
          setUserId(userIdValue);
        } else {
          const newUserId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
          console.log('✅ Generated new userId:', newUserId);
          setUserId(newUserId);
        }
        
        if (usernameValue) {
          console.log('✅ Using username from', foundSource + ':', usernameValue);
          setUsername(usernameValue);
        } else {
          const newUsername = `Player_${Math.random().toString(36).substring(2).substring(0, 4).toUpperCase()}`;
          console.log('✅ Generated new username:', newUsername);
          setUsername(newUsername);
        }
        
        // ===== НОРМАЛИЗАЦИЯ URL: переносим в hash и удаляем query =====
        // Если roomId был в query, переносим в hash для совместимости с ngrok
        if (foundSource === 'query') {
          const newUrl = `${window.location.pathname}#roomId=${roomIdValue}`;
          window.history.replaceState({}, '', newUrl);
          console.log('🔄 Normalized URL to hash:', newUrl);
        }
      } else {
        // Fallback - генерируем все значения с нуля
        const fallbackRoomCode = `room-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const fallbackUserId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        const fallbackUsername = `Player_${Math.random().toString(36).substring(2).substring(0, 4).toUpperCase()}`;
        
        console.log('⚠️⚠️⚠️ NO PARAMETERS FOUND, GENERATING FALLBACKS:', {
          roomCode: fallbackRoomCode,
          userId: fallbackUserId,
          username: fallbackUsername
        });
        
        setRoomCode(fallbackRoomCode);
        setUserId(fallbackUserId);
        setUsername(fallbackUsername);
      }
    }
  }, []); // Пустой dependency array - выполнится только один раз при монтировании
  
  const [wsConnected, setWsConnected] = useState(false);
  const [remoteRoomState, setRemoteRoomState] = useState<any>(null);
  const [localCharacter, setLocalCharacter] = useState<string | null>(null);
  const [finalDecisions, setFinalDecisions] = useState<Record<string, 'stay' | 'leave'> | null>(null);
  
  const shaftEndRef = useRef<HTMLDivElement>(null);
  const gameStartedHandledRef = useRef(false); // Флаг для предотвращения повторного запуска игры
  const decisionsProcessedRef = useRef(false); // Флаг для предотвращения повторной обработки решений
  const lastCardHandledRef = useRef(false); // Флаг для предотвращения повторной обработки карты

  // Инициализируем WebSocket
  const { 
    roomState, 
    connected, 
    error: wsError,
    selectCharacter,
    startGame: wsStartGame,
    sendPlayerAction,
    leaveRoom
  } = useGameWebSocket(roomCode, userId, username);

  // Синхронизируем состояние комнаты с локальным состоянием
  useEffect(() => {
    console.log('🔄 [useEffect] roomState updated:', roomState?.gameStarted, 'players:', roomState?.players?.length, 'gameState:', gameState);
    if (!roomState) {
      console.log('🔄 [useEffect] roomState is null, skipping');
      return;
    }
    if (!roomState.players) {
      console.log('🔄 [useEffect] roomState.players is null, skipping');
      return;
    }
      setRemoteRoomState(roomState);
      // Обновляем список игроков из комнаты
      const remotePlayers: Player[] = roomState.players.map((p: any, idx: number) => ({
        id: p.userId,
        name: p.username,
        avatar: p.character || AVAILABLE_EMOJIS[idx % AVAILABLE_EMOJIS.length],
        character: p.character,
        totalScore: p.totalScore ?? 0, // ✅ ИСПРАВЛЕНИЕ: берем из roomState
        currentRoundScore: p.currentRoundScore ?? 0, // ✅ ИСПРАВЛЕНИЕ: берем из roomState
        isInside: p.isInside ?? true, // ✅ ИСПРАВЛЕНИЕ: берем из roomState (важно для механики с выходом)
        isAI: false,
        ability: ''
      }));
      
      // Обновляем только если количество игроков изменилось или их ID'ы отличаются
      setPlayers(prevPlayers => {
        const prevIds = prevPlayers.map(p => p.id).sort().join(',');
        const newIds = remotePlayers.map(p => p.id).sort().join(',');
        if (prevIds === newIds) {
          console.log('🔄 Players list unchanged, skipping update');
          return prevPlayers;
        }
        console.log('🔄 Players updated:', newIds);
        return remotePlayers;
      });
      
      // Синхронизируем localCharacter с тем что вернул сервер
      const myPlayerFromServer = roomState.players.find((p: any) => p.userId === userId);
      if (myPlayerFromServer?.character) {
        setLocalCharacter(myPlayerFromServer.character);
      }

      // Если игра начана на сервере - переходим в режим экспедиции
      if (roomState.gameStarted) {
        console.log('🎮 gameStarted detected:', roomState.gameStarted, 'handledRef:', gameStartedHandledRef.current);
        if (!gameStartedHandledRef.current) {
          console.log('🎮 Game started, transitioning to EXPEDITION');
          gameStartedHandledRef.current = true; // Отмечаем что уже обработали запуск
          decisionsProcessedRef.current = false; // Сбрасываем флаг решений для новой игры          lastCardHandledRef.current = false; // ✅ НОВОЕ: Сбрасываем флаг карты для новой игры          setDeck([...INITIAL_DECK].sort(() => Math.random() - 0.5));
          setRound({ number: 1, revealedCards: [], activeHazards: [] });
          setGameState(GameState.EXPEDITION);
        }
      }
      
      // ===== НОВОЕ: Обработка карты откопанной с сервера =====
      if (roomState.lastCardRevealed && !lastCardHandledRef.current) {
        const cardData = roomState.lastCardRevealed;
        const card = cardData.card;
        
        console.log('📍 Processing card revealed:', card);
        // ✅ НЕ отмечаем обработку сразу - сбросим после применения
        
        // Добавляем карту в раунд
        setRound(prev => ({
          ...prev,
          revealedCards: [...prev.revealedCards, card],
          activeHazards: cardData.activeHazards || prev.activeHazards
        }));
        
        // ===== ИЗМЕНЕНИЕ: Используем activePlayers от сервера для расчёта =====
        if (card.type === CardType.TREASURE && cardData.activePlayers) {
          const activeCount = cardData.activePlayers.length;
          const share = Math.floor(card.value / activeCount);
          const remainder = card.value % activeCount;
          
          // Обновляем очки активных игроков
          setPlayers(prev => prev.map(p => {
            if (cardData.activePlayers.includes(p.id)) {
              return { ...p, currentRoundScore: p.currentRoundScore + share };
            }
            return p;
          }));
          
          // Сохраняем остаток для фазы выхода
          card.remainder = remainder;
        }
        
        // Если раунд провален - переходим в конец раунда
        if (cardData.roundFailed) {
          console.log('🔴 Round failed! All players lose current score.');
          setPlayers(prev => prev.map(p => p.isInside ? { ...p, currentRoundScore: 0, isInside: false } : p));
          setGameState(GameState.ROUND_END);
        } else {
          // ✅ НОВОЕ: После открытия карты включаем голосование
          // Берем pendingDecisions с сервера (а не инициализируем локально!)
          if (cardData.currentDecisions) {
            setPendingDecisions(cardData.currentDecisions);
            console.log('🗳️ Voting initialized from server:', cardData.currentDecisions);
          }
          
          setVotingRequired(true);
        }
        
        // ✅ ОТМЕЧАЕМ обработку ПОСЛЕ применения всех изменений
        lastCardHandledRef.current = true;
        
        shaftEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
      
      // ===== НОВОЕ: Обработка результатов решений с сервера =====
      if (roomState.decisionsResult && !decisionsProcessedRef.current) {
        const { decisions, leavers } = roomState.decisionsResult;
        
        console.log('📊 Processing decisions result:', { decisions, leavers });
        decisionsProcessedRef.current = true; // Отмечаем что обработали
        
        // Сохраняем решения для показа результатов
        setFinalDecisions(decisions);
        
        // Переходим в фазу показа результатов
        setGameState(GameState.RESULTS_PHASE);
        setIsRevealing(true);
        
        // После 3 секунд показа результатов - применяем решения
        setTimeout(() => {
          console.log('⏳ Applying decision consequences. Leavers:', leavers);
          
          // Применяем результаты решений
          let updatedPlayers = [...players];
          
          // ✅ ВАЖНО: Только уходящие получают остаток делили
          if (leavers && leavers.length > 0) {
            const floorGems = round.revealedCards.reduce((acc, c) => acc + (c.remainder || 0), 0);
            const floorShare = floorGems > 0 ? Math.floor(floorGems / leavers.length) : 0;
            
            console.log('💎 Floor gems:', floorGems, 'Share per leaver:', floorShare);
            
            updatedPlayers = updatedPlayers.map(p => {
              if (leavers.includes(p.id)) {
                const totalEarned = p.currentRoundScore + floorShare;
                console.log(`${p.name} leaves with ${totalEarned} (score: ${p.currentRoundScore} + share: ${floorShare})`);
                return { ...p, totalScore: p.totalScore + totalEarned, currentRoundScore: 0, isInside: false };
              }
              // ✅ Остающиеся сохраняют currentRoundScore и остаются в игре
              return p;
            });
            
            // ✅ Очищаем остатки ТОЛЬКО для уходящих
            setRound(prev => ({ ...prev, revealedCards: prev.revealedCards.map(c => ({ ...c, remainder: 0 })) }));
          }
          
          setPlayers(updatedPlayers);
          
          const anyoneLeft = updatedPlayers.some(p => p.isInside);
          if (!anyoneLeft) {
            console.log('🏁 No one left, moving to ROUND_END');
            setGameState(GameState.ROUND_END);
          } else {
            console.log('🔄 Moving back to EXPEDITION');
            setGameState(GameState.EXPEDITION);
            setVotingRequired(false); // ✅ Скрываем кнопки голосования до следующей карты
          }
          setPendingDecisions({});
          setDecisionPlayerIndex(0); // ✅ Сбрасываем индекс на новый раунд
          setFinalDecisions(null);
          setIsRevealing(false);
        }, 3000);
      }
      
      // ===== НОВОЕ: Обработка обновления раунда с сервера =====
      if (roomState.roundInfo) {
        const { round: newRound } = roomState.roundInfo;
        
        console.log('🔄 Round updated from server:', newRound);
        
        // Обновляем раунд в локальном состоянии
        setRound({ number: newRound, revealedCards: [], activeHazards: [] });
        setPlayers(prev => prev.map(p => ({ ...p, isInside: true, currentRoundScore: 0 })));
        setGameState(GameState.EXPEDITION);
        
        // ✅ Сбрасываем флаги для новых событий в новом раунде
        decisionsProcessedRef.current = false;
        lastCardHandledRef.current = false;
        setDecisionPlayerIndex(0); // ✅ Сбрасываем индекс игрока
        setPendingDecisions({});
      }
  }, [roomState, userId, gameState, players]);

  // ===== НОВОЕ: Сбрасываем флаг обработки карты когда приходит новая карта =====
  useEffect(() => {
    if (roomState?.lastCardRevealed) {
      console.log('🔄 New card detected, resetting lastCardHandledRef');
      lastCardHandledRef.current = false; // Позволяет обработать новую карту
    }
  }, [roomState?.lastCardRevealed]);

  // ===== НОВОЕ: Сбрасываем флаг после завершения голосования =====
  useEffect(() => {
    if (!votingRequired && lastCardHandledRef.current) {
      console.log('🔄 Voting completed, ready for next card');
      lastCardHandledRef.current = false; // Позволяет обработать следующую карту
    }
  }, [votingRequired]);

  // ===== НОВОЕ: Обновляем pendingDecisions когда приходит decisions_updated =====
  useEffect(() => {
    if (roomState?.currentDecisions && votingRequired) {
      console.log('📊 Updating pending decisions from server:', roomState.currentDecisions);
      setPendingDecisions(roomState.currentDecisions);
    }
  }, [roomState?.currentDecisions, votingRequired]);

  useEffect(() => {
    setWsConnected(connected);
  }, [connected]);

  // Логирование изменений roomCode для отладки
  useEffect(() => {
    console.log('🔄 roomCode changed:', roomCode);
  }, [roomCode]);

  // --- SETUP LOGIC ---
  const togglePlayer = (emoji: string) => {
    // Если этот эмоджи уже выбран этим игроком - отменяем (null)
    const currentCharacter = localCharacter || players.find(p => p.id === userId)?.avatar;
    const emojiToSend = currentCharacter === emoji ? null : emoji;
    
    // Оптимистичное обновление UI - сразу показываем выбор
    setLocalCharacter(emojiToSend);
    
    // Обновляем локальный список игроков
    setPlayers(prev => {
      const existingPlayer = prev.find(p => p.id === userId);
      if (existingPlayer) {
        return prev.map(p => 
          p.id === userId 
            ? { ...p, avatar: emojiToSend || AVAILABLE_EMOJIS[0], character: emojiToSend }
            : p
        );
      } else if (emojiToSend) {
        // Если игрока ещё нет в списке - добавляем
        return [...prev, {
          id: userId,
          name: username,
          avatar: emojiToSend,
          character: emojiToSend,
          totalScore: 0,
          currentRoundScore: 0,
          isInside: true,
          isAI: false,
          ability: ''
        }];
      }
      return prev;
    });
    
    // Отправляем выбор персонажа на сервер
    const success = selectCharacter(emojiToSend);
    if (!success) {
      console.warn('Failed to select character - WebSocket not connected');
    }
  };

  const startGame = () => {
    if (players.length === 0) return;
    // Проверяем что это создатель комнаты
    if (remoteRoomState?.createdBy !== userId) {
      console.warn('Only room creator can start game');
      return;
    }
    
    // ✅ СРАЗУ переходим в EXPEDITION (как в рабочей версии cavetest)
    console.log('🎮 Starting game - transitioning to EXPEDITION');
    setDeck([...INITIAL_DECK].sort(() => Math.random() - 0.5));
    setRound({ number: 1, revealedCards: [], activeHazards: [] });
    setGameState(GameState.EXPEDITION);
    
    // Отправляем команду на сервер (асинхронно, не ждём ответ)
    wsStartGame();
  };

  // --- GAMEPLAY LOGIC ---
  const handleDig = (x: number, y: number) => {
    if (isProcessing || gameState !== GameState.EXPEDITION) return;
    setIsProcessing(true);

    // ===== ИЗМЕНЕНИЕ: Отправляем действие на сервер вместо локального обновления =====
    const success = sendPlayerAction('dig', { x, y });
    
    if (!success) {
      console.warn('Failed to send dig action');
      setIsProcessing(false);
      return;
    }
    
    // Показываем анимацию ожидания
    setTimeout(() => {
      setIsProcessing(false);
      shaftEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 600);
  };

  const submitDecision = (playerId: string, choice: 'stay' | 'leave') => {
    // Проверка: только текущий игрок может голосовать за себя
    if (playerId !== userId) {
      console.warn('Cannot vote for another player');
      return;
    }

    // ===== ИЗМЕНЕНИЕ: Отправляем решение на сервер =====
    const success = sendPlayerAction('submit_decision', { choice });
    
    if (!success) {
      console.warn('Failed to send decision');
      return;
    }
    
    // Обновляем локальное состояние для UI
    const newDecisions = { ...pendingDecisions, [playerId]: choice };
    setPendingDecisions(newDecisions);
    
    console.log('Decision sent to server:', { playerId, choice });
    
    // ✅ Переходим к следующему игроку (не управляем фазами, сервер скажет когда все проголосовали)
    setDecisionPlayerIndex(prev => prev + 1);
  };

  const triggerReveal = (decisions: Record<string, 'stay' | 'leave'>) => {
    setIsRevealing(true);
    // Драматическая задержка перед раскрытием всех выборов (симуляция сетевого ожидания)
    setTimeout(() => {
      processDecisions(decisions);
      setTimeout(() => setIsRevealing(false), 1000); // Показываем выбор 1 секунду
    }, 1500);
  };

  const processDecisions = (decisions: Record<string, 'stay' | 'leave'>) => {
    let updatedPlayers = [...players];
    const leavers = updatedPlayers.filter(p => p.isInside && decisions[p.id] === 'leave');
    
    if (leavers.length > 0) {
      const floorGems = round.revealedCards.reduce((acc, c) => acc + (c.remainder || 0), 0);
      const floorShare = Math.floor(floorGems / leavers.length);
      
      updatedPlayers = updatedPlayers.map(p => {
        if (p.isInside && decisions[p.id] === 'leave') {
          return { ...p, totalScore: p.totalScore + p.currentRoundScore + floorShare, currentRoundScore: 0, isInside: false };
        }
        return p;
      });

      setRound(prev => ({ ...prev, revealedCards: prev.revealedCards.map(c => ({ ...c, remainder: 0 })) }));
    }

    setPlayers(updatedPlayers);
    const anyoneLeft = updatedPlayers.some(p => p.isInside);

    if (!anyoneLeft) {
      setGameState(GameState.ROUND_END);
    } else {
      setGameState(GameState.EXPEDITION);
    }
    setPendingDecisions({});
  };

  const getValidMoves = useCallback(() => {
    if (round.revealedCards.length === 0) return [0, 1, 2, 3].map(x => ({ x, y: 0 }));
    const last = round.revealedCards[round.revealedCards.length - 1];
    const moves = [{ x: last.x!, y: last.y! + 1 }];
    if (last.x! > 0) moves.push({ x: last.x! - 1, y: last.y! });
    if (last.x! < GRID_WIDTH - 1) moves.push({ x: last.x! + 1, y: last.y! });
    return moves.filter(m => !round.revealedCards.some(rc => rc.x === m.x && rc.y === m.y));
  }, [round.revealedCards]);

  const nextRound = () => {
    if (round.number >= TOTAL_ROUNDS) {
      setGameState(GameState.GAME_OVER);
    } else {
      // ===== ИЗМЕНЕНИЕ: Отправляем на сервер вместо локального обновления =====
      const success = sendPlayerAction('next_round', {});
      
      if (!success) {
        console.warn('Failed to send next_round action');
        return;
      }
      
      // Обновляем локальное состояние
      setRound({ number: round.number + 1, revealedCards: [], activeHazards: [] });
      setPlayers(prev => prev.map(p => ({ ...p, isInside: true, currentRoundScore: 0 })));
      setGameState(GameState.EXPEDITION);
    }
  };

  const restartGame = () => {
    setPlayers([]);
    setGameState(GameState.LOBBY);
  };

  // --- RENDERERS ---

  if (gameState === GameState.LOBBY) {
    const isCreator = remoteRoomState?.createdBy === userId;
    const allPlayersReady = players.length >= 2 && players.every(p => p.character || p.avatar);
    
    return (
      <div className="h-screen flex flex-col items-center justify-center p-8 shaft-gradient text-center overflow-hidden">
        <div className="mb-4 bg-amber-500/10 border border-amber-500/20 px-4 py-1 rounded-full text-amber-500 text-[10px] font-black tracking-[0.2em] shadow-glow flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
          ROOM: {roomCode} • YOU: {userId.substring(0, 8)}
        </div>

        {wsError && (
          <div className="mb-4 bg-red-500/20 border border-red-500/50 px-4 py-2 rounded-full text-red-400 text-[10px] font-black">
            ⚠️ {wsError}
          </div>
        )}

        <h1 className="text-5xl font-cinzel text-amber-500 font-black mb-2 drop-shadow-glow">CAVE OF GREED</h1>
        <p className="text-stone-500 text-[10px] mb-8 uppercase tracking-[0.3em] font-bold">🌍 Online Multiplayer • {wsConnected ? '🟢 Connected' : '🔴 Connecting...'}</p>
        
        <div className="w-full max-w-sm bg-stone-900/40 p-6 rounded-[2.5rem] border border-stone-800/50 backdrop-blur-md mb-8 shadow-2xl relative">
          <div className="flex justify-between items-center mb-6 px-2">
            <h2 className="text-stone-400 font-black text-[10px] uppercase tracking-widest">Connected Explorers ({players.length}/{MAX_PLAYERS})</h2>
            {isCreator && players.length > 0 && (
              <button 
                onClick={() => {
                  setPlayers([]);
                  leaveRoom();
                }} 
                className="text-red-500/60 text-[10px] font-black uppercase hover:text-red-500 transition"
              >
                Reset
              </button>
            )}
          </div>
          
          <div className="flex flex-wrap justify-center gap-3 mb-8 min-h-[80px] bg-stone-950/30 p-4 rounded-3xl border border-stone-800/30">
            {players.map((p, idx) => (
              <div key={p.id} className="text-4xl animate-in zoom-in spin-in-6 transition-transform hover:scale-110 relative group">
                {p.avatar}
                {isCreator && idx === 0 && <span className="absolute -top-3 -right-3 text-lg">👑</span>}
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-stone-950 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-stone-800 px-2 py-1 rounded text-[10px] font-black text-stone-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none">
                  {p.name}
                </div>
              </div>
            ))}
            {players.length === 0 && <div className="text-stone-700 text-[10px] font-black uppercase tracking-widest py-6 italic">Waiting for explorers...</div>}
          </div>

          {wsConnected && (
            <div className="grid grid-cols-4 gap-3 max-h-[260px] overflow-y-auto pr-2 custom-scrollbar">
              {AVAILABLE_EMOJIS.map(emoji => {
                const isSelectedByOthers = players.some(p => p.avatar === emoji && p.id !== userId);
                const isSelectedByMe = players.find(p => p.id === userId)?.avatar === emoji;
                return (
                  <button
                    key={emoji}
                    disabled={!isSelectedByMe && isSelectedByOthers}
                    onClick={() => togglePlayer(emoji)}
                    className={`text-3xl p-3 rounded-2xl transition-all duration-300 transform ${
                      isSelectedByMe 
                      ? 'bg-amber-500 border-2 border-amber-300 scale-110 -rotate-3 shadow-glow' 
                      : isSelectedByOthers
                      ? 'bg-stone-900/50 border border-stone-800/30 opacity-20'
                      : 'bg-stone-900/50 border border-stone-800 hover:bg-stone-800 opacity-40 hover:opacity-100'
                    }`}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button 
          disabled={!wsConnected || players.length < 2 || !allPlayersReady || !isCreator}
          onClick={startGame}
          className="w-full max-w-sm py-6 bg-gradient-to-r from-amber-400 to-amber-600 text-black font-black rounded-full text-xl shadow-[0_10px_40px_rgba(245,158,11,0.4)] disabled:opacity-20 disabled:cursor-not-allowed transition-all active:scale-95 uppercase tracking-widest"
          title={
            !wsConnected ? 'Connecting to server...' :
            players.length < 2 ? 'Need 2+ Players' :
            !isCreator ? 'Only room creator can start' :
            'Begin Descent'
          }
        >
          {!wsConnected ? 'Connecting...' : players.length < 2 ? 'Need 2+ Players' : !isCreator ? 'Waiting for creator...' : 'Begin Descent'}
        </button>

        {isCreator && (
          <p className="text-stone-500 text-[10px] mt-4 uppercase tracking-wider">
            You are the room creator
          </p>
        )}
      </div>
    );
  }

  if (gameState === GameState.GAME_OVER && round.number >= TOTAL_ROUNDS) {
    const sorted = [...players].sort((a, b) => b.totalScore - a.totalScore);
    return (
      <div className="h-screen flex flex-col items-center justify-center p-8 shaft-gradient text-center overflow-y-auto">
        <div className="text-5xl mb-4">👑</div>
        <h1 className="text-4xl font-cinzel text-amber-500 font-black mb-8 drop-shadow-glow">EXPEDITION LOG</h1>
        <div className="w-full max-w-sm bg-stone-900/80 rounded-[2.5rem] p-6 border border-stone-700 space-y-4 mb-8 backdrop-blur-md shadow-2xl">
          {sorted.map((p, i) => (
            <div key={p.id} className="flex items-center justify-between border-b border-stone-800 pb-4 last:border-0 last:pb-0">
              <div className="flex items-center gap-4">
                <span className={`font-black italic w-6 ${i === 0 ? 'text-amber-500 scale-125' : 'text-stone-500'}`}>{i + 1}</span>
                <span className="text-4xl">{p.avatar}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className={`text-2xl font-black ${i === 0 ? 'text-amber-400' : 'text-stone-100'}`}>💎 {p.totalScore}</span>
              </div>
            </div>
          ))}
        </div>
        <button onClick={restartGame} className="w-full max-w-sm py-5 bg-white text-black font-black rounded-3xl uppercase tracking-widest shadow-2xl active:scale-95 transition-all">New Campaign</button>
      </div>
    );
  }

  const currentMaxY = round.revealedCards.length > 0 ? Math.max(...round.revealedCards.map(c => c.y || 0)) : -1;
  const nextDeciderId = Object.keys(pendingDecisions).find(id => pendingDecisions[id] === null);
  const nextDecider = players.find(p => p.id === nextDeciderId);

  return (
    <div className="h-screen flex flex-col bg-[#0c0a09] font-inter overflow-hidden select-none">
      {/* HUD */}
      <div className="p-4 pt-8 border-b border-stone-800 bg-stone-950/95 z-40 backdrop-blur-xl">
        <div className="flex justify-between items-center max-w-md mx-auto">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className={`w-3 h-6 rounded-full transition-all duration-700 ${i <= round.number ? 'bg-amber-500 shadow-glow scale-y-110' : 'bg-stone-800'}`} />
            ))}
          </div>
          <div className="flex flex-col items-end">
             <div className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Shaft Progress</div>
             <div className="text-amber-500 font-black text-sm">LEVEL {round.number}</div>
          </div>
        </div>
      </div>

      {/* Grid Shaft */}
      <div className="flex-1 overflow-y-auto p-4 shaft-gradient relative scroll-smooth custom-scrollbar pb-32">
        <div className="relative w-full mx-auto max-w-md" style={{ height: `${(currentMaxY + 2) * 90}px` }}>
          {round.revealedCards.map((c, i) => (
            <DugTile key={i} card={c} />
          ))}

          {gameState === GameState.EXPEDITION && !isProcessing && !votingRequired && (
            <>
              {/* Кнопки копания показываются для всех активных игроков в пещере (кроме как когда идет голосование) */}
              {players.length > 0 && players.some(p => p.isInside && p.id === userId) && getValidMoves().map(move => (
                <button 
                  key={`${move.x}-${move.y}`}
                  onClick={() => handleDig(move.x, move.y)}
                  className="absolute w-[22%] aspect-square rounded-xl bg-amber-500/5 border-2 border-dashed border-amber-500/30 flex items-center justify-center animate-pulse z-10 hover:bg-amber-500/10 transition-colors"
                  style={{ left: `${move.x * 25 + 1.5}%`, top: `${move.y * 110}px` }}
                >
                  <span className="text-2xl opacity-40">⛏️</span>
                </button>
              ))}
            </>
          )}
          <div ref={shaftEndRef} />
        </div>
      </div>

      {/* Footer / Controls */}
      <div className="bg-stone-950 border-t border-stone-800 p-4 pb-12 z-40 shadow-[0_-20px_50px_rgba(0,0,0,0.8)]">
        {/* Status Bar */}
        <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar max-w-md mx-auto">
          {players.map(p => {
            const hasVoted = pendingDecisions[p.id] !== null;
            const isInside = p.isInside;
            return (
              <div key={p.id} className={`flex flex-col items-center min-w-[54px] transition-all duration-500 ${!isInside ? 'opacity-5 grayscale scale-75 blur-[2px]' : ''}`}>
                <div className="text-3xl relative">
                  {p.avatar}
                  {/* Show vote choice during voting */}
                  {votingRequired && isInside && pendingDecisions[p.id] !== null && !isRevealing && (
                    <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full border-2 border-stone-950 flex items-center justify-center animate-in bounce-in shadow-xl ${pendingDecisions[p.id] === 'leave' ? 'bg-red-500' : 'bg-amber-500'}`}>
                      <span className="text-[11px]">{pendingDecisions[p.id] === 'leave' ? '⛺' : '⛏️'}</span>
                    </div>
                  )}
                  {/* Reveal animation during results reveal */}
                  {isRevealing && isInside && finalDecisions && (
                    <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full border-2 border-stone-950 flex items-center justify-center animate-in bounce-in shadow-xl ${finalDecisions[p.id] === 'leave' ? 'bg-red-500' : 'bg-amber-500'}`}>
                      <span className="text-[11px]">{finalDecisions[p.id] === 'leave' ? '⛺' : '⛏️'}</span>
                    </div>
                  )}
                </div>
                <div className="text-[10px] font-black text-stone-400 mt-1 flex items-center gap-0.5">
                  <span className="text-amber-500/50">💎</span>{p.currentRoundScore}
                </div>
              </div>
            );
          })}
        </div>

        <div className="max-w-md mx-auto h-[170px] flex items-center justify-center">
          {isRevealing ? (
            <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin shadow-glow" />
                <div className="absolute inset-0 flex items-center justify-center font-black text-amber-500 text-xs">READY</div>
              </div>
              <div className="text-amber-500 font-black text-[10px] uppercase tracking-[0.4em] animate-pulse">Syncing Choices...</div>
            </div>
          ) : gameState === GameState.EXPEDITION && votingRequired && players.some(p => p.isInside) ? (
            // ✅ НОВОЕ: Кнопки выбора "Stay In / Go Back" в EXPEDITION режиме (только после открытия карты)
            <div className="w-full bg-stone-900 rounded-[2.5rem] p-6 border border-stone-800 animate-in slide-in-from-bottom-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
              <div className="flex flex-col items-center gap-4">
                <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Continue or Retreat?</span>
                <div className="text-[8px] text-stone-500 mb-2">Your decision: {pendingDecisions[userId] ?? 'Not yet'}</div>
                <div className="flex gap-4 w-full">
                  <button 
                    onClick={() => {
                      console.log('🗳️ Stay clicked, userId:', userId, 'current decision:', pendingDecisions[userId]);
                      submitDecision(userId, 'stay');
                    }}
                    disabled={pendingDecisions[userId] !== null}
                    className="flex-1 py-4 bg-amber-500 text-black font-black rounded-3xl shadow-glow active:scale-95 transition-all text-xs uppercase tracking-widest border-b-4 border-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Stay In ⛏️
                  </button>
                  <button 
                    onClick={() => {
                      console.log('🗳️ Leave clicked, userId:', userId, 'current decision:', pendingDecisions[userId]);
                      submitDecision(userId, 'leave');
                    }}
                    disabled={pendingDecisions[userId] !== null}
                    className="flex-1 py-4 bg-stone-800 text-white font-black rounded-3xl border-2 border-stone-700 active:scale-95 transition-all text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Go Back ⛺
                  </button>
                </div>
              </div>
            </div>
          ) : gameState === GameState.DECISION_PHASE && nextDecider ? (
            <div className="w-full bg-stone-900 rounded-[2.5rem] p-6 border border-stone-800 animate-in slide-in-from-bottom-6 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
              <div className="flex flex-col items-center gap-6">
                <div className="flex flex-col items-center">
                  <div className="text-7xl mb-2 drop-shadow-glow animate-bounce">{nextDecider.avatar}</div>
                  <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                    {nextDecider.id === userId ? 'Your Choice' : `${nextDecider.name} Deciding...`}
                  </span>
                </div>
                {nextDecider.id === userId && (
                  <div className="flex gap-4 w-full">
                    <button 
                      onClick={() => submitDecision(nextDecider.id, 'stay')}
                      className="flex-1 py-5 bg-amber-500 text-black font-black rounded-3xl shadow-glow active:scale-95 transition-all text-xs uppercase tracking-widest border-b-4 border-amber-700"
                    >
                      Stay In ⛏️
                    </button>
                    <button 
                      onClick={() => submitDecision(nextDecider.id, 'leave')}
                      className="flex-1 py-5 bg-stone-800 text-white font-black rounded-3xl border-2 border-stone-700 active:scale-95 transition-all text-xs uppercase tracking-widest"
                    >
                      Go Back ⛺
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : gameState === GameState.RESULTS_PHASE && finalDecisions ? (
            <div className="w-full bg-stone-900 rounded-[2.5rem] p-6 border border-stone-800 animate-in slide-in-from-bottom-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
              <div className="flex flex-col items-center gap-6">
                <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Decisions Made</span>
                <div className="flex flex-col gap-3 w-full max-w-sm">
                  {players.filter(p => p.isInside).map(p => (
                    <div key={p.id} className="flex items-center justify-between bg-stone-800/50 rounded-2xl p-3 border border-stone-700">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{p.avatar}</span>
                        <div>
                          <span className="text-xs font-black text-stone-300">{p.name}</span>
                        </div>
                      </div>
                      <span className={`text-lg font-black px-3 py-2 rounded-lg ${
                        finalDecisions[p.id] === 'leave' 
                          ? 'bg-red-500/30 text-red-300' 
                          : 'bg-amber-500/30 text-amber-300'
                      }`}>
                        {finalDecisions[p.id] === 'leave' ? '⛺ Leave' : '⛏️ Stay'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : gameState === GameState.ROUND_END ? (
            <button 
              onClick={nextRound}
              className="w-full py-6 bg-blue-600 text-white font-black rounded-full shadow-[0_10px_30px_rgba(37,99,235,0.4)] active:scale-95 transition-all uppercase tracking-[0.2em] text-xs border-b-4 border-blue-800"
            >
              {round.number >= TOTAL_ROUNDS ? 'Finish Expedition' : `Deeper into Shaft ${round.number + 1}`}
            </button>
          ) : (
             <div className="flex flex-col items-center gap-2">
                <div className="text-stone-700 text-[10px] font-black uppercase tracking-[0.6em] animate-pulse">
                  {isProcessing ? 'Mining Strata' : 'Waiting for Leader'}
                </div>
                {!isProcessing && <div className="text-[10px] text-stone-800 uppercase font-bold">Room: {roomCode}</div>}
             </div>
          )}
        </div>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
        .shadow-glow { box-shadow: 0 0 20px rgba(245, 158, 11, 0.4); }
        .drop-shadow-glow { filter: drop-shadow(0 0 12px rgba(245, 158, 11, 0.5)); }
        
        @keyframes bounce-in {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-in.bounce-in { animation: bounce-in 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
      `}</style>
    </div>
  );
}
