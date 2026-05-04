import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, existsSync } from 'fs';

function findIconsEsmPath(): string {
  const candidates = [
    resolve(__dirname, 'node_modules/@mui/icons-material/esm'),
    resolve(__dirname, '../../node_modules/@mui/icons-material/esm'),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return candidates[1];
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@mui/icons-material': findIconsEsmPath(),
    },
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
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react-admin',
      'ra-core',
      'ra-ui-materialui',
      'ra-data-simple-rest',
      '@mui/material',
      '@mui/icons-material',
      '@emotion/react',
      '@emotion/styled',
    ],
    force: true,
  },
  server: {
    port: 3002,
    allowedHosts: ['ht.openedskill.com'],
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
