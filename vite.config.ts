import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        middlewareMode: false,
        port: 3000,
        host: '0.0.0.0',  // Explicitly bind to all interfaces
        strictPort: true,  // Fail if port is in use instead of trying another
        allowedHosts: [
          'localhost',
          '127.0.0.1',
          '192.168.2.42',
          'cave.ngrok.app',
          'quinquevalent-premillennially-britta.ngrok-free.dev'
        ],
        // Disable HMR for dev server - allows ngrok access
        hmr: false,
        // Proxy API and WebSocket requests to backend
        proxy: {
          '/api': {
            target: 'http://localhost:3001',
            changeOrigin: true,
            rewrite: (path) => path
          },
          '/ws': {
            target: 'ws://localhost:3001',
            ws: true,
            rewrite: (path) => path
          }
        }
      },
      plugins: [react()],
      define: {
        'process.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL),
        'process.env.VITE_APP_URL': JSON.stringify(env.VITE_APP_URL),
        'process.env.VITE_WS_URL': JSON.stringify(env.VITE_WS_URL)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
