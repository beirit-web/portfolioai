import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const repository = path.resolve(root, "../../../..");
const modules = path.join(repository, "frontend/node_modules");

export default {
  root,
  base: "/static/portfolio/wohnungssuche/",
  plugins: [{
    name: "housing-responsive-styles-last",
    transformIndexHtml: {
      order: "post",
      handler(html) {
        const link = html.match(/<link rel="stylesheet" href="[^"]*responsive\.css">/)?.[0];
        return (link ? html.replace(link, "").replace("</head>", `    ${link}\n  </head>`) : html).replace(/[\t ]+$/gm, "");
      },
    },
  }],
  resolve: {
    alias: [
      { find: "react-dom/client", replacement: path.join(modules, "preact/compat/client.js") },
      { find: "react-dom", replacement: path.join(modules, "preact/compat/dist/compat.module.js") },
      { find: "react/jsx-runtime", replacement: path.join(modules, "preact/jsx-runtime/dist/jsxRuntime.module.js") },
      { find: "react", replacement: path.join(modules, "preact/compat/dist/compat.module.js") },
      { find: "lucide-react", replacement: path.join(modules, "lucide-react/dist/esm/lucide-react.js") },
    ],
  },
  esbuild: { jsx: "automatic", jsxImportSource: "react" },
  build: {
    outDir: path.join(repository, "server/assets/portfolio/wohnungssuche"),
    emptyOutDir: true,
    sourcemap: true,
  },
  server: {
    host: "127.0.0.1",
    port: 5174,
    proxy: { "/wohnungssuche-api": "http://127.0.0.1:8000" },
  },
};
