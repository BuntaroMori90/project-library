"use client";

import {
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";

const letters = ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
const PAGE_SCROLL_OFFSET = 104;
const DRAG_THRESHOLD = 4;

type CatalogRange = {
  start: number;
  end: number;
};

type GestureSource = "trigger" | "rail" | null;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function AlphabetRail({
  availableLetters = [],
}: {
  availableLetters?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [activeLetter, setActiveLetter] = useState("#");

  const railRef = useRef<HTMLElement>(null);
  const openRef = useRef(false);
  const activeLetterRef = useRef("#");
  const animationFrame = useRef<number | null>(null);
  const pendingProgress = useRef<number | null>(null);
  const catalogRangeRef = useRef<CatalogRange>({ start: 0, end: 0 });

  const gestureSource = useRef<GestureSource>(null);
  const gesturePointerId = useRef<number | null>(null);
  const gestureStartY = useRef(0);
  const gestureStartProgress = useRef(0);
  const gestureStartOpen = useRef(false);
  const gestureMoved = useRef(false);
  const railRectRef = useRef<DOMRect | null>(null);

  function updateOpen(value: boolean) {
    openRef.current = value;
    setOpen(value);
  }

  function updateActiveLetter(letter: string) {
    if (activeLetterRef.current === letter) return;
    activeLetterRef.current = letter;
    setActiveLetter(letter);
  }

  function getCatalogRange(): CatalogRange {
    const maxScroll = Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight,
    );

    const sections = availableLetters
      .map((letter) => document.getElementById(`letter-${letter.toUpperCase()}`))
      .filter((element): element is HTMLElement => Boolean(element));

    if (!sections.length) {
      return { start: 0, end: maxScroll };
    }

    let firstTop = Number.POSITIVE_INFINITY;
    let lastBottom = 0;

    for (const section of sections) {
      const rect = section.getBoundingClientRect();
      const absoluteTop = window.scrollY + rect.top;
      const absoluteBottom = window.scrollY + rect.bottom;
      firstTop = Math.min(firstTop, absoluteTop);
      lastBottom = Math.max(lastBottom, absoluteBottom);
    }

    const start = clamp(firstTop - PAGE_SCROLL_OFFSET, 0, maxScroll);
    const end = clamp(
      Math.max(start, lastBottom - window.innerHeight + 128),
      start,
      maxScroll,
    );

    return { start, end };
  }

  function progressForScroll(scrollY: number, range = getCatalogRange()) {
    const span = range.end - range.start;
    if (span <= 1) return 0;
    return clamp((scrollY - range.start) / span, 0, 1);
  }

  function letterForProgress(progress: number) {
    const index = clamp(
      Math.round(progress * (letters.length - 1)),
      0,
      letters.length - 1,
    );
    return letters[index];
  }

  function scrollForProgress(progress: number, range: CatalogRange) {
    return range.start + (range.end - range.start) * clamp(progress, 0, 1);
  }

  function applyProgress(progress: number) {
    const normalized = clamp(progress, 0, 1);
    const range = catalogRangeRef.current;
    const top = scrollForProgress(normalized, range);

    updateActiveLetter(letterForProgress(normalized));
    window.scrollTo(0, top);
  }

  function scheduleProgress(progress: number) {
    pendingProgress.current = clamp(progress, 0, 1);
    if (animationFrame.current !== null) return;

    animationFrame.current = requestAnimationFrame(() => {
      animationFrame.current = null;
      const next = pendingProgress.current;
      if (next !== null) applyProgress(next);
    });
  }

  function jumpToLetter(letter: string) {
    const index = letters.indexOf(letter);
    if (index < 0) return;

    const range = getCatalogRange();
    catalogRangeRef.current = range;
    const progress = index / (letters.length - 1);
    updateActiveLetter(letter);
    window.scrollTo({
      top: scrollForProgress(progress, range),
      behavior: "smooth",
    });
  }

  function startGesture(
    source: Exclude<GestureSource, null>,
    event: ReactPointerEvent<HTMLElement>,
  ) {
    const range = getCatalogRange();
    catalogRangeRef.current = range;
    gestureSource.current = source;
    gesturePointerId.current = event.pointerId;
    gestureStartY.current = event.clientY;
    gestureStartProgress.current = progressForScroll(window.scrollY, range);
    gestureStartOpen.current = openRef.current;
    gestureMoved.current = false;
    railRectRef.current = railRef.current?.getBoundingClientRect() ?? null;

    updateOpen(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function finishGesture(pointerId: number) {
    if (gesturePointerId.current !== pointerId) return;

    if (animationFrame.current !== null) {
      cancelAnimationFrame(animationFrame.current);
      animationFrame.current = null;
    }
    if (pendingProgress.current !== null && gestureMoved.current) {
      applyProgress(pendingProgress.current);
    }

    const source = gestureSource.current;
    const moved = gestureMoved.current;

    setDragging(false);
    gestureSource.current = null;
    gesturePointerId.current = null;
    railRectRef.current = null;
    pendingProgress.current = null;

    if (source === "trigger" && !moved) {
      updateOpen(!gestureStartOpen.current);
    } else if (moved) {
      updateOpen(true);
    }
  }

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    const syncFromPage = () => {
      if (gestureSource.current) return;
      if (animationFrame.current !== null) return;

      animationFrame.current = requestAnimationFrame(() => {
        animationFrame.current = null;
        const range = getCatalogRange();
        catalogRangeRef.current = range;
        const progress = progressForScroll(window.scrollY, range);
        updateActiveLetter(letterForProgress(progress));
      });
    };

    syncFromPage();
    window.addEventListener("scroll", syncFromPage, { passive: true });
    window.addEventListener("resize", syncFromPage);

    return () => {
      window.removeEventListener("scroll", syncFromPage);
      window.removeEventListener("resize", syncFromPage);
    };
  }, [availableLetters.join("|")]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (
        gestureSource.current === null ||
        gesturePointerId.current !== event.pointerId
      ) {
        return;
      }

      const distance = Math.abs(event.clientY - gestureStartY.current);
      if (!gestureMoved.current && distance < DRAG_THRESHOLD) return;

      if (!gestureMoved.current) {
        gestureMoved.current = true;
        setDragging(true);
      }

      let progress = gestureStartProgress.current;

      if (gestureSource.current === "rail") {
        const rect = railRectRef.current ?? railRef.current?.getBoundingClientRect();
        if (rect) {
          progress = clamp(
            (event.clientY - rect.top) / Math.max(1, rect.height),
            0,
            1,
          );
        }
      } else {
        const usableHeight = Math.max(220, window.innerHeight - 150);
        progress = clamp(
          gestureStartProgress.current +
            (event.clientY - gestureStartY.current) / usableHeight,
          0,
          1,
        );
      }

      scheduleProgress(progress);
      event.preventDefault();
    };

    const handlePointerEnd = (event: PointerEvent) => {
      finishGesture(event.pointerId);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", handlePointerEnd);
    window.addEventListener("pointercancel", handlePointerEnd);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerEnd);
      window.removeEventListener("pointercancel", handlePointerEnd);
      if (animationFrame.current !== null) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [availableLetters.join("|")]);

  return (
    <div
      className={`alphabet-rail-shell ${open ? "open" : ""} ${dragging ? "scrubbing" : ""}`}
    >
      <button
        type="button"
        className="alphabet-rail-trigger"
        aria-label={open ? "Chiudi indice alfabetico" : "Apri indice alfabetico"}
        aria-expanded={open}
        onPointerDown={(event) => startGesture("trigger", event)}
      >
        <span>A–Z</span>
      </button>

      {dragging ? (
        <div className="alphabet-scrub-bubble" aria-hidden="true">
          {activeLetter}
        </div>
      ) : null}

      <aside
        ref={railRef}
        className="alphabet-rail"
        aria-label="Indice alfabetico"
        onPointerDown={(event) => startGesture("rail", event)}
      >
        {letters.map((letter) => (
          <a
            key={letter}
            href={`#alphabet-${letter}`}
            className={activeLetter === letter ? "active" : undefined}
            data-alphabet-letter={letter}
            aria-current={activeLetter === letter ? "location" : undefined}
            onClick={(event) => {
              event.preventDefault();
              if (gestureMoved.current) return;
              jumpToLetter(letter);
            }}
          >
            {letter}
          </a>
        ))}
      </aside>
    </div>
  );
}
