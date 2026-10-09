import React from "react";
import { createRoot } from "react-dom/client";
import WeatherPage from "./components/weather/WeatherPage.jsx";

const root = document.getElementById("botanic-weather-root");
if (root) createRoot(root).render(<WeatherPage />);
