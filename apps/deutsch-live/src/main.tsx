import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { initTheme } from "./theme";
import "./styles/main.css";
import "../../../server/assets/css/footer-links.css";

initTheme();

async function mount() {
  const accountRoute = /\/(?:account|settings|dashboard)\/?$/.test(window.location.pathname);
  const initialAccountPanel = accountRoute
    ? (await (import.meta.env.VITE_PLATFORM_INTEGRATION === "true"
      ? import("./components/PlatformAccount") : import("./components/AuthPanel"))).default
    : undefined;
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App initialAccountPanel={initialAccountPanel} />
    </StrictMode>
  );
}

void mount();
