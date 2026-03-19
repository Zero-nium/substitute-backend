import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    // Single chunk — simpler to upload to InfinityFree
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
});
