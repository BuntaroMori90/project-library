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
const TRIGGER_SCRUB_TRAVEL = 200;
const LAST_INDEX = letters.length - 1;

type ScrollStop = {
  index: number;
  top: number;
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
  const pendingIndex = useRef<number | null>(null);
  const scrollStopsRef = useRef<ScrollStop[]>([]);

  const gestureSource = useRef<GestureSource>(null);
  const gesturePointerId = useRef<number | null>(null);
  const gestureStartY = useRef(0);
  const gestureStartIndex = useRef(0);
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

    updateActiveLetter(letterForIndex(index));
    window.scrollTo(0, topForIndex(index, stops));
  }

  function scheduleIndex(rawIndex: number) {
    pendingIndex.current = clamp(rawIndex, 0, LAST_INDEX);
    if (animationFrame.current !== null) return;

    animationFrame.current = requestAnimationFrame(() => {
      animationFrame.current = null;
      const next = pendingIndex.current;
      if (next !== null) applyIndex(next);
    });
  }

  function jumpToLetter(letter: string) {
    const index = letters.indexOf(letter);
    if (index < 0) return;

    const stops = getScrollStops();
    scrollStopsRef.current = stops;
    updateActiveLetter(letter);
    window.scrollTo({ top: topForIndex(index, stops), behavior: "smooth" });
  }

  function startGesture(
    source: Exclude<GestureSource, null>,
    event: ReactPointerEvent<HTMLElement>,
  ) {
    const stops = getScrollStops();
    scrollStopsRef.current = stops;
    gestureSource.current = source;
    gesturePointerId.current = event.pointerId;
    gestureStartY.current = event.clientY;
    gestureStartIndex.current = indexForScroll(window.scrollY, stops);
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
    if (pendingIndex.current !== null && gestureMoved.current) {
      applyIndex(pendingIndex.current);
    }

    const source = gestureSource.current;
    const moved = gestureMoved.current;

    setDragging(false);
    gestureSource.current = null;
    gesturePointerId.current = null;
    railRectRef.current = null;
    pendingIndex.current = null;
    scrollStopsRef.current = [];

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
        const stops = getScrollStops();
        updateActiveLetter(letterForIndex(indexForScroll(window.scrollY, stops)));
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

      const deltaY = event.clientY - gestureStartY.current;
      const distance = Math.abs(deltaY);
      if (!gestureMoved.current && distance < DRAG_THRESHOLD) return;

      if (!gestureMoved.current) {
        gestureMoved.current = true;
        setDragging(true);
      }

      let index = gestureStartIndex.current;

      if (gestureSource.current === "rail") {
        const rect = railRectRef.current ?? railRef.current?.getBoundingClientRect();
        if (rect) {
          const progress = clamp(
            (event.clientY - rect.top) / Math.max(1, rect.height),
            0,
            1,
          );
          index = progress * LAST_INDEX;
        }
      } else if (deltaY >= 0) {
        const progress = clamp(deltaY / TRIGGER_SCRUB_TRAVEL, 0, 1);
        index =
          gestureStartIndex.current +
          (LAST_INDEX - gestureStartIndex.current) * progress;
      } else {
        const progress = clamp(-deltaY / TRIGGER_SCRUB_TRAVEL, 0, 1);
        index = gestureStartIndex.current * (1 - progress);
      }

      scheduleIndex(index);
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
