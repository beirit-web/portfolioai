import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { App } from "./App.jsx";

createRoot(document.getElementById("cake-shop-root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
