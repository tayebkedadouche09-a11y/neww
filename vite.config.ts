import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('leaflet') || id.includes('react-leaflet')) return 'maps';
          if (id.includes('@supabase')) return 'supabase';
          if (id.includes('lucide-react') || id.includes('framer-motion')) return 'ui';
          if (id.includes('react-dom') || id.includes('/react/')) return 'react';
          return 'vendor';
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
