import React from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { usePortfolioProjects } from "../../../hooks/usePortfolioProjects.js";
import { projectLiveHref } from "../../../lib/appNavigation.js";
import { portfolioSlugFor } from "./portfolioPresentation.mjs";
import { isPlainLinkClick } from "../../shared/cardActivation.js";
import PortfolioProjectCard from "./PortfolioProjectCard.jsx";
import { usePortfolioStageHeight } from "./usePortfolioStageHeight.js";

const PORTFOLIO_DRAG_LIMIT = 140;
const PORTFOLIO_DRAG_ACTIVATION_THRESHOLD = 8;
const PORTFOLIO_CLICK_RELEASE_DELAY = 120;
const PORTFOLIO_TOUCH_AXIS_THRESHOLD = 6;
const PORTFOLIO_TOUCH_SWIPE_THRESHOLD = 42;
const PORTFOLIO_START_SLUG = "online-shop";
const PORTFOLIO_VISIBLE_RANGE = 2;

function clampPortfolioIndex(index, itemCount) {
  if (!itemCount) return 0;
  return Math.max(0, Math.min(index, itemCount - 1));
}

function clampPortfolioDragOffset(offset) {
  return Math.max(-PORTFOLIO_DRAG_LIMIT, Math.min(PORTFOLIO_DRAG_LIMIT, offset));
}

function findTouch(touchList, identifier) {
  return Array.from(touchList).find((touch) => touch.identifier === identifier);
}

function portfolioSlideLevel(index, activeIndex, itemCount) {
  if (!itemCount) return null;

  let offset = index - activeIndex;
  const halfCount = itemCount / 2;
  if (offset > halfCount) offset -= itemCount;
  if (offset < -halfCount) offset += itemCount;

  if (Math.abs(offset) > PORTFOLIO_VISIBLE_RANGE) return null;
  return -offset;
}

