import React from "react";
import TechnologyIcon from "./TechnologyIcon";

export default function TechnologyTags({ technologies, className = "", label }) {
  if (!technologies.length) return null;
  return (
    <div className={`technology-tags ${className}`.trim()} aria-label={label}>
      {technologies.map(technology => (
        <span className="technology-tag" key={technology}>
          <TechnologyIcon label={technology} size={18} />
          {technology}
        </span>
      ))}
    </div>
  );
}
