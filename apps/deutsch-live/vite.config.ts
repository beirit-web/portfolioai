import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { djangoAccountProxy } from "../../frontend/vite.django-proxy.mjs";

const appDirectory = fileURLToPath(new URL(".", import.meta.url));
const calculatorMedia = fileURLToPath(new URL("../../server/assets/portfolio/notenrechner/", import.meta.url));
const footerStyles = fileURLToPath(new URL("../../server/assets/css/footer-links.css", import.meta.url));
const compatibilityStyles = fileURLToPath(new URL("../../frontend/tailwind-compat.css", import.meta.url));

export default defineConfig(({ command }) => {
  const isBuild = command === "build";
  const staticBase = process.env.VITE_STATIC_BASE ?? (isBuild ? "/static/deutschlive-dist/" : "/");
  const appBase = process.env.VITE_APP_BASE ?? (isBuild ? "/deutschlive" : "");
  const outDir = process.env.VITE_OUT_DIR ?? "../../server/assets/deutschlive-dist";

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
      host: "127.0.0.1",
      port: 5173,
      fs: { allow: [appDirectory, calculatorMedia, footerStyles, compatibilityStyles] },
      proxy: {
        ...djangoAccountProxy(),
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
