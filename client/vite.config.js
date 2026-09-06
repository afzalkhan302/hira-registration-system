import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev, proxy /api to the local Express server so the client can use
// same-origin relative URLs. In production, set VITE_API_URL to the deployed
// backend URL instead (see client/.env.example).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
});
