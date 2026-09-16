"use client";

import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const LETTER_ORDER = ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
const PAGE_SCROLL_OFFSET = 104;
const DRAG_THRESHOLD = 3;

type ScrollStop = {
  letter: string;
  top: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeLetters(values: string[]) {
  const unique = new Set(
    values
      .map((value) => value.trim().toUpperCase())
      .filter((value) => LETTER_ORDER.includes(value)),
  );

  return LETTER_ORDER.filter((letter) => unique.has(letter));
}

export function AlphabetRail({
  availableLetters = [],
}: {
  availableLetters?: string[];
}) {
  const displayLetters = useMemo(
    () => normalizeLetters(availableLetters),
    [availableLetters.join("|")],
  );

  const [dragging, setDragging] = useState(false);
  const [activeLetter, setActiveLetter] = useState(
    displayLetters[0] ?? "#",
  );

  const railRef = useRef<HTMLElement>(null);
  const pointerIdRef = useRef<number | null>(null);
  const pointerStartYRef = useRef(0);
  const pointerMovedRef = useRef(false);
  const activeLetterRef = useRef(activeLetter);
  const stopsRef = useRef<ScrollStop[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const pendingIndexRef = useRef<number | null>(null);

  function updateActiveLetter(letter: string) {
    if (activeLetterRef.current === letter) return;
    activeLetterRef.current = letter;
    setActiveLetter(letter);
  }

  function getStops(): ScrollStop[] {
    const maxScroll = Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight,
    );

    const stops = displayLetters
      .map((letter) => {
        const target = document.getElementById(`letter-${letter}`);
        if (!target) return null;

        return {
          letter,
          top: clamp(
            window.scrollY + target.getBoundingClientRect().top - PAGE_SCROLL_OFFSET,
            0,
            maxScroll,
          ),
        };
      })
      .filter((stop): stop is ScrollStop => Boolean(stop));

    for (let index = 1; index < stops.length; index += 1) {
      stops[index].top = Math.max(stops[index].top, stops[index - 1].top);
    }

    if (stops.length > 1) {
      stops[stops.length - 1].top = maxScroll;
    }

    return stops;
  }

  function topForIndex(rawIndex: number, stops: ScrollStop[]) {
    if (!stops.length) return window.scrollY;
    if (stops.length === 1) return stops[0].top;

    const index = clamp(rawIndex, 0, stops.length - 1);
    const lowerIndex = Math.floor(index);
    const upperIndex = Math.min(stops.length - 1, Math.ceil(index));

    if (lowerIndex === upperIndex) return stops[lowerIndex].top;

    const progress = index - lowerIndex;
    return (
      stops[lowerIndex].top +
      (stops[upperIndex].top - stops[lowerIndex].top) * progress
    );
  }

  function indexForScroll(scrollY: number, stops: ScrollStop[]) {
    if (stops.length <= 1) return 0;
    if (scrollY <= stops[0].top) return 0;
    if (scrollY >= stops[stops.length - 1].top) return stops.length - 1;

    for (let index = 1; index < stops.length; index += 1) {
      if (scrollY <= stops[index].top) {
        const previous = stops[index - 1];
        const next = stops[index];
        const span = next.top - previous.top;
        if (span <= 1) return index;
        return index - 1 + (scrollY - previous.top) / span;
      }
    }

    return stops.length - 1;
  }

  function applyIndex(rawIndex: number) {
    const stops = stopsRef.current.length ? stopsRef.current : getStops();
    if (!stops.length) return;

    const index = clamp(rawIndex, 0, stops.length - 1);
    const activeIndex = clamp(Math.round(index), 0, stops.length - 1);
    updateActiveLetter(stops[activeIndex].letter);
    window.scrollTo(0, topForIndex(index, stops));
  }

  function scheduleIndex(rawIndex: number) {
    pendingIndexRef.current = rawIndex;
    if (animationFrameRef.current !== null) return;

    animationFrameRef.current = requestAnimationFrame(() => {
      animationFrameRef.current = null;
      const next = pendingIndexRef.current;
      if (next !== null) applyIndex(next);
    });
  }

  function indexFromPointer(clientY: number) {
    const rect = railRef.current?.getBoundingClientRect();
    const stops = stopsRef.current;
    if (!rect || stops.length <= 1) return 0;

    const progress = clamp(
      (clientY - rect.top) / Math.max(1, rect.height),
      0,
      1,
    );
    return progress * (stops.length - 1);
  }

  function startGesture(event: ReactPointerEvent<HTMLElement>) {
    const stops = getStops();
    if (!stops.length) return;

    stopsRef.current = stops;
    pointerIdRef.current = event.pointerId;
    pointerStartYRef.current = event.clientY;
    pointerMovedRef.current = false;
    setDragging(true);

    event.currentTarget.setPointerCapture(event.pointerId);
    scheduleIndex(indexFromPointer(event.clientY));
    event.preventDefault();
  }

  function finishGesture(pointerId: number) {
    if (pointerIdRef.current !== pointerId) return;

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (pendingIndexRef.current !== null) {
      applyIndex(pendingIndexRef.current);
    }

    pointerIdRef.current = null;
    pendingIndexRef.current = null;
    stopsRef.current = [];
    setDragging(false);
  }

  function jumpToLetter(letter: string) {
    const stops = getStops();
    const index = stops.findIndex((stop) => stop.letter === letter);
    if (index < 0) return;

    updateActiveLetter(letter);
    window.scrollTo({ top: stops[index].top, behavior: "smooth" });
  }

  useEffect(() => {
    if (!displayLetters.length) return;
    if (!displayLetters.includes(activeLetterRef.current)) {
      updateActiveLetter(displayLetters[0]);
    }
  }, [displayLetters.join("|")]);

  useEffect(() => {
    const handleScroll = () => {
      if (pointerIdRef.current !== null) return;
      if (animationFrameRef.current !== null) return;

      animationFrameRef.current = requestAnimationFrame(() => {
        animationFrameRef.current = null;
        const stops = getStops();
        if (!stops.length) return;
        const index = indexForScroll(window.scrollY, stops);
        const activeIndex = clamp(Math.round(index), 0, stops.length - 1);
        updateActiveLetter(stops[activeIndex].letter);
      });
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [displayLetters.join("|")]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (pointerIdRef.current !== event.pointerId) return;

      if (
        !pointerMovedRef.current &&
        Math.abs(event.clientY - pointerStartYRef.current) >= DRAG_THRESHOLD
      ) {
        pointerMovedRef.current = true;
      }

      scheduleIndex(indexFromPointer(event.clientY));
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
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [displayLetters.join("|")]);

  if (displayLetters.length < 2) return null;

  return (
    <div
      className={`alphabet-rail-shell alphabet-rail-persistent ${dragging ? "scrubbing" : ""}`}
    >
      {dragging ? (
        <div className="alphabet-scrub-bubble" aria-hidden="true">
          {activeLetter}
        </div>
      ) : null}

      <aside
        ref={railRef}
        className="alphabet-rail"
        aria-label="Indice alfabetico"
        onPointerDown={startGesture}
        style={{ "--alphabet-count": displayLetters.length } as CSSProperties}
      >
        {displayLetters.map((letter) => (
          <button
            key={letter}
            type="button"
            className={activeLetter === letter ? "active" : undefined}
            aria-label={`Vai alla lettera ${letter}`}
            aria-current={activeLetter === letter ? "location" : undefined}
            onClick={() => {
              if (pointerMovedRef.current) return;
              jumpToLetter(letter);
            }}
          >
            {letter}
          </button>
        ))}
      </aside>
    </div>
  );
}
