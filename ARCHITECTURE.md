# 🏗️ Architecture Overview

## System Design

```
┌─────────────────────────────────────────────────────┐
│                   TELEGRAM                          │
├─────────────────────────────────────────────────────┤
│  Chat          Bot (@cave_of_greed_bot)             │
│  User1 ─────→  Handler          Button "/play"      │
│  User2 ────→   📱 Web View      (opens URL)         │
│  ...           ↓                                     │
│             opens in embedded browser                │
│             receives initData                        │
└──────────────────────┬──────────────────────────────┘
                       │
                       │ https
                       ↓
        ┌──────────────────────────────┐
        │    FRONTEND (Vercel)         │
        ├──────────────────────────────┤
        │ React + Tailwind             │
        │ TypeScript                   │
        │ Game UI                      │
        │                              │
        │ Components:                  │
        │ ├─ App.tsx (main)           │
        │ ├─ DugTile (card)           │
        │ ├─ PlayerStatus             │
        │ └─ GameBoard                │
        │                              │
        │ Context:                     │
        │ └─ TelegramProvider         │
        │    - initData handling       │
        │    - user info               │
        │    - session token           │
        │                              │
        │ API Service:                 │
        │ └─ apiService.ts            │
        │    - validateTelegram()      │
        │    - createGame()            │
        │    - joinGame()              │
        │    - performAction()         │
        └──────────────┬───────────────┘
                       │
                       │ https (JSON)
                       ↓
        ┌──────────────────────────────┐
        │    BACKEND (Heroku)          │
        ├──────────────────────────────┤
        │ Express + Node.js            │
        │ TypeScript                   │
        │                              │
        │ Middleware:                  │
        │ ├─ CORS                      │
        │ ├─ JSON Parser               │
        │ └─ Error Handler             │
        │                              │
        │ Routes:                      │
        │ ├─ POST /api/auth/validate   │
        │ │  └─ validateInitData()     │
        │ │  └─ createSession()        │
        │ │  └─ return token           │
        │ │                            │
        │ ├─ POST /api/games/create    │
        │ │  └─ Game in memory         │
        │ │  └─ return gameId          │
        │ │                            │
        │ ├─ POST /api/games/join      │
        │ │  └─ Add player to game     │
        │ │  └─ return updated state   │
        │ │                            │
        │ ├─ GET /api/games/:id        │
        │ │  └─ Get game state         │
        │ │  └─ Sync with client       │
        │ │                            │
        │ └─ POST /api/games/:id/action│
        │    └─ Process game logic     │
        │    └─ Update state           │
        │    └─ Broadcast changes      │
        │                              │
        │ Storage:                     │
        │ ├─ sessions Map              │
        │ └─ games Map                 │
        │    (TODO: PostgreSQL DB)     │
        └──────────────────────────────┘
```

## Data Flow

### 1️⃣ User Opens Bot

```
User taps "🎮 Play Game" button
    ↓
Telegram opens webview with URL
    ↓
Frontend loads (React app)
    ↓
window.Telegram.WebApp initializes
    ↓
getInitData() → contains user_id, username, etc
```

### 2️⃣ Authentication

```
Frontend: Got initData
    ↓
POST /api/auth/validate { initData, userId }
    ↓
Backend: Validate crypto signature
    ↓
Generate sessionToken
    ↓
Store in sessions Map { token: { userId, expiresAt } }
    ↓
Return token to frontend
    ↓
Frontend: Save token in localStorage
```

### 3️⃣ Create/Join Game

```
Frontend: User selects avatar
    ↓
Click "Begin Descent"
    ↓
POST /api/games/create { token }
    ↓
Backend: Verify token, create game
    ↓
Store in games Map { gameId: { players, state, cards } }
    ↓
Return gameId to frontend
    ↓
Frontend: Start EXPEDITION state
```

### 4️⃣ Game Logic

```
Frontend: Render grid with valid moves
    ↓
User clicks cell (x, y)
    ↓
POST /api/games/:id/action { action: "dig", x, y }
    ↓
Backend:
  ├─ Get game state
  ├─ Draw card from deck
  ├─ Update positions
  ├─ Check hazards
  ├─ Distribute treasures
  └─ Update players state
    ↓
Return updated game state
    ↓
Frontend: Animate new card, update UI
    ↓
If decision needed: show "Stay" / "Leave" buttons
```

## File Structure

