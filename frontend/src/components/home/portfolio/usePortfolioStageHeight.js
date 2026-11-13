import { useEffect } from "react";

const STAGE_CLEARANCE = 56;

export function usePortfolioStageHeight(trackRef, items) {
  useEffect(() => {
    const track = trackRef.current;
    if (!track || !items.length) return undefined;
    const slides = Array.from(track.children);
    let resizeObserver;
    let intersectionObserver;
    let observing = false;
    let disposed = false;
    const updateHeight = () => {
      if (disposed) return;
      const height = Math.max(...slides.map((slide) => slide.offsetHeight));
      track.style.setProperty("--portfolio-stage-height", `${height + STAGE_CLEARANCE}px`);
    };
    const startObserving = () => {
      if (observing || disposed) return;
      observing = true;
      intersectionObserver?.disconnect();
      resizeObserver = new ResizeObserver(updateHeight);
      slides.forEach((slide) => resizeObserver.observe(slide));
      updateHeight();
    };
    const section = track.closest(".portfolio-section");
    if (section && typeof IntersectionObserver === "function") {
      intersectionObserver = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) startObserving();
      }, { rootMargin: "300px" });
      intersectionObserver.observe(section);
    } else {
      startObserving();
    }
    return () => {
      disposed = true;
      intersectionObserver?.disconnect();
      resizeObserver?.disconnect();
    };
  }, [items, trackRef]);
}
