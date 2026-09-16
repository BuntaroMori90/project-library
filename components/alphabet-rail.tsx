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
const PIXELS_PER_LETTER = 16;
const EDGE_ZONE = 42;
const EDGE_SPEED = 8;
const MAX_INDEX_SPEED = 32;
const LAST_INDEX = letters.length - 1;

type ScrollStop = {
  index: number;
  top: number;
};

type GestureSource = "trigger" | "rail" | null;

type GestureBounds = {
  top: number;
  bottom: number;
};

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
  const scrollStopsRef = useRef<ScrollStop[]>([]);

  const gestureSource = useRef<GestureSource>(null);
  const gesturePointerId = useRef<number | null>(null);
  const gestureStartY = useRef(0);
  const gestureStartIndex = useRef(0);
  const gestureStartOpen = useRef(false);
  const gestureMoved = useRef(false);
  const gestureTapLetter = useRef<string | null>(null);
  const gestureBounds = useRef<GestureBounds>({ top: 72, bottom: 640 });
  const lastPointerY = useRef(0);
  const edgeOffset = useRef(0);
  const renderedIndex = useRef(0);

  const scrubFrame = useRef<number | null>(null);
  const syncFrame = useRef<number | null>(null);
  const lastScrubTime = useRef<number | null>(null);

  function updateOpen(value: boolean) {
    openRef.current = value;
    setOpen(value);
  }

  function updateActiveLetter(letter: string) {
    if (activeLetterRef.current === letter) return;
    activeLetterRef.current = letter;
    setActiveLetter(letter);
  }

  function getScrollStops(): ScrollStop[] {
    const maxScroll = Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight,
    );

    const realStops = availableLetters
      .map((letter) => {
        const normalized = letter.toUpperCase();
        const index = letters.indexOf(normalized);
        const target = document.getElementById(`letter-${normalized}`);
        if (index < 0 || !target) return null;

        const top = clamp(
          window.scrollY + target.getBoundingClientRect().top - PAGE_SCROLL_OFFSET,
          0,
          maxScroll,
        );
        return { index, top };
      })
      .filter((stop): stop is ScrollStop => Boolean(stop))
      .sort((a, b) => a.index - b.index);

    if (!realStops.length) {
      return [
        { index: 0, top: 0 },
        { index: LAST_INDEX, top: maxScroll },
      ];
    }

    const firstTop = realStops[0].top;
    const stops = [...realStops];

    if (stops[0].index !== 0) {
      stops.unshift({ index: 0, top: firstTop });
    } else {
      stops[0] = { index: 0, top: firstTop };
    }

    const last = stops.at(-1)!;
    if (last.index !== LAST_INDEX) {
      stops.push({ index: LAST_INDEX, top: maxScroll });
    } else {
      last.top = maxScroll;
    }

    return stops;
  }

  function topForIndex(rawIndex: number, stops: ScrollStop[]) {
    const index = clamp(rawIndex, 0, LAST_INDEX);
    if (index <= stops[0].index) return stops[0].top;
    if (index >= stops.at(-1)!.index) return stops.at(-1)!.top;

    let previous = stops[0];
    let next = stops.at(-1)!;

    for (let i = 1; i < stops.length; i += 1) {
      if (stops[i].index >= index) {
        previous = stops[i - 1];
        next = stops[i];
        break;
      }
    }

    const span = next.index - previous.index;
    if (span <= 0) return previous.top;
    const progress = (index - previous.index) / span;
    return previous.top + (next.top - previous.top) * progress;
  }

  function indexForScroll(scrollY: number, stops = getScrollStops()) {
    if (!stops.length) return 0;
    if (scrollY <= stops[0].top) return stops[0].index;
    if (scrollY >= stops.at(-1)!.top) return stops.at(-1)!.index;

    let previous = stops[0];
    let next = stops.at(-1)!;

    for (let i = 1; i < stops.length; i += 1) {
      if (stops[i].top >= scrollY) {
        previous = stops[i - 1];
        next = stops[i];
        break;
      }
    }

    const span = next.top - previous.top;
    if (span <= 1) return next.index;
    const progress = (scrollY - previous.top) / span;
    return previous.index + (next.index - previous.index) * progress;
  }

  function letterForIndex(rawIndex: number) {
    const index = clamp(Math.round(rawIndex), 0, LAST_INDEX);
    return letters[index];
  }

  function applyIndex(rawIndex: number) {
    const index = clamp(rawIndex, 0, LAST_INDEX);
    const stops = scrollStopsRef.current.length
      ? scrollStopsRef.current
      : getScrollStops();
    const top = topForIndex(index, stops);

    renderedIndex.current = index;
    updateActiveLetter(letterForIndex(index));

    const scroller = document.scrollingElement;
    if (scroller) {
      scroller.scrollTop = top;
    } else {
      window.scrollTo(0, top);
    }
  }

  function jumpToLetter(letter: string) {
    const index = letters.indexOf(letter);
    if (index < 0) return;

    const stops = getScrollStops();
    scrollStopsRef.current = stops;
    renderedIndex.current = index;
    updateActiveLetter(letter);
    window.scrollTo({ top: topForIndex(index, stops), behavior: "smooth" });
  }

  function currentEdgeVelocity(pointerY: number) {
    const bounds = gestureBounds.current;

    if (pointerY <= bounds.top + EDGE_ZONE) {
      const strength = clamp(
        (bounds.top + EDGE_ZONE - pointerY) / EDGE_ZONE,
        0,
        1,
      );
      return -EDGE_SPEED * strength * strength;
    }

    if (pointerY >= bounds.bottom - EDGE_ZONE) {
      const strength = clamp(
        (pointerY - (bounds.bottom - EDGE_ZONE)) / EDGE_ZONE,
        0,
        1,
      );
      return EDGE_SPEED * strength * strength;
    }

    return 0;
  }

  function desiredIndex() {
    const pointerDelta = lastPointerY.current - gestureStartY.current;
    return clamp(
      gestureStartIndex.current +
        pointerDelta / PIXELS_PER_LETTER +
        edgeOffset.current,
      0,
      LAST_INDEX,
    );
  }

  function runScrubFrame(time: number) {
    if (gestureSource.current === null || !gestureMoved.current) {
      scrubFrame.current = null;
      lastScrubTime.current = null;
      return;
    }

    const previousTime = lastScrubTime.current ?? time;
    const deltaSeconds = Math.min(0.05, Math.max(0, (time - previousTime) / 1000));
    lastScrubTime.current = time;

    const edgeVelocity = currentEdgeVelocity(lastPointerY.current);
    if (edgeVelocity !== 0 && deltaSeconds > 0) {
      edgeOffset.current += edgeVelocity * deltaSeconds;
    }

    const target = desiredIndex();
    const current = renderedIndex.current;
    const difference = target - current;

    if (Math.abs(difference) > 0.002) {
      const maxStep = Math.max(0.12, MAX_INDEX_SPEED * Math.max(deltaSeconds, 1 / 120));
      const next =
        Math.abs(difference) <= maxStep
          ? target
          : current + Math.sign(difference) * maxStep;
      applyIndex(next);
    }

    scrubFrame.current = requestAnimationFrame(runScrubFrame);
  }

  function ensureScrubLoop() {
    if (scrubFrame.current !== null) return;
    lastScrubTime.current = null;
    scrubFrame.current = requestAnimationFrame(runScrubFrame);
  }

  function startGesture(
    source: Exclude<GestureSource, null>,
    event: ReactPointerEvent<HTMLElement>,
  ) {
    const stops = getScrollStops();
    const currentIndex = indexForScroll(window.scrollY, stops);
    const railRect = railRef.current?.getBoundingClientRect() ?? null;

    scrollStopsRef.current = stops;
    gestureSource.current = source;
    gesturePointerId.current = event.pointerId;
    gestureStartY.current = event.clientY;
    gestureStartIndex.current = currentIndex;
    gestureStartOpen.current = openRef.current;
    gestureMoved.current = false;
    gestureTapLetter.current =
      (event.target as HTMLElement)
        .closest<HTMLElement>("[data-alphabet-letter]")
        ?.dataset.alphabetLetter ?? null;
    lastPointerY.current = event.clientY;
    edgeOffset.current = 0;
    renderedIndex.current = currentIndex;

    if (source === "rail" && railRect) {
      gestureBounds.current = {
        top: railRect.top,
        bottom: railRect.bottom,
      };
    } else {
      gestureBounds.current = {
        top: 72,
        bottom: Math.max(192, window.innerHeight - 84),
      };
    }

    updateOpen(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function finishGesture(pointerId: number) {
    if (gesturePointerId.current !== pointerId) return;

    const source = gestureSource.current;
    const moved = gestureMoved.current;
    const tapLetter = gestureTapLetter.current;

    if (scrubFrame.current !== null) {
      cancelAnimationFrame(scrubFrame.current);
      scrubFrame.current = null;
    }

    setDragging(false);
    gestureSource.current = null;
    gesturePointerId.current = null;
    gestureTapLetter.current = null;
    edgeOffset.current = 0;
    lastScrubTime.current = null;
    scrollStopsRef.current = [];

    if (source === "trigger" && !moved) {
      updateOpen(!gestureStartOpen.current);
    } else if (source === "rail" && !moved && tapLetter) {
      updateOpen(true);
      jumpToLetter(tapLetter);
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
      if (syncFrame.current !== null) return;

      syncFrame.current = requestAnimationFrame(() => {
        syncFrame.current = null;
        const stops = getScrollStops();
        const index = indexForScroll(window.scrollY, stops);
        renderedIndex.current = index;
        updateActiveLetter(letterForIndex(index));
      });
    };

    syncFromPage();
    window.addEventListener("scroll", syncFromPage, { passive: true });
    window.addEventListener("resize", syncFromPage);

    return () => {
      window.removeEventListener("scroll", syncFromPage);
      window.removeEventListener("resize", syncFromPage);
      if (syncFrame.current !== null) {
        cancelAnimationFrame(syncFrame.current);
      }
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

      lastPointerY.current = event.clientY;
      const distance = Math.abs(event.clientY - gestureStartY.current);

      if (!gestureMoved.current && distance < DRAG_THRESHOLD) {
        event.preventDefault();
        return;
      }

      if (!gestureMoved.current) {
        gestureMoved.current = true;
        setDragging(true);
        ensureScrubLoop();
      }

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
      if (scrubFrame.current !== null) {
        cancelAnimationFrame(scrubFrame.current);
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
            onClick={(event) => event.preventDefault()}
          >
            {letter}
          </a>
        ))}
      </aside>
    </div>
  );
}