```
cave-game/
│
├─ Frontend (React)
│  ├─ App.tsx                 # Main game component
│  ├─ index.tsx              # Entry point
│  ├─ index.html             # HTML + Telegram SDK
│  ├─ types.ts               # TS interfaces
│  ├─ constants.ts           # Game constants
│  ├─ telegramContext.tsx    # Telegram integration
│  ├─ apiService.ts          # HTTP client
│  └─ vite.config.ts         # Vite config
│
├─ Backend (Express)
│  └─ server.js              # Express app
│     ├─ Auth endpoints
│     ├─ Game endpoints
│     ├─ Session management
│     └─ Game state storage
│
├─ Config & Deploy
│  ├─ package.json
│  ├─ tsconfig.json
│  ├─ .env                   # (git ignored)
│  ├─ .env.example
│  ├─ Procfile               # Heroku config
│  └─ .gitignore
│
└─ Documentation
   ├─ README.md
   ├─ DEPLOYMENT_GUIDE.md
   ├─ HOW_TO_RUN.md
   ├─ QUICK_START.md
   ├─ DEPLOYMENT_CHECKLIST.md
   └─ ARCHITECTURE.md (this file)
```

## Technology Choices

### Frontend: React
- ✅ Great for interactive UI
- ✅ Virtual DOM for performance
- ✅ Large ecosystem
- ✅ Component reusability

### Styling: Tailwind CSS
- ✅ Rapid development
- ✅ Responsive by default
- ✅ Customizable theme
- ✅ Dark mode support

### Backend: Express
- ✅ Lightweight
- ✅ Fast development
- ✅ Excellent for APIs
- ✅ Large middleware ecosystem

### Hosting: Vercel + Heroku
- ✅ Free tier available
- ✅ Easy deployment
- ✅ Built-in HTTPS
- ✅ Environment variables support

## Security Architecture

```
┌────────────────────────────────────────┐
│     TELEGRAM SERVERS                   │
│     (Trusted Authority)                │
└────────────────────────┬────────────────┘
                         │
                 Passes initData with
              cryptographic signature
                         │
                         ↓
            ┌────────────────────────────┐
            │  FRONTEND (UNTRUSTED)      │
            │  - Can be intercepted      │
            │  - Client-side validation  │
            │  - Passes initData to      │
            │    backend                 │
            └────────────────────────────┘
                         │
              Sends initData + secret
                         │
                         ↓
            ┌────────────────────────────┐
            │  BACKEND (TRUSTED)         │
            │  - Validates signature     │
            │  - Verifies initData       │
            │  - Creates session         │
            │  - Returns opaque token    │
            └────────────────────────────┘
                         │
              Token only valid for
              this user in this session
```

## Scalability Considerations

### Current Limitations
- ❌ In-memory storage (lost on restart)
- ❌ Single server (no load balancing)
- ❌ No database
- ❌ No real-time sync (WebSocket)

### Production Upgrades Needed

1. **Database** (PostgreSQL)
   ```
   ├─ users table
   ├─ sessions table
   ├─ games table
   └─ game_states table
   ```

2. **WebSocket** (Socket.io)
   ```
   ├─ Real-time player sync
   ├─ Action broadcasting
   └─ Presence tracking
   ```

3. **Message Queue** (Redis)
   ```
   ├─ Game updates
   ├─ Session management
   └─ Rate limiting
   ```

4. **Load Balancing** (PM2 / Kubernetes)
   ```
   ├─ Multiple instances
   ├─ Auto-scaling
   └─ Sticky sessions
   ```

## API Contract

### Request/Response Format

```typescript
// Success Response
{
  "data": {
    "gameId": "abc123",
    "game": { /* game state */ }
  }
}

// Error Response
{
  "error": "Invalid token"
}

// Status Codes
200 - OK
201 - Created
400 - Bad Request
401 - Unauthorized
404 - Not Found
500 - Server Error
```

## Testing Strategy

### Frontend Testing
- [ ] Component rendering
- [ ] Game state transitions
- [ ] API integration
- [ ] Telegram SDK mocking

### Backend Testing
- [ ] Auth validation
- [ ] Game creation/join
- [ ] Action processing
- [ ] State consistency
- [ ] CORS handling

### Integration Testing
- [ ] Full game flow (local)
- [ ] With Telegram SDK (ngrok)
- [ ] Production URLs

### Load Testing
- [ ] Concurrent games
- [ ] Max players per game
- [ ] API response times

---

**Next Steps**: Upgrade to production architecture with WebSocket + Database
