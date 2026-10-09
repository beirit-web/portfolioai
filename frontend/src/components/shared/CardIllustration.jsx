import React from "react";

const serviceImages = {
  LayoutTemplate: "service-responsive.svg",
  Bug: "service-optimization.svg",
  Workflow: "service-fullstack.svg",
  Globe2: "service-languages.svg",
  MessageSquare: "service-form.svg",
};

const problemImages = {
  Cpu: "problem-performance.svg",
  LayoutTemplate: serviceImages.LayoutTemplate,
  PencilLine: "problem-content.svg",
  Image: "problem-display.svg",
  Workflow: "problem-maintenance.svg",
  ShieldCheck: "problem-security.svg",
};

const illustrationImages = {
  service: serviceImages,
  problem: problemImages,
  feature: { ...problemImages, ...serviceImages, Settings: problemImages.Workflow },
};

export default function CardIllustration({ name, kind = "service", className, fallback: Fallback }) {
  const filename = illustrationImages[kind]?.[name];
  if (!filename) return Fallback ? <Fallback className="h-5 w-5" aria-hidden="true" /> : null;
  return (
    <img
      className={className || (kind === "problem" ? "problem-card__svg" : "service-card__svg")}
      src={`/static/images/${filename}`}
      alt=""
      aria-hidden="true"
      width="64"
      height="64"
      loading="lazy"
      draggable="false"
    />
  );
}
