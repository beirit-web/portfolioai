import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => {
  const isBuild = command === "build";
  const staticBase = process.env.VITE_STATIC_BASE ?? (isBuild ? "/static/deutschlive-dist/" : "/");
  const appBase = process.env.VITE_APP_BASE ?? (isBuild ? "/deutschlive" : "");
  const outDir = process.env.VITE_OUT_DIR ?? "../../../server/assets/deutschlive-dist";

  return {
    base: staticBase,
    plugins: [react()],
    define: {
      "import.meta.env.VITE_APP_BASE": JSON.stringify(appBase)
    },
    build: {
      outDir,
      emptyOutDir: true
    },
    server: {
      port: 5173,
      proxy: {
        "/deutschlive/api": {
          target: "http://127.0.0.1:8000",
          changeOrigin: true
        },
        "/api": {
          target: "http://127.0.0.1:8000",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, "/deutschlive/api")
        }
      }
    }
  };
});
