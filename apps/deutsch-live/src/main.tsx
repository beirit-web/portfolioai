import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { initTheme } from "./theme";
import "./styles/main.css";
import "../../../server/assets/css/footer-links.css";

initTheme();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
