/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      // Fix ESM resolution used by ra-ui-materialui in Vitest.
      { find: '@mui/material/styles', replacement: '@mui/material/node/styles/index.js' },
      { find: 'react', replacement: resolve(__dirname, '../../node_modules/react') },
      { find: 'react-dom', replacement: resolve(__dirname, '../../node_modules/react-dom') },
    ],
    dedupe: [
      'react',
      'react-dom',
      'react-router',
      'react-router-dom',
      '@mui/material',
      '@emotion/react',
      '@emotion/styled',
    ],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
    deps: {
      inline: ['ra-ui-materialui', 'ra-core', 'react-admin'],
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/__tests__/**', 'src/main.tsx', 'src/vite-env.d.ts'],
    },
  },
});
