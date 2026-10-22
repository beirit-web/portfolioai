import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { preloadInitialRoute } from "./routes";
import { initTheme } from "./theme";
import "./styles/main.css";
import "../../../server/assets/css/footer-links.css";

initTheme();

async function mount() {
  await preloadInitialRoute(location.pathname);
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

void mount();
