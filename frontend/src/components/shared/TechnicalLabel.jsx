import React from "react";
import { createPortal } from "react-dom";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { technicalGlossary } from "./technicalGlossary.mjs";

function glossaryEntryFor(term, language) {
  const normalizedTerm = String(term || "").trim();
  return (technicalGlossary[language] || technicalGlossary.de)
    .find(({ pattern }) => pattern.test(normalizedTerm));
}

function InfoTooltip({ term, explanation, language = "de" }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const triggerRef = React.useRef(null);
  const tooltipRef = React.useRef(null);
  const tooltipId = React.useId();
  const hasFinePointer = useMediaQuery("(hover: hover) and (pointer: fine)");

  const updatePosition = React.useCallback(() => {
    if (!triggerRef.current || typeof window === "undefined") return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportPadding = 12;
    const width = Math.min(288, window.innerWidth - viewportPadding * 2);
    const tooltipHeight = tooltipRef.current?.offsetHeight || 96;
    const centeredLeft = rect.left + rect.width / 2 - width / 2;
    const left = Math.max(viewportPadding, Math.min(centeredLeft, window.innerWidth - width - viewportPadding));
    const below = rect.bottom + 8;
    const fitsBelow = below + tooltipHeight <= window.innerHeight - viewportPadding;
    const top = fitsBelow ? below : Math.max(viewportPadding, rect.top - tooltipHeight - 8);
    tooltipRef.current?.style.setProperty("--tooltip-top", `${top}px`);
    tooltipRef.current?.style.setProperty("--tooltip-left", `${left}px`);
    tooltipRef.current?.style.setProperty("--tooltip-width", `${width}px`);
  }, []);

  React.useEffect(() => {
    if (!isOpen) return undefined;
    const frame = window.requestAnimationFrame(updatePosition);
    return () => window.cancelAnimationFrame(frame);
  }, [isOpen, updatePosition]);

  React.useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    const handlePointerDown = (event) => {
      if (triggerRef.current?.contains(event.target) || tooltipRef.current?.contains(event.target)) return;
      setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen, updatePosition]);

  const accessibleLabel = language === "ru" ? `Объяснение термина "${term}"` : `Erklärung zu "${term}"`;

  return (
    <span className="info-tooltip">
      <button
        ref={triggerRef}
        type="button"
        className="info-tooltip__trigger"
        aria-label={accessibleLabel}
        aria-expanded={isOpen}
        aria-describedby={isOpen ? tooltipId : undefined}
        onPointerEnter={() => { if (hasFinePointer) setIsOpen(true); }}
        onPointerLeave={() => { if (hasFinePointer) setIsOpen(false); }}
        onFocus={() => { if (hasFinePointer) setIsOpen(true); }}
        onBlur={() => { if (hasFinePointer) setIsOpen(false); }}
        onClick={(event) => {
          if (event.detail === 0 || hasFinePointer) setIsOpen(true);
          else setIsOpen((current) => !current);
        }}
      >
        i
      </button>
      {isOpen && typeof document !== "undefined" ? createPortal(
        <span
          ref={tooltipRef}
          id={tooltipId}
          role="tooltip"
          className="info-tooltip__popover"
        >
          {explanation}
        </span>,
        document.body,
      ) : null}
    </span>
  );
}

export function TechnicalLabel({ children, language = "de" }) {
  const entry = glossaryEntryFor(children, language);
  if (!entry) return children;
  return (
    <>
      {children}
      <InfoTooltip term={children} explanation={entry.text} language={language} />
    </>
  );
}
