import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'express-http-proxy';
import http from 'http';
import { WebSocketServer } from 'ws';
import WebSocket from 'ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Serve static files from dist
app.use(express.static(path.join(__dirname, 'dist')));

// Proxy WebSocket upgrade requests to backend
app.get('/ws', (req, res) => {
  // This will be handled by HTTP upgrade in the server
  res.status(404).send('Not found');
});

// SPA fallback
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  res.sendFile(indexPath);
});

// Create HTTP server
const server = http.createServer(app);

// Proxy WebSocket connections to backend
server.on('upgrade', (req, socket, head) => {
  console.log(`[PROXY] Upgrade request to ${req.url}`);
  
  const ws = new WebSocket('ws://localhost:3001', {
    perMessageDeflate: false
  });
  
  ws.on('open', () => {
    console.log(`[PROXY] Connected to backend WebSocket`);
    
    // Forward messages from client to backend
    // (This will be handled by the websocket library)
  });
  
  ws.on('error', (err) => {
    console.error(`[PROXY] WebSocket error:`, err);
    socket.destroy();
  });
  
  ws.on('close', () => {
    console.log(`[PROXY] Backend WebSocket closed`);
    socket.destroy();
  });
  
  // Handle the upgrade
  ws.on('open', () => {
    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      'Sec-WebSocket-Accept: ' + require('crypto').createHash('sha1')
        .update(req.headers['sec-websocket-key'] + '258EAFA5-E910-A6D8-4736-0713687A0CA1')
        .digest('base64') + '\r\n' +
      '\r\n'
    );
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`✅ Frontend server started on port ${PORT}`);
  console.log(`🔗 Serving dist/ directory`);
  console.log(`🔌 WebSocket proxy -> ws://localhost:3001`);
});
