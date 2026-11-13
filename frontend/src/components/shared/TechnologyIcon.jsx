import React from "react";
import { technologyLogoSrc } from "./technologyLogos.mjs";

export default function TechnologyIcon({ label, fallback: Fallback, size = 64, className }) {
  const src = technologyLogoSrc(label);
  if (!src) return Fallback ? <Fallback className={className} aria-hidden="true" /> : null;
  return (
    <img className={className} src={src} alt="" aria-hidden="true" width={size} height={size} loading="lazy" draggable="false" />
  );
}
