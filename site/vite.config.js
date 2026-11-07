import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// The site reads the level-*/ result, task and source files at build time, so every number on the page is generated, never typed.
export default defineConfig({
  base: '/agent-evals-and-harness/',
  plugins: [react()],
  server: { fs: { allow: ['..'] } },
});
