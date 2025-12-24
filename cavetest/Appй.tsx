
import React, { useState, useCallback, useRef } from 'react';
import { GameState, Player, GameCard, RoundInfo, CardType } from './types';
import { INITIAL_DECK, TOTAL_ROUNDS, HAZARD_ICONS } from './constants';

const GRID_WIDTH = 4;
const MAX_PLAYERS = 10;
const AVAILABLE_EMOJIS = [
  '🤠', '🐱', '🐶', '🦊', '🐸', '🐙', '🦖', '🤖', 
  '👻', '🧙', '🥷', '🧑‍🚀', '🧛', '🧟', '🦄', '🐝',
  '🦁', '🐼', '🦀', '🦄', '🦉', '🦋', '🐥', '🐧'
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

export default function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.LOBBY);
  const [players, setPlayers] = useState<Player[]>([]);
  const [round, setRound] = useState<RoundInfo>({ number: 1, revealedCards: [], activeHazards: [] });
  const [deck, setDeck] = useState<GameCard[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingDecisions, setPendingDecisions] = useState<Record<string, 'stay' | 'leave' | null>>({});
  const [isRevealing, setIsRevealing] = useState(false);
  const [roomCode] = useState(() => Math.random().toString(36).substring(2, 8).toUpperCase());
  
  const shaftEndRef = useRef<HTMLDivElement>(null);

  // --- SETUP LOGIC ---
  const togglePlayer = (emoji: string) => {
    const existingIndex = players.findIndex(p => p.avatar === emoji);
    if (existingIndex !== -1) {
      setPlayers(players.filter((_, i) => i !== existingIndex));
      return;
    }
    if (players.length >= MAX_PLAYERS) return;
    
    const newPlayer: Player = {
      id: `p-${Date.now()}-${players.length}`,
      name: `Player ${players.length + 1}`,
      totalScore: 0,
      currentRoundScore: 0,
      isInside: true,
      isAI: false,
      avatar: emoji,
      ability: ''
    };
    setPlayers([...players, newPlayer]);
  };

  const startGame = () => {
    if (players.length === 0) return;
    setDeck([...INITIAL_DECK].sort(() => Math.random() - 0.5));
    setRound({ number: 1, revealedCards: [], activeHazards: [] });
    setGameState(GameState.EXPEDITION);
  };

  // --- GAMEPLAY LOGIC ---
  const handleDig = (x: number, y: number) => {
    if (isProcessing || gameState !== GameState.EXPEDITION) return;
    setIsProcessing(true);

    const nextCard = deck[0];
    const newDeck = deck.slice(1);
    const activeInside = players.filter(p => p.isInside);
    
    nextCard.x = x;
    nextCard.y = y;

    let roundFail = false;
    let newHazards = [...round.activeHazards];

    if (nextCard.type === CardType.HAZARD) {
      if (newHazards.includes(nextCard.hazardType!)) roundFail = true;
      newHazards.push(nextCard.hazardType!);
    } else {
      const share = Math.floor(nextCard.value! / activeInside.length);
      nextCard.remainder = (nextCard.remainder || 0) + (nextCard.value! % activeInside.length);
      setPlayers(prev => prev.map(p => p.isInside ? { ...p, currentRoundScore: p.currentRoundScore + share } : p));
    }

    setRound(prev => ({ ...prev, revealedCards: [...prev.revealedCards, nextCard], activeHazards: newHazards }));
    setDeck(newDeck);

    setTimeout(() => {
      if (roundFail) {
        setPlayers(prev => prev.map(p => p.isInside ? { ...p, currentRoundScore: 0, isInside: false } : p));
        setGameState(GameState.ROUND_END);
      } else {
        const activeIds = players.filter(p => p.isInside).reduce((acc, p) => ({ ...acc, [p.id]: null }), {});
        setPendingDecisions(activeIds);
        setGameState(GameState.DECISION_PHASE);
      }
      setIsProcessing(false);
      shaftEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 600);
  };

  const submitDecision = (playerId: string, choice: 'stay' | 'leave') => {
    const newDecisions = { ...pendingDecisions, [playerId]: choice };
    setPendingDecisions(newDecisions);

    // Если все игроки в шахте проголосовали
    if (Object.values(newDecisions).every(v => v !== null)) {
      triggerReveal(newDecisions as Record<string, 'stay' | 'leave'>);
    }
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
      setRound({ number: round.number + 1, revealedCards: [], activeHazards: [] });
      setDeck([...INITIAL_DECK].sort(() => Math.random() - 0.5));
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
    return (
      <div className="h-screen flex flex-col items-center justify-center p-8 shaft-gradient text-center overflow-hidden">
        <div className="mb-4 bg-amber-500/10 border border-amber-500/20 px-4 py-1 rounded-full text-amber-500 text-[10px] font-black tracking-[0.2em] shadow-glow">
          SESSION ID: {roomCode}
        </div>
        <h1 className="text-5xl font-cinzel text-amber-500 font-black mb-2 drop-shadow-glow">CAVE OF GREED</h1>
        <p className="text-stone-500 text-[10px] mb-8 uppercase tracking-[0.3em] font-bold">Local Multiplayer Hub</p>
        
        <div className="w-full max-w-sm bg-stone-900/40 p-6 rounded-[2.5rem] border border-stone-800/50 backdrop-blur-md mb-8 shadow-2xl relative">
          <div className="flex justify-between items-center mb-6 px-2">
            <h2 className="text-stone-400 font-black text-[10px] uppercase tracking-widest">Connect Explorers ({players.length}/{MAX_PLAYERS})</h2>
            {players.length > 0 && <button onClick={() => setPlayers([])} className="text-red-500/60 text-[10px] font-black uppercase hover:text-red-500 transition">Reset</button>}
          </div>
          
          <div className="flex flex-wrap justify-center gap-3 mb-8 min-h-[60px] bg-stone-950/30 p-4 rounded-3xl border border-stone-800/30">
            {players.map(p => (
              <div key={p.id} className="text-4xl animate-in zoom-in spin-in-6 transition-transform hover:scale-110 relative group">
                {p.avatar}
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-stone-950 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
              </div>
            ))}
            {players.length === 0 && <div className="text-stone-700 text-[10px] font-black uppercase tracking-widest py-4 italic">Empty Chamber...</div>}
          </div>

          <div className="grid grid-cols-4 gap-3 max-h-[260px] overflow-y-auto pr-2 custom-scrollbar">
            {AVAILABLE_EMOJIS.map(emoji => {
              const isSelected = players.some(p => p.avatar === emoji);
              return (
                <button
                  key={emoji}
                  disabled={!isSelected && players.length >= MAX_PLAYERS}
                  onClick={() => togglePlayer(emoji)}
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
          disabled={players.length < 2}
          onClick={startGame}
          className="w-full max-w-sm py-6 bg-gradient-to-r from-amber-400 to-amber-600 text-black font-black rounded-full text-xl shadow-[0_10px_40px_rgba(245,158,11,0.4)] disabled:opacity-20 transition-all active:scale-95 uppercase tracking-widest"
        >
          {players.length < 2 ? 'Need 2+ Players' : 'Begin Descent'}
        </button>
      </div>
    );
  }

  if (gameState === GameState.GAME_OVER) {
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

          {gameState === GameState.EXPEDITION && !isProcessing && (
            <>
              {getValidMoves().map(move => (
                <button 
                  key={`${move.x}-${move.y}`}
                  onClick={() => handleDig(move.x, move.y)}
                  className="absolute w-[22%] aspect-square rounded-xl bg-amber-500/5 border-2 border-dashed border-amber-500/30 flex items-center justify-center animate-pulse z-10 hover:bg-amber-500/10 transition-colors"
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
                  {/* Ready Tick (Hidden choice) */}
                  {gameState === GameState.DECISION_PHASE && isInside && hasVoted && !isRevealing && (
                    <div className="absolute -top-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-stone-950 flex items-center justify-center animate-in zoom-in shadow-lg">
                      <span className="text-[10px] text-black font-black">✓</span>
                    </div>
                  )}
                  {/* Reveal Reveal */}
                  {isRevealing && isInside && (
                    <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full border-2 border-stone-950 flex items-center justify-center animate-in bounce-in shadow-xl ${pendingDecisions[p.id] === 'leave' ? 'bg-red-500' : 'bg-amber-500'}`}>
                      <span className="text-[11px]">{pendingDecisions[p.id] === 'leave' ? '⛺' : '⛏️'}</span>
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
          ) : gameState === GameState.DECISION_PHASE && nextDecider ? (
            <div className="w-full bg-stone-900 rounded-[2.5rem] p-6 border border-stone-800 animate-in slide-in-from-bottom-6 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
              <div className="flex flex-col items-center gap-6">
                <div className="flex flex-col items-center">
                  <div className="text-7xl mb-2 drop-shadow-glow animate-bounce">{nextDecider.avatar}</div>
                  <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Secret Action Required</span>
                </div>
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
