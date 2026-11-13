import React from "react";
import TechnologyIcon from "./TechnologyIcon";

export default function TechnologyTags({ technologies, className = "", label, iconSize = 18, fallbackIcon }) {
  if (!technologies.length) return null;
  return (
    <div className={`technology-tags ${className}`.trim()} aria-label={label}>
      {technologies.map(technology => (
        <span className="technology-tag" key={technology}>
          <TechnologyIcon label={technology} size={iconSize} fallback={fallbackIcon} />
          {technology}
        </span>
      ))}
    </div>
  );
}
