import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: "/static/portfolio/enbt-botanic/",
  plugins: [react()],
  build: {
    outDir: "../../../../server/assets/portfolio/enbt-botanic",
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
