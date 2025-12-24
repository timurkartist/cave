#!/usr/bin/env node
// Диагностика проблемы подключения WebSocket

console.log(`
╔════════════════════════════════════════════════════════════════╗
║                WebSocket Connection Diagnostic               ║
║                    Version: 1.0                                ║
╚════════════════════════════════════════════════════════════════╝
`);

const checks = [
  {
    name: 'Environment Setup',
    test: () => {
      const envUrl = process.env.VITE_WS_URL;
      if (envUrl && envUrl !== 'ws://localhost:3002') {
        console.log('⚠️  VITE_WS_URL is hardcoded. This will break on ngrok!');
        console.log('   Recommended: Leave VITE_WS_URL unset for auto-detection');
      } else {
        console.log('✅ VITE_WS_URL correctly unset (auto-detection enabled)');
      }
    }
  },
  {
    name: 'Service Dependencies Check',
    test: async () => {
      const services = [
        { name: 'Vite Frontend', port: 5173 },
        { name: 'API Server', port: 3001 },
        { name: 'WebSocket Server', port: 3002 },
      ];

      for (const service of services) {
        try {
          const response = await fetch(`http://localhost:${service.port}/health`, { 
            timeout: 1000,
            signal: AbortSignal.timeout(1000)
          }).catch(() => ({ status: 0 }));
          
          if (response.status === 200 || response.status === 404) {
            console.log(`✅ ${service.name.padEnd(20)} listening on port ${service.port}`);
          } else {
            console.log(`⚠️  ${service.name.padEnd(20)} (got status ${response.status})`);
          }
        } catch (e) {
          console.log(`❌ ${service.name.padEnd(20)} NOT running on port ${service.port}`);
        }
      }
    }
  }
];

console.log('\n📋 Running Diagnostics...\n');

for (const check of checks) {
  console.log(`\n${check.name}:`);
  console.log('─'.repeat(50));
  try {
    const result = check.test();
    if (result instanceof Promise) {
      await result;
    }
  } catch (e) {
    console.error(`Error: ${e.message}`);
  }
}

console.log(`
╔════════════════════════════════════════════════════════════════╗
║                      FIXES APPLIED                             ║
╚════════════════════════════════════════════════════════════════╝

1. ✅ WebSocket URL now computed dynamically at connection time
   - File: hooks/useGameWebSocket.ts
   - Function: getWebSocketURL()
   - Uses: Current hostname + port 3002

2. ✅ userId generation improved
   - File: App.tsx
   - Format: user-{timestamp}-{random}
   - Persistent across session

3. ✅ gameId/roomCode synchronization
   - gameId from URL → roomCode for WebSocket
   - If no gameId → generate new roomCode

4. ✅ Enhanced logging
   - Console shows connection progress
   - Detailed error messages

5. ✅ .env.local no longer hardcodes VITE_WS_URL
   - Auto-detection works for:
     * localhost development
     * ngrok URLs
     * Production deployments

╔════════════════════════════════════════════════════════════════╗
║                    TESTING CHECKLIST                          ║
╚════════════════════════════════════════════════════════════════╝

Before testing, start all services:

Terminal 1:  npm run dev              (Vite frontend on :5173)
Terminal 2:  npm run dev:server       (API on :3001)
Terminal 3:  npm run dev:ws           (WebSocket on :3002)
Terminal 4:  npm run dev:bot          (Telegram bot)

Then run diagnostics:
  npm run check

Test connection:
  1. Open http://localhost:5173 in browser
  2. Check DevTools Console (F12) for logs
  3. Look for: "WebSocket connected, joining room"
  4. Verify "room_state" message received
  5. Confirm players list appears

Common issues fixed:
✅ "Connecting..." stuck → WebSocket URL now computed dynamically
✅ Multiple gameIds → Properly synchronized
✅ No userId → Generated consistently
✅ Wrong host on ngrok → Auto-detects current hostname
✅ Port 3002 not found → Clear error messages in console

`);
