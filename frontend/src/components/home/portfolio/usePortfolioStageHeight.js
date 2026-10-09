import { useEffect } from "react";

const STAGE_CLEARANCE = 56;

export function usePortfolioStageHeight(trackRef, items) {
  useEffect(() => {
    const track = trackRef.current;
    if (!track || !items.length) return undefined;
    const slides = Array.from(track.children);
    const updateHeight = () => {
      const height = Math.max(...slides.map((slide) => slide.offsetHeight));
      track.style.setProperty("--portfolio-stage-height", `${height + STAGE_CLEARANCE}px`);
    };
    const observer = new ResizeObserver(updateHeight);
    slides.forEach((slide) => observer.observe(slide));
    updateHeight();
    return () => observer.disconnect();
  }, [items, trackRef]);
}
