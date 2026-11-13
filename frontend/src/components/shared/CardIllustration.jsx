import { illustrationImageSrc } from "./cardIllustrations.mjs";
import React from "react";

export default function CardIllustration({ name, kind = "service", className, fallback: Fallback }) {
  const src = illustrationImageSrc(name, kind);
  if (!src) return Fallback ? <Fallback className="h-5 w-5" aria-hidden="true" /> : null;
  return (
    <img
      className={className || (kind === "problem" ? "problem-card__svg" : "service-card__svg")}
      src={src}
      alt=""
      aria-hidden="true"
      width="64"
      height="64"
      loading="lazy"
      draggable="false"
    />
  );
}
