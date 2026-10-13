import React from "react";

const factIcons = {
  software: "service-responsive.svg",
  development: "service-fullstack.svg",
  repair: "service-optimization.svg",
  germany: "about-germany.svg",
};

export default function AboutFactIcon({ name }) {
  const filename = factIcons[name];
  if (!filename) return null;
  return (
    <img
      className="about-fact-icon"
      src={`/static/images/${filename}`}
      alt=""
      aria-hidden="true"
      width="64"
      height="64"
      loading="lazy"
      decoding="async"
      draggable="false"
    />
  );
}
