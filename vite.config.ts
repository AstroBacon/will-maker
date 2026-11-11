import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The site is served from https://astrobacon.github.io/will-maker/ (GitHub Pages project site).
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/will-maker/' : '/',
  plugins: [react()],
}));
