import React, { useState, useEffect } from 'react';
import { useGameWebSocket } from '../hooks/useGameWebSocket';

interface GameRoomProps {
  roomId: string;
  userId: string;
  username: string;
}

export function GameRoom({ roomId, userId, username }: GameRoomProps) {
  const {
    roomState,
    connected,
    error,
    selectCharacter,
    startGame,
    sendPlayerAction,
    leaveRoom
  } = useGameWebSocket(roomId, userId, username);

  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);

  // Available characters
  const characters = ['warrior', 'mage', 'rogue', 'paladin', 'ranger'];

  // Check if current user is the creator
  const isCreator = roomState?.createdBy === userId;

  // Check if all players have selected characters
  const allReady = roomState?.players?.every(p => p.character !== null);

  const handleSelectCharacter = (character: string) => {
    setSelectedCharacter(character);
    selectCharacter(character);
  };

  const handleStartGame = () => {
    if (isCreator && allReady) {
      startGame();
    }
  };

  const handleLeaveRoom = () => {
    leaveRoom();
    // Redirect to home or lobby
  };

  if (!connected) {
    return (
      <div className="game-room loading">
        <div className="spinner"></div>
        <p>Connecting to game server...</p>
        {error && <div className="error">{error}</div>}
      </div>
    );
  }

  return (
    <div className="game-room">
      {/* Header */}
      <div className="room-header">
        <h2>Room: {roomId}</h2>
        <span className={`status ${connected ? 'connected' : 'disconnected'}`}>
          {connected ? '🟢 Connected' : '🔴 Disconnected'}
        </span>
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="room-content">
        {/* Players List */}
        <section className="players-section">
          <h3>Players ({roomState?.players?.length || 0})</h3>
          <div className="players-list">
            {roomState?.players?.map((player) => (
              <div key={player.userId} className="player-card">
                <div className="player-header">
                  <strong>{player.username}</strong>
                  {player.isCreator && <span className="badge creator">👑 Creator</span>}
                </div>
                <div className="player-character">
                  {player.character ? (
                    <span className="character-badge">{player.character}</span>
                  ) : (
                    <span className="selecting">Selecting...</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Character Selection */}
        {roomState?.gameState === 'waiting' && (
          <section className="selection-section">
            <h3>Select Your Character</h3>
            <div className="character-grid">
              {characters.map((character, index) => (
                <button
                  key={`character-${index}-${character}`}
                  className={`character-btn ${selectedCharacter === character ? 'selected' : ''}`}
                  onClick={() => handleSelectCharacter(character)}
                  disabled={roomState?.gameState !== 'waiting'}
                >
                  {character}
                </button>
              ))}
            </div>
            {selectedCharacter && (
              <p className="selection-status">✅ You selected: <strong>{selectedCharacter}</strong></p>
            )}
          </section>
        )}

        {/* Game Started */}
        {roomState?.gameState === 'playing' && (
          <section className="game-section">
            <h3>Game Started!</h3>
            <p>Your character: <strong>{selectedCharacter}</strong></p>
            <div className="opponent-info">
              <h4>Other Players:</h4>
              {roomState?.players
                ?.filter(p => p.userId !== userId)
                .map(player => (
                  <div key={player.userId} className="opponent">
                    {player.username} playing as <strong>{player.character}</strong>
                  </div>
                ))}
            </div>
          </section>
        )}

        {/* Action Buttons */}
        <section className="actions-section">
          {isCreator && roomState?.gameState === 'waiting' && (
            <button
              className="btn btn-primary"
              onClick={handleStartGame}
              disabled={!allReady}
              title={!allReady ? 'All players must select a character' : ''}
            >
              Start Game
            </button>
          )}

          <button className="btn btn-secondary" onClick={handleLeaveRoom}>
            Leave Room
          </button>
        </section>
      </div>

      <style>{`
        .game-room {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }

        .room-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 2px solid #ddd;
        }

        .status {
          font-size: 14px;
          font-weight: bold;
        }

        .status.connected {
          color: #00aa00;
        }

        .status.disconnected {
          color: #aa0000;
        }

        .alert {
          padding: 12px;
          margin-bottom: 20px;
          border-radius: 4px;
          background: #fee;
          color: #c00;
          border-left: 4px solid #c00;
        }

        section {
          margin-bottom: 30px;
          padding: 20px;
          background: #f9f9f9;
          border-radius: 8px;
          border: 1px solid #eee;
        }

        h3 {
          margin-top: 0;
          color: #333;
        }

        .players-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 15px;
        }

        .player-card {
          background: white;
          padding: 15px;
          border-radius: 6px;
          border: 2px solid #e0e0e0;
          transition: border-color 0.3s;
        }

        .player-card:hover {
          border-color: #4CAF50;
        }

        .player-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
          gap: 8px;
        }

        .badge {
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 12px;
          background: #ffd700;
          color: #333;
          font-weight: bold;
        }

        .player-character {
          text-align: center;
          padding: 10px;
          background: #f0f0f0;
          border-radius: 4px;
        }

        .character-badge {
          display: inline-block;
          padding: 6px 12px;
          background: #4CAF50;
          color: white;
          border-radius: 4px;
          font-weight: bold;
        }

        .selecting {
          color: #999;
          font-style: italic;
        }

        .character-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
          gap: 10px;
          margin-bottom: 15px;
        }

        .character-btn {
          padding: 12px;
          border: 2px solid #ddd;
          background: white;
          border-radius: 6px;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.3s;
          text-transform: capitalize;
        }

        .character-btn:hover:not(:disabled) {
          border-color: #4CAF50;
          background: #f0f8f0;
        }

        .character-btn.selected {
          background: #4CAF50;
          color: white;
          border-color: #2E7D32;
        }

        .character-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .selection-status {
          color: #4CAF50;
          font-weight: bold;
          margin-top: 10px;
        }

        .opponent-info {
          background: white;
          padding: 15px;
          border-radius: 4px;
          margin-top: 10px;
        }

        .opponent {
          padding: 8px 0;
          border-bottom: 1px solid #eee;
        }

        .opponent:last-child {
          border-bottom: none;
        }

        .actions-section {
          display: flex;
          gap: 10px;
          justify-content: center;
        }

        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          font-weight: bold;
          cursor: pointer;
          font-size: 16px;
          transition: all 0.3s;
        }

        .btn-primary {
          background: #4CAF50;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #45a049;
        }

        .btn-primary:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: #f44336;
          color: white;
        }

        .btn-secondary:hover {
          background: #da190b;
        }

        .loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 300px;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #4CAF50;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 20px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default GameRoom;
