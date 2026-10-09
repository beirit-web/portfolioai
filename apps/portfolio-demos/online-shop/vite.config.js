import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendNodeModules = path.resolve(__dirname, "../../../frontend/node_modules");

export default {
  root: __dirname,
  base: "./",
  publicDir: "public",
  resolve: {
    alias: {
      react: path.join(frontendNodeModules, "react"),
      "react-dom": path.join(frontendNodeModules, "react-dom"),
      "react-dom/client": path.join(frontendNodeModules, "react-dom/client.js"),
    },
  },
  build: {
    outDir: "../../../server/assets/portfolio/online-shop",
    emptyOutDir: true,
  },
  server: {
    port: 5181,
    proxy: {
      "/api/shop": "http://127.0.0.1:8000",
    },
  },
};
