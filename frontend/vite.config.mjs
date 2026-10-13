import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { projectsI18nPlugin } from "./src/lib/projectsI18nPlugin.mjs";
import { aboutI18nPlugin } from "./src/lib/aboutI18nPlugin.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), projectsI18nPlugin(), aboutI18nPlugin()],
  root: path.resolve(__dirname),
  base: "/static/portfolio-dist/",
  resolve: {
    alias: {
      react: "preact/compat",
      "react-dom": "preact/compat",
      "react-dom/client": "preact/compat/client",
      "react/jsx-runtime": "preact/jsx-runtime",
    },
  },
  build: {
    outDir: path.resolve(__dirname, "../server/assets/portfolio-dist"),
    emptyOutDir: true,
    manifest: true,
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "src/main.jsx"),
        about: path.resolve(__dirname, "src/about.jsx"),
        projects: path.resolve(__dirname, "src/projects.js"),
        "project-detail": path.resolve(__dirname, "src/project-detail.js"),
        "project-detail-app": path.resolve(__dirname, "src/project-detail.jsx"),
        "projects-app": path.resolve(__dirname, "src/projects.jsx"),
        "site": path.resolve(__dirname, "src/site.css"),
        "about-shell": path.resolve(__dirname, "src/about-shell.css"),
        "mobile-pages": path.resolve(__dirname, "src/mobile-pages.css"),
        "project-detail-page": path.resolve(__dirname, "src/project-detail-page.css"),
        "project-detail-rendering": path.resolve(__dirname, "src/project-detail-rendering.css"),
        "projects-page": path.resolve(__dirname, "src/projects-page.css"),
        "header-nav": path.resolve(__dirname, "src/header-nav.css"),
        "homepage-layout": path.resolve(__dirname, "src/homepage-layout.css"),
        "about-page": path.resolve(__dirname, "src/about-page.css"),
        "homepage": path.resolve(__dirname, "src/components/home/homepage/HomePage.css"),
        "hero": path.resolve(__dirname, "src/components/home/hero/Hero.css"),
        "weather-page": path.resolve(__dirname, "src/components/weather/WeatherPage.css"),
        "technical-label": path.resolve(__dirname, "src/components/shared/TechnicalLabel.css"),
        "faq-section": path.resolve(__dirname, "src/components/home/faqsection/FaqSection.css"),
        "technology-proof-section": path.resolve(__dirname, "src/components/home/technologyproofsection/TechnologyProofSection.css"),
      },
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/three")) return "three-vendor";
          if (id.includes("node_modules/preact")) return "preact-vendor";
          return undefined;
        },
      },
    },
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      "/botanic": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/shop": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/vertragsgenerator": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/static": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/deutschlive": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/deutschLive": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
});
