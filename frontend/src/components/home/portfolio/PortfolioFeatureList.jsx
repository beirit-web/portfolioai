import { featureIconName, featureIllustrations } from "./featurePresentation.mjs";
import React from "react";
import { Braces, Bug, Code2, Cpu, Database, Hash, Languages, LayoutTemplate, MessageSquare, MonitorSmartphone, ShieldCheck, Star, Workflow } from "lucide-react";
import { featureLabel } from "./portfolioPresentation.mjs";
import { technologyLogos, technologyLogoSrc } from "../../shared/technologyLogos.mjs";
import TechnologyIcon from "../../shared/TechnologyIcon";
import CardIllustration from "../../shared/CardIllustration";

export function ReactBrandIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.45" {...props}>
      <circle cx="12" cy="12" r="1.55" fill="currentColor" stroke="none" />
      <ellipse cx="12" cy="12" rx="10" ry="3.8" />
      <ellipse cx="12" cy="12" rx="10" ry="3.8" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="10" ry="3.8" transform="rotate(120 12 12)" />
    </svg>
  );
}

export function DjangoBrandIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M7 4.5h5.2v15H7a4.5 4.5 0 0 1 0-9h5.2" />
      <path d="M16.5 4.5v10.8a4.2 4.2 0 0 1-4.2 4.2" />
    </svg>
  );
}

function PythonBrandIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M8.5 9.5H15a3 3 0 0 1 3 3v1.2a3 3 0 0 1-3 3h-3v1.8a2 2 0 0 1-2 2H7.5a2 2 0 0 1-2-2v-4.8a4.2 4.2 0 0 1 4.2-4.2H12" />
      <path d="M15.5 14.5H9a3 3 0 0 1-3-3v-1.2a3 3 0 0 1 3-3h3V5.5a2 2 0 0 1 2-2h2.5a2 2 0 0 1 2 2v4.8a4.2 4.2 0 0 1-4.2 4.2H12" />
      <path d="M9.3 5.4h.01" />
      <path d="M14.7 18.6h.01" />
    </svg>
  );
}

function featureDescription(item) {
  if (!item || typeof item !== "object") return "";
  return String(item.text || item.description || "").trim();
}

const featureIcons = { ReactBrandIcon, DjangoBrandIcon, PythonBrandIcon, Hash, Braces, Code2,
  ShieldCheck, Database, MonitorSmartphone, MessageSquare, Languages, Bug,
  LayoutTemplate, Workflow, Cpu, Star };
export function featureIconFor(label) {
  return featureIcons[featureIconName(label)];
}

export default function PortfolioFeatureList({ items, illustrations = [] }) {
  return (
    <ul className="portfolio-card__feature-list">
      {items.map((item, index) => {
        const label = featureLabel(item);
        const description = featureDescription(item);
        const Icon = featureIconFor(label);
        const technology = technologyLogoSrc(label) ? label : Object.keys(technologyLogos).find(name => (
          new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(label)
        ));
        const illustration = illustrations[index] || featureIllustrations[featureIconName(label)] || "Workflow";
        return (
          <li key={label}>
            <span className="portfolio-card__feature-list-icon-wrap" aria-hidden="true">
              {illustrations[index] || !technology ? (
                <CardIllustration name={illustration} kind="feature" fallback={Icon} className="portfolio-card__feature-list-icon" />
              ) : (
                <TechnologyIcon label={technology} fallback={Icon} className="portfolio-card__feature-list-icon" />
              )}
            </span>
            <span>
              <strong>{label}</strong>
              {description ? <small>{description}</small> : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