function usePortfolioCarousel(itemCount, initialIndex = 0) {
  const [activePortfolioIndex, setActivePortfolioIndex] = React.useState(() => (
    clampPortfolioIndex(initialIndex, itemCount)
  ));
  const [isPortfolioDragging, setIsPortfolioDragging] = React.useState(false);
  const activePortfolioIndexRef = React.useRef(activePortfolioIndex);
  const hasPortfolioInteractionRef = React.useRef(false);
  const portfolioDragStartRef = React.useRef(0);
  const portfolioDragOffsetRef = React.useRef(0);
  const portfolioDragFrameRef = React.useRef(null);
  const portfolioDragPointerRef = React.useRef(null);
  const portfolioTouchAxisRef = React.useRef(null);
  const portfolioTouchIdentifierRef = React.useRef(null);
  const portfolioTouchStartRef = React.useRef({ x: 0, y: 0 });
  const portfolioSuppressClickRef = React.useRef(false);
  const portfolioSettleTimerRef = React.useRef(null);
  const portfolioClickTimerRef = React.useRef(null);
  const portfolioTrackRef = React.useRef(null);

  const goToPortfolioSlide = React.useCallback((index) => {
    const targetIndex = clampPortfolioIndex(index, itemCount);
    hasPortfolioInteractionRef.current = true;
    activePortfolioIndexRef.current = targetIndex;
    setActivePortfolioIndex(targetIndex);
  }, [itemCount]);

  React.useEffect(() => {
    const targetIndex = clampPortfolioIndex(
      hasPortfolioInteractionRef.current ? activePortfolioIndexRef.current : initialIndex,
      itemCount,
    );
    activePortfolioIndexRef.current = targetIndex;
    setActivePortfolioIndex(targetIndex);
  }, [initialIndex, itemCount]);

  const movePortfolioSlide = React.useCallback((direction) => {
    if (!itemCount) return;
    const targetIndex = (
      activePortfolioIndexRef.current + direction + itemCount
    ) % itemCount;
    hasPortfolioInteractionRef.current = true;
    activePortfolioIndexRef.current = targetIndex;
    setActivePortfolioIndex(targetIndex);
  }, [itemCount]);

  React.useEffect(() => () => {
    if (portfolioDragFrameRef.current !== null) {
      cancelAnimationFrame(portfolioDragFrameRef.current);
    }
    clearTimeout(portfolioSettleTimerRef.current);
    clearTimeout(portfolioClickTimerRef.current);
  }, []);

  const paintPortfolioDragOffset = React.useCallback((offset) => {
    portfolioDragOffsetRef.current = offset;
    if (portfolioDragFrameRef.current !== null) return;

    portfolioDragFrameRef.current = requestAnimationFrame(() => {
      portfolioTrackRef.current?.style.setProperty(
        "--portfolio-drag-offset",
        `${portfolioDragOffsetRef.current}px`,
      );
      portfolioDragFrameRef.current = null;
    });
  }, []);

  const settlePortfolioDrag = React.useCallback(() => {
    portfolioDragOffsetRef.current = 0;
    clearTimeout(portfolioSettleTimerRef.current);
    portfolioSettleTimerRef.current = setTimeout(() => {
      portfolioTrackRef.current?.style.setProperty("--portfolio-drag-offset", "0px");
      portfolioSettleTimerRef.current = null;
    }, 0);
  }, []);

  const releasePortfolioClick = React.useCallback(() => {
    if (!portfolioSuppressClickRef.current) return;
    clearTimeout(portfolioClickTimerRef.current);
    portfolioClickTimerRef.current = setTimeout(() => {
      portfolioSuppressClickRef.current = false;
      portfolioClickTimerRef.current = null;
    }, PORTFOLIO_CLICK_RELEASE_DELAY);
  }, []);

  const completePortfolioGesture = React.useCallback((offset, swipeThreshold) => {
    setIsPortfolioDragging(false);
    if (Math.abs(offset) >= swipeThreshold) {
      movePortfolioSlide(offset < 0 ? 1 : -1);
    }
    settlePortfolioDrag();
    releasePortfolioClick();
  }, [movePortfolioSlide, releasePortfolioClick, settlePortfolioDrag]);

  const cancelPortfolioGesture = React.useCallback(() => {
    setIsPortfolioDragging(false);
    settlePortfolioDrag();
    releasePortfolioClick();
  }, [releasePortfolioClick, settlePortfolioDrag]);

  const finishPortfolioDrag = React.useCallback((event) => {
    if (portfolioDragPointerRef.current !== event.pointerId) return;
    const offset = portfolioDragOffsetRef.current;
    const viewportWidth = event.currentTarget.getBoundingClientRect().width;
    const threshold = Math.min(72, Math.max(40, viewportWidth * 0.08));
    portfolioDragPointerRef.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    completePortfolioGesture(offset, threshold);
  }, [completePortfolioGesture]);

  const handlePortfolioPointerDown = React.useCallback((event) => {
    if (event.pointerType === "touch") return;
    if (!event.isPrimary || event.button > 0) return;
    portfolioDragStartRef.current = event.clientX;
    portfolioDragPointerRef.current = event.pointerId;
    portfolioSuppressClickRef.current = false;
    setIsPortfolioDragging(true);
    paintPortfolioDragOffset(0);
  }, [paintPortfolioDragOffset]);

  const handlePortfolioPointerMove = React.useCallback((event) => {
    if (portfolioDragPointerRef.current !== event.pointerId) return;
    const offset = event.clientX - portfolioDragStartRef.current;
    if (Math.abs(offset) > PORTFOLIO_DRAG_ACTIVATION_THRESHOLD) {
      portfolioSuppressClickRef.current = true;
      if (!event.currentTarget.hasPointerCapture?.(event.pointerId)) {
        event.currentTarget.setPointerCapture?.(event.pointerId);
      }
    }
    paintPortfolioDragOffset(clampPortfolioDragOffset(offset));
  }, [paintPortfolioDragOffset]);

  const handlePortfolioPointerCancel = React.useCallback((event) => {
    if (portfolioDragPointerRef.current !== event.pointerId) return;
    portfolioDragPointerRef.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    cancelPortfolioGesture();
  }, [cancelPortfolioGesture]);

  const handlePortfolioTouchStart = React.useCallback((event) => {
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    portfolioTouchIdentifierRef.current = touch.identifier;
    portfolioTouchStartRef.current = { x: touch.clientX, y: touch.clientY };
    portfolioTouchAxisRef.current = null;
    portfolioSuppressClickRef.current = false;
    setIsPortfolioDragging(true);
    paintPortfolioDragOffset(0);
  }, [paintPortfolioDragOffset]);

  const handlePortfolioTouchMove = React.useCallback((event) => {
    const touchIdentifier = portfolioTouchIdentifierRef.current;
    if (touchIdentifier === null) return;
    const touch = findTouch(event.touches, touchIdentifier);
    if (!touch) return;

    const offsetX = touch.clientX - portfolioTouchStartRef.current.x;
    const offsetY = touch.clientY - portfolioTouchStartRef.current.y;
    if (portfolioTouchAxisRef.current === null) {
      if (Math.max(Math.abs(offsetX), Math.abs(offsetY)) < PORTFOLIO_TOUCH_AXIS_THRESHOLD) return;
      portfolioTouchAxisRef.current = Math.abs(offsetX) > Math.abs(offsetY) ? "x" : "y";
    }
    if (portfolioTouchAxisRef.current !== "x") {
      setIsPortfolioDragging(false);
      return;
    }

    event.preventDefault();
    if (Math.abs(offsetX) > PORTFOLIO_DRAG_ACTIVATION_THRESHOLD) {
      portfolioSuppressClickRef.current = true;
    }
    paintPortfolioDragOffset(clampPortfolioDragOffset(offsetX));
  }, [paintPortfolioDragOffset]);

  const finishPortfolioTouch = React.useCallback((event) => {
    const touchIdentifier = portfolioTouchIdentifierRef.current;
    if (touchIdentifier === null) return;
    if (!findTouch(event.changedTouches, touchIdentifier)) return;

    const offset = portfolioDragOffsetRef.current;
    const wasHorizontal = portfolioTouchAxisRef.current === "x";
    portfolioTouchIdentifierRef.current = null;
    portfolioTouchAxisRef.current = null;
    completePortfolioGesture(
      offset,
      wasHorizontal ? PORTFOLIO_TOUCH_SWIPE_THRESHOLD : Number.POSITIVE_INFINITY,
    );
  }, [completePortfolioGesture]);

  const cancelPortfolioTouch = React.useCallback(() => {
    if (portfolioTouchIdentifierRef.current === null) return;

    portfolioTouchIdentifierRef.current = null;
    portfolioTouchAxisRef.current = null;
    cancelPortfolioGesture();
  }, [cancelPortfolioGesture]);

  const handlePortfolioKeyDown = React.useCallback((event) => {
    if (event.target !== event.currentTarget || !itemCount) return;

    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      movePortfolioSlide(event.key === "ArrowLeft" ? -1 : 1);
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      goToPortfolioSlide(event.key === "Home" ? 0 : itemCount - 1);
    }
  }, [goToPortfolioSlide, itemCount, movePortfolioSlide]);

  return {
    activePortfolioIndex,
    cancelPortfolioTouch,
    goToPortfolioSlide,
    handlePortfolioKeyDown,
    handlePortfolioPointerCancel,
    handlePortfolioPointerDown,
    handlePortfolioPointerMove,
    handlePortfolioTouchMove,
    handlePortfolioTouchStart,
    isPortfolioDragging,
    finishPortfolioDrag,
    finishPortfolioTouch,
    movePortfolioSlide,
    portfolioSuppressClickRef,
    portfolioTrackRef,
  };
}


