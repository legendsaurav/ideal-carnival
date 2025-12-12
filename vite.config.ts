import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Avoid TS errors about `process` when running Vite config in a TypeScript
// environment without @types/node. This is safe for a dev-only config file.
declare const process: any;

// https://vitejs.dev/config/
// The backend port may vary (4000 default in server.js). IMPORTANT:
// Do NOT read `process.env.PORT` here because Vite sets that to the
// dev server port (e.g. 5173/5175) and the proxy would then point to
// the frontend itself (causing self-proxy loops and 5xx errors).
// Use BACKEND_PORT or BACKEND_URL to explicitly point to the backend.
const backendPort = process.env.BACKEND_PORT || '4000';
const backendHost = process.env.BACKEND_URL || 'https://lol-j8ni.onrender.com';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy API requests to the backend server. Use '/api/' (with trailing slash)
      // so we don't accidentally match module paths like '/api`~.ts' during dev.
      // IMPORTANT: Do not strip the '/api' prefix here because the backend
      // expects routes under '/api/*' (for example '/api/public-register').
      '/api/': {
        target: backendHost,
        changeOrigin: true,
        // Forward the path as-is so the backend receives the full '/api/...' path.
        // Avoid rewriting to '/' which would remove the '/api' prefix.
        // rewrite: (path) => path
      },
    },
  },
})