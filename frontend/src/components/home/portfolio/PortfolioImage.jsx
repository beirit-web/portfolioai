import React from "react";

export default function PortfolioImage({
  image,
  title,
  width = 960,
  height = 600,
  ...props
}) {
  return (
    <img
      {...props}
      src={image.src}
      alt={`${title} - ${image.label}`}
      decoding="async"
      width={image.width || width}
      height={image.height || height}
    />
  );
}
