import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_PROXY_TARGET || 'http://localhost:3000';
  const proxy = {
    target: proxyTarget,
    changeOrigin: true,
    secure: proxyTarget.startsWith('https://'),
  };

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': proxy,
        '/socket.io': { ...proxy, ws: true },
        '/ws': { ...proxy, ws: true },
      },
    },
  };
});