export default function HomePortfolioSection({ t, language, homeOverviewCopy, onNavigate, contentsOnly = false }) {
  const { featuredItems: homePortfolioItems } = usePortfolioProjects(t, {
    fetchRemote: true,
    language,
  });
  const portfolioStartIndex = React.useMemo(() => {
    const preferredIndex = homePortfolioItems.findIndex(
      (item) => portfolioSlugFor(item) === PORTFOLIO_START_SLUG,
    );
    return preferredIndex >= 0 ? preferredIndex : 0;
  }, [homePortfolioItems]);
  const {
    activePortfolioIndex,
    cancelPortfolioTouch,
    goToPortfolioSlide,
    handlePortfolioKeyDown,
    handlePortfolioPointerCancel,
    handlePortfolioPointerDown,
    handlePortfolioPointerMove,
    handlePortfolioTouchMove,
    handlePortfolioTouchStart,
    isPortfolioDragging,
    finishPortfolioDrag,
    finishPortfolioTouch,
    movePortfolioSlide,
    portfolioSuppressClickRef,
    portfolioTrackRef,
  } = usePortfolioCarousel(homePortfolioItems.length, portfolioStartIndex);

  usePortfolioStageHeight(portfolioTrackRef, homePortfolioItems);

  const activePortfolioItem = homePortfolioItems[activePortfolioIndex];
  const activePortfolioPosition = homePortfolioItems.length ? activePortfolioIndex + 1 : 0;
  const portfolioPosition = `${activePortfolioPosition} / ${homePortfolioItems.length}`;
  const portfolioStatus = language === "ru"
    ? `${activePortfolioItem?.title || "Проект"}, проект ${activePortfolioPosition} из ${homePortfolioItems.length}`
    : language === "uk"
      ? `${activePortfolioItem?.title || "Проєкт"}, проєкт ${activePortfolioPosition} з ${homePortfolioItems.length}`
      : `${activePortfolioItem?.title || "Projekt"}, Projekt ${activePortfolioPosition} von ${homePortfolioItems.length}`;

  const contents = (
    <>
      <header className="portfolio-section__intro max-w-3xl">
        <h2 className="home-section-title mt-3 font-display text-3xl leading-tight sm:text-4xl">{t("home.portfolio.title")}</h2>
        <p className="mt-5 text-base leading-8 text-stone-700 sm:text-lg">
          {homeOverviewCopy.referencesIntro}
        </p>
      </header>
      <div className="portfolio-carousel mt-10" role="region" aria-roledescription="carousel" aria-label={language === "ru" ? "Выбранные проекты" : "Ausgewählte Referenzen"}>
        <div
          className={`portfolio-carousel__viewport${isPortfolioDragging ? " is-dragging" : ""}`}
          tabIndex={0}
          aria-label={language === "ru" ? "Используйте клавиши со стрелками для навигации по проектам" : "Projekte mit den Pfeiltasten wechseln"}
          onPointerDown={handlePortfolioPointerDown}
          onPointerMove={handlePortfolioPointerMove}
          onPointerUp={finishPortfolioDrag}
          onPointerCancel={handlePortfolioPointerCancel}
          onLostPointerCapture={handlePortfolioPointerCancel}
          onTouchStart={handlePortfolioTouchStart}
          onTouchMove={handlePortfolioTouchMove}
          onTouchEnd={finishPortfolioTouch}
          onTouchCancel={cancelPortfolioTouch}
          onKeyDown={handlePortfolioKeyDown}
        >
          <div ref={portfolioTrackRef} className="portfolio-carousel__track">
            {homePortfolioItems.map((item, index) => (
              <PortfolioProjectCard
                key={item.title}
                index={index}
                isActive={index === activePortfolioIndex}
                item={item}
                language={language}
                copy={t("home.portfolio.card")}
                liveHref={projectLiveHref(item)}
                level={portfolioSlideLevel(index, activePortfolioIndex, homePortfolioItems.length)}
                onNavigate={onNavigate}
                suppressClickRef={portfolioSuppressClickRef}
              />
            ))}
          </div>
        </div>
        <nav className="portfolio-carousel__controls" aria-label={language === "ru" ? "Навигация по проектам" : "Projektnavigation"}>
          <button
            type="button"
            className="portfolio-carousel__button"
            onClick={() => movePortfolioSlide(-1)}
            aria-label={language === "ru" ? "Предыдущий проект" : "Vorheriges Projekt"}
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="portfolio-carousel__dots" role="group" aria-label={language === "ru" ? "Выбрать проект" : "Projekt auswählen"}>
            {homePortfolioItems.map((item, index) => (
              <button
                key={item.title}
                type="button"
                className={`portfolio-carousel__dot${index === activePortfolioIndex ? " is-active" : ""}`}
                aria-label={`${item.title} ${index + 1}`}
                aria-current={index === activePortfolioIndex ? "true" : undefined}
                aria-pressed={index === activePortfolioIndex}
                onClick={() => goToPortfolioSlide(index)}
              />
            ))}
          </div>
          <span className="portfolio-carousel__counter" aria-hidden="true">{portfolioPosition}</span>
          <button
            type="button"
            className="portfolio-carousel__button"
            onClick={() => movePortfolioSlide(1)}
            aria-label={language === "ru" ? "Следующий проект" : "Nächstes Projekt"}
          >
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </nav>
        <p className="portfolio-carousel__status" aria-live="polite" aria-atomic="true">
          {portfolioStatus}
        </p>
        <footer className="portfolio-discover-panel">
          <a
            href="/projekte/"
            className="portfolio-contact-button portfolio-contact-button--projects"
            onClick={(event) => {
              if (!isPlainLinkClick(event)) return;
              event.preventDefault();
              onNavigate?.("/projekte");
            }}
          >
            <span className="portfolio-projects-cta__label">{homeOverviewCopy.referencesLink}</span>
            <span className="portfolio-projects-cta__arrows" aria-hidden="true">
              <svg viewBox="0 0 66 43" focusable="false">
                <path className="portfolio-projects-cta__arrow portfolio-projects-cta__arrow--one" d="M40.15 3.9 44 .14 65.7 21.5 44 42.86l-3.85-3.76L57 21.5 40.15 3.9Z" />
                <path className="portfolio-projects-cta__arrow portfolio-projects-cta__arrow--two" d="M20.15 3.9 24 .14 45.7 21.5 24 42.86l-3.85-3.76L37 21.5 20.15 3.9Z" />
                <path className="portfolio-projects-cta__arrow portfolio-projects-cta__arrow--three" d="M.15 3.9 4 .14 25.7 21.5 4 42.86.15 39.1 17 21.5.15 3.9Z" />
              </svg>
            </span>
          </a>
        </footer>
      </div>
    </>
  );
  return contentsOnly ? contents : (
    <section id="referenzen" className="portfolio-section w-full max-w-none px-3 py-11 sm:px-8 sm:py-16 lg:px-10">
      {contents}
    </section>
  );
}
