import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base is set at build time so the same source deploys to a GitHub Pages
// project site (served from /<repo>/) and to a root domain unchanged.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE ?? '/',
  server: { port: 8802 },
});
