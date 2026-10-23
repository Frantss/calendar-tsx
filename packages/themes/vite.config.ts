import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite-plus';
import { base } from '../../vite.config';

export default defineConfig({
  ...base,
  plugins: [react()],
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      // late discovery reloads the browser mid-run and duplicates React
      '@tanstack/react-store',
      '@tanstack/store',
      'temporal-polyfill',
    ],
  },
});
