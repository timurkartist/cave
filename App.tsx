import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GameState, Player, GameCard, CardType } from './types';
import { HAZARD_ICONS } from './constants';
import { useGameWebSocket } from './hooks/useGameWebSocket';

const GRID_WIDTH = 4;
const TOTAL_ROUNDS = 5;
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
      style={{ left: `${xPos + 1.5}%`, top: `${(card.y || 0) * 90}px` }}
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

const ShaftGrid: React.FC<{ maxY: number }> = ({ maxY }) => {
  const rows = Math.max(8, maxY + 3);
  return (
    <div className="absolute inset-0 w-full">
      {Array.from({ length: rows }).map((_, y) => (
        <div key={y} className="flex w-full" style={{ height: '90px' }}>
          {Array.from({ length: GRID_WIDTH }).map((_, x) => (
            <div
              key={`${x}-${y}`}
              className="flex-1 border border-stone-800/40 rounded-lg m-[1.5%] bg-stone-950/30 transition-colors hover:bg-stone-900/40"
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export default function App() {
  const [roomCode, setRoomCode] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [selectedCharacter, setSelectedCharacter] = useState<string>('');
  const [isRevealing, setIsRevealing] = useState(false);
  const [nextRoundClicked, setNextRoundClicked] = useState(false); // Локальная блокировка повторных клик
  const [newGameClicked, setNewGameClicked] = useState(false); // Локальная блокировка повторных клик на "New Game"

  const shaftEndRef = useRef<HTMLDivElement>(null);

  // ===== WEBSOCKET HOOK =====
  const { roomState, connected, selectCharacter, startGame: wsStartGame, sendPlayerAction } = useGameWebSocket(
    roomCode,
    userId,
    username
  );

  // ===== ИНИЦИАЛИЗАЦИЯ USER ID / ROOM CODE ИЗ URL =====
  useEffect(() => {
    if (typeof window !== 'undefined') {
      let roomIdValue: string | null = null;
      let userIdValue: string | null = null;
      let usernameValue: string | null = null;

      // Приоритет 1: Query string параметры (?roomId=...) - теперь главный источник
      const urlParams = new URLSearchParams(window.location.search);
      roomIdValue = urlParams.get('roomId');

      // Приоритет 2: Fallback на hash (#roomId=...) для обратной совместимости
      if (!roomIdValue) {
        const hash = window.location.hash.substring(1); // Удаляем #
        const hashParams = new URLSearchParams(hash);
        roomIdValue = hashParams.get('roomId');
      }

      userIdValue = urlParams.get('userId');
      usernameValue = urlParams.get('username');

      // Генерируем если нет
      if (!userIdValue) {
        userIdValue = `user-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        usernameValue = `Player_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      }

      if (!roomIdValue) {
        roomIdValue = `room-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      }

      setRoomCode(roomIdValue);
      setUserId(userIdValue);
      setUsername(usernameValue);

      // Сохраняем в sessionStorage как backup
      sessionStorage.setItem('roomId', roomIdValue);
      sessionStorage.setItem('userId', userIdValue);
      sessionStorage.setItem('username', usernameValue);
    }
  }, []);

  // ===== ПРАВИЛЬНОЕ МАППИРОВАНИЕ СОСТОЯНИЯ =====
  const phase = roomState?.phase ?? 'LOBBY';
  const gameRound = roomState?.round ?? 1;
  const players = roomState?.players ?? [];
  const revealedCards = roomState?.revealedCards ?? [];
  const pathGems = roomState?.pathGems ?? 0;
  const currentDecisions = roomState?.currentDecisions ?? {};
  const decisionsResult = roomState?.decisionsResult ?? null;
  const nextRoundAcks = roomState?.nextRoundAcks ?? {};
  const newGameAcks = roomState?.newGameAcks ?? {};
  const createdBy = roomState?.createdBy;
  const currentTurnUserId = roomState?.currentTurnUserId ?? null;
  const playerOrder = roomState?.playerOrder ?? [];

  const isCreator = createdBy === userId;
  const allCharactersSelected = players.every((p: any) => p.character != null && p.character !== '');
  const me = players.find((p: any) => p.userId === userId);
  const canStart = selectedCharacter && connected && isCreator && phase === 'LOBBY' && allCharactersSelected && players.length >= 2;
  const isMyTurn = currentTurnUserId === userId;

  // Очищаем локальный флаг когда выходим из ROUND_END
  useEffect(() => {
    if (phase !== 'ROUND_END') {
      setNextRoundClicked(false);
    }
  }, [phase]);

  // Очищаем локальный флаг когда выходим из GAME_OVER
  useEffect(() => {
    if (phase !== 'GAME_OVER') {
      setNewGameClicked(false);
    }
  }, [phase]);

  // ===== ОБРАБОТЧИКИ =====
  const handleStartGame = () => {
    if (canStart) {
      wsStartGame();
    }
  };

  const handleDig = (x: number, y: number) => {
    if (phase === 'EXPEDITION' && me?.isInside && isMyTurn) {
      sendPlayerAction('dig', { x, y });
    }
  };

  const handleVote = (choice: 'stay' | 'leave') => {
    if (phase === 'VOTING' && me?.isInside) {
      sendPlayerAction('submit_decision', { choice });
    }
  };

  const getValidMoves = useCallback(() => {
    if (revealedCards.length === 0) return [0, 1, 2, 3].map(x => ({ x, y: 0 }));
    const last = revealedCards[revealedCards.length - 1];
    const moves = [];
    
    // Down
    moves.push({ x: last.x!, y: last.y! + 1 });
    // Up
    if (last.y! > 0) moves.push({ x: last.x!, y: last.y! - 1 });
    // Left
    if (last.x! > 0) moves.push({ x: last.x! - 1, y: last.y! });
    // Right
    if (last.x! < GRID_WIDTH - 1) moves.push({ x: last.x! + 1, y: last.y! });
    
    return moves.filter(m => !revealedCards.some((rc: any) => rc.x === m.x && rc.y === m.y));
  }, [revealedCards]);

  const currentMaxY = Math.max(0, ...revealedCards.map((c: any) => c.y ?? 0));

  // ===== ФАЗА ЛОББИ =====
  if (phase === 'LOBBY') {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-8 shaft-gradient text-center overflow-hidden">
        <div className="mb-4 bg-amber-500/10 border border-amber-500/20 px-4 py-1 rounded-full text-amber-500 text-[10px] font-black tracking-[0.2em] shadow-glow">
          SESSION ID: {roomCode}
        </div>
        <h1 className="text-5xl font-cinzel text-amber-500 font-black mb-2 drop-shadow-glow">CAVE OF GREED</h1>
        <p className="text-stone-500 text-[10px] mb-8 uppercase tracking-[0.3em] font-bold">Online Multiplayer Hub</p>

        <div className="w-full max-w-sm bg-stone-900/40 p-6 rounded-[2.5rem] border border-stone-800/50 backdrop-blur-md mb-8 shadow-2xl relative">
          <div className="flex justify-between items-center mb-6 px-2">
            <h2 className="text-stone-400 font-black text-[10px] uppercase tracking-widest">Connect Explorers ({players.length})</h2>
            {connected && <div className="text-green-500 text-[10px] font-black">🟢 LIVE</div>}
          </div>

          <div className="flex flex-wrap justify-center gap-3 mb-8 min-h-[60px] bg-stone-950/30 p-4 rounded-3xl border border-stone-800/30">
            {players.map((p: any) => (
              <div key={p.userId} className="text-4xl animate-in zoom-in spin-in-6 transition-transform hover:scale-110 relative group">
                {p.character || '❓'}
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-stone-950 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
              </div>
            ))}
            {players.length === 0 && <div className="text-stone-700 text-[10px] font-black uppercase tracking-widest py-4 italic">Empty Chamber...</div>}
          </div>

          <div className="grid grid-cols-4 gap-3 max-h-[260px] overflow-y-auto pr-2 custom-scrollbar">
            {AVAILABLE_EMOJIS.map(emoji => {
              const isSelected = selectedCharacter === emoji;
              return (
                <button
                  key={emoji}
                  onClick={() => {
                    setSelectedCharacter(emoji);
                    selectCharacter(emoji);
                  }}
                  className={`text-3xl p-3 rounded-2xl transition-all duration-300 transform ${
                    isSelected
                      ? 'bg-amber-500 border-2 border-amber-300 scale-110 -rotate-3 shadow-glow'
                      : 'bg-stone-900/50 border border-stone-800 hover:bg-stone-800 opacity-40 hover:opacity-100'
                  }`}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
        </div>

        <button
          disabled={!canStart}
          onClick={handleStartGame}
          className="w-full max-w-sm py-6 bg-gradient-to-r from-amber-400 to-amber-600 text-black font-black rounded-full text-xl shadow-[0_10px_40px_rgba(245,158,11,0.4)] disabled:opacity-20 transition-all active:scale-95 uppercase tracking-widest"
        >
          {!connected ? '🔄 Connecting...' : !isCreator ? '⏳ Waiting...' : !allCharactersSelected ? '👥 Waiting...' : 'Begin Descent'}
        </button>
      </div>
    );
  }

  if (phase === 'GAME_OVER') {
    const sorted = [...players].sort((a: any, b: any) => b.bankedTotal - a.bankedTotal);
    return (
      <div className="h-screen flex flex-col items-center justify-center p-8 shaft-gradient text-center overflow-y-auto">
        <div className="text-5xl mb-4">⛏️</div>
        <h1 className="text-4xl font-cinzel text-amber-500 font-black mb-8 drop-shadow-glow">EXPEDITION LOG</h1>
        <div className="w-full max-w-sm bg-stone-900/80 rounded-[2.5rem] p-6 border border-stone-700 space-y-4 mb-8 backdrop-blur-md shadow-2xl">
          {sorted.map((p: any, i: number) => (
            <div key={p.userId} className="flex items-center justify-between border-b border-stone-800 pb-4 last:border-0 last:pb-0">
              <div className="flex items-center gap-4">
                <span className={`font-black italic w-6 ${i === 0 ? 'text-amber-500 scale-125' : 'text-stone-500'}`}>{i + 1}</span>
                <span className="text-4xl">{p.character}</span>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`text-2xl font-black ${i === 0 ? 'text-amber-400' : 'text-stone-100'}`}>💎 {p.bankedTotal}</span>
                {newGameAcks[p.userId] && <span className="text-lg">✓ Ready</span>}
              </div>
            </div>
          ))}
        </div>
        <button 
          onClick={() => {
            setNewGameClicked(true);
            sendPlayerAction('new_game', {});
          }}
          disabled={newGameClicked}
          className="w-full max-w-sm py-5 bg-white text-black font-black rounded-3xl uppercase tracking-widest shadow-2xl active:scale-95 transition-all disabled:opacity-60"
        >
          {newGameClicked ? '✓ Ready' : 'New Campaign'}
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#0c0a09] font-inter overflow-hidden select-none pb-32">
      {/* HUD */}
      <div className="p-4 pt-8 border-b border-stone-800 bg-stone-950/95 z-40 backdrop-blur-xl">
        <div className="flex justify-between items-center max-w-md mx-auto">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className={`w-3 h-6 rounded-full transition-all duration-700 ${i <= gameRound ? 'bg-amber-500 shadow-glow scale-y-110' : 'bg-stone-800'}`} />
            ))}
          </div>
          <div className="flex flex-col items-end">
            <div className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Shaft Progress</div>
            <div className="text-amber-500 font-black text-sm">LEVEL {gameRound}</div>
          </div>
        </div>
      </div>

      {/* Grid Shaft */}
      <div className="flex-1 overflow-y-auto p-4 shaft-gradient relative scroll-smooth custom-scrollbar pb-32">
        {/* Turn Indicator */}
        {phase === 'EXPEDITION' && (
          <div className="max-w-md mx-auto mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-center">
            <div className="text-[10px] text-stone-400 uppercase tracking-widest font-black mb-1">Current Turn</div>
            <div className="flex items-center justify-center gap-2">
              {currentTurnUserId && playerOrder.length > 0 && (
                <>
                  <span className="text-2xl">
                    {players.find((p: any) => p.userId === currentTurnUserId)?.character || '❓'}
                  </span>
                  <div className="flex-1">
                    <div className="text-stone-300 font-bold text-sm">
                      {isMyTurn ? (
                        <span className="text-amber-400 animate-pulse">YOUR TURN ⛏️</span>
                      ) : (
                        <span className="text-stone-400">{players.find((p: any) => p.userId === currentTurnUserId)?.username || 'Player'}</span>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <div className="relative w-full mx-auto max-w-md" style={{ height: `${(currentMaxY + 2) * 90}px` }}>
          {/* Background Grid */}
          <ShaftGrid maxY={currentMaxY} />

          {/* Revealed Cards */}
          <div className="relative z-20">
            {revealedCards.map((c, i) => (
              <DugTile key={i} card={c} />
            ))}
          </div>

          {/* Dig Buttons - only for current turn player */}
          {phase === 'EXPEDITION' && me?.isInside && !me?.isWaiting && isMyTurn && (
            <>
              {getValidMoves().map(move => (
                <button
                  key={`${move.x}-${move.y}`}
                  onClick={() => handleDig(move.x, move.y)}
                  className="absolute w-[22%] aspect-square rounded-xl bg-amber-500/5 border-2 border-dashed border-amber-500/30 flex items-center justify-center animate-pulse z-30 hover:bg-amber-500/10 transition-colors"
                  style={{ left: `${move.x * 25 + 1.5}%`, top: `${move.y * 90}px` }}
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
      <div className="fixed bottom-0 left-0 right-0 bg-stone-950 border-t border-stone-800 p-2 pb-4 z-40 shadow-[0_-20px_50px_rgba(0,0,0,0.8)]">
        {/* Path Gems Display */}
        {phase === 'EXPEDITION' && pathGems > 0 && (
          <div className="text-center text-amber-500 font-black text-sm mb-2">🏆 Gems on Path: {pathGems}</div>
        )}

        {/* Status Bar - Players Info (moved to top) */}
        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar max-w-md mx-auto border-b border-stone-800 mb-2">
          {players.map(p => {
            const hasVoted = currentDecisions[p.userId] !== null;
            const isInside = p.isInside;
            return (
              <div key={p.userId} className={`flex flex-col items-center min-w-[54px] transition-all duration-500 ${!isInside ? 'opacity-5 grayscale scale-75 blur-[2px]' : ''}`}>
                <div className="text-3xl relative">
                  {p.character}
                  {/* Ready Tick (Hidden choice) */}
                  {phase === 'VOTING' && isInside && hasVoted && !isRevealing && (
                    <div className="absolute -top-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-stone-950 flex items-center justify-center animate-in zoom-in shadow-lg">
                      <span className="text-[10px] text-black font-black">✓</span>
                    </div>
                  )}
                  {/* Reveal Indicator */}
                  {isRevealing && isInside && (
                    <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full border-2 border-stone-950 flex items-center justify-center animate-in bounce-in shadow-xl ${currentDecisions[p.userId] === 'leave' ? 'bg-red-500' : 'bg-amber-500'}`}>
                      <span className="text-[11px]">{currentDecisions[p.userId] === 'leave' ? '⛺' : '⛏️'}</span>
                    </div>
                  )}
                </div>
                <div className="text-[9px] font-black text-stone-400 mt-1 text-center">
                  <div className="text-amber-500">💎{p.bankedTotal}</div>
                  {isInside && <div className="text-blue-400 text-[8px]">+{p.roundStash}</div>}
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
          ) : phase === 'VOTING' ? (
            <div className="w-full bg-stone-900 rounded-[2.5rem] p-6 border border-stone-800 animate-in slide-in-from-bottom-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
              
              {/* Только текущий игрок видит кнопки если ещё не голосовал */}
              {me?.isInside && currentDecisions[userId] === null ? (
                <div className="flex flex-col items-center gap-6">
                  <div className="flex flex-col items-center">
                    <div className="text-7xl mb-2 drop-shadow-glow animate-bounce">{me.character}</div>
                    <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Your Secret Choice</span>
                  </div>
                  <div className="flex gap-4 w-full">
                    <button
                      onClick={() => handleVote('stay')}
                      className="flex-1 py-5 bg-amber-500 text-black font-black rounded-3xl shadow-glow active:scale-95 transition-all text-xs uppercase tracking-widest border-b-4 border-amber-700"
                    >
                      Stay In ⛏️
                    </button>
                    <button
                      onClick={() => handleVote('leave')}
                      className="flex-1 py-5 bg-stone-800 text-white font-black rounded-3xl border-2 border-stone-700 active:scale-95 transition-all text-xs uppercase tracking-widest"
                    >
                      Go Back ⛺
                    </button>
                  </div>
                </div>
              ) : (
                /* Остальные видят "Waiting for X" */
                <div className="flex flex-col items-center gap-4">
                  <div className="text-stone-500 text-[10px] font-black uppercase tracking-widest">Waiting for decision...</div>
                  {players
                    .filter((p: any) => p.isInside && currentDecisions[p.userId] === null)
                    .map((p: any) => (
                      <div key={p.userId} className="flex flex-col items-center gap-2">
                        <div className="text-5xl animate-pulse">{p.character}</div>
                        <div className="text-[9px] text-stone-400">{p.username}</div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          ) : phase === 'RESULTS' ? (
            <div className="w-full bg-stone-900 rounded-[2.5rem] p-6 border border-stone-800 animate-in slide-in-from-bottom-6 shadow-2xl overflow-auto max-h-[140px]">
              <div className="flex flex-col gap-3">
                {decisionsResult?.leaversGemsData && Object.entries(decisionsResult.leaversGemsData).map(([userId, gemsData]: any) => {
                  const player = players.find((p: any) => p.userId === userId);
                  return (
                    <div key={userId} className="flex items-center gap-3 text-[10px] font-black uppercase">
                      <span className="text-2xl">{player?.character}</span>
                      <span className="text-stone-400">{player?.username}</span>
                      <span className="ml-auto text-green-400">+{gemsData.total} 💎</span>
                      <span className="text-[8px] text-stone-500">(+{gemsData.roundStash} direct, +{gemsData.pathShare} shared)</span>
                    </div>
                  );
                })}
                {decisionsResult?.leavers && players
                  .filter((p: any) => p.isInside && !decisionsResult.leavers.includes(p.userId))
                  .map((p: any) => (
                    <div key={p.userId} className="flex items-center gap-3 text-[10px] font-black uppercase">
                      <span className="text-2xl">{p.character}</span>
                      <span className="text-stone-400">{p.username}</span>
                      <span className="ml-auto text-amber-500">Continuing...</span>
                    </div>
                  ))}
              </div>
            </div>
          ) : phase === 'ROUND_END' ? (
            <div className="flex flex-col items-center gap-4">
              <button
                onClick={() => {
                  setNextRoundClicked(true);
                  sendPlayerAction('next_round', {});
                }}
                disabled={nextRoundClicked}
                className={`w-full py-6 text-white font-black rounded-full shadow-[0_10px_30px_rgba(37,99,235,0.4)] active:scale-95 transition-all uppercase tracking-[0.2em] text-xs border-b-4 ${
                  nextRoundClicked
                    ? 'bg-green-600 border-green-800 cursor-not-allowed'
                    : 'bg-blue-600 border-blue-800 hover:bg-blue-700'
                }`}
              >
                {nextRoundClicked ? '✓ Ready' : gameRound >= TOTAL_ROUNDS ? 'Finish Expedition' : `Deeper into Shaft ${gameRound + 1}`}
              </button>
              
              {/* Статус других игроков */}
              <div className="flex flex-col gap-2 w-full text-center">
                {players.map(p => (
                  <div key={p.userId} className={`text-[10px] font-black uppercase transition-all ${nextRoundAcks[p.userId] ? 'text-green-400' : 'text-stone-500'}`}>
                    <span className="text-lg">{p.character}</span> {nextRoundAcks[p.userId] ? '✓ Ready' : 'Waiting...'}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="text-stone-700 text-[10px] font-black uppercase tracking-[0.6em] animate-pulse">
                {me?.isWaiting ? 'Mining Strata' : 'Waiting for Leader'}
              </div>
              {!me?.isWaiting && <div className="text-[10px] text-stone-800 uppercase font-bold">Room: {roomCode}</div>}
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
        .spin-in-6 { animation: spin-in-6 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55); }

        @keyframes bounce-in {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-in.bounce-in { animation: bounce-in 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        
        @keyframes spin-in-6 {
          0% { transform: scale(0) rotateZ(-180deg); opacity: 0; }
          100% { transform: scale(1) rotateZ(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

