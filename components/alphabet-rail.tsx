"use client";

import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const LETTER_ORDER = ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
const PAGE_SCROLL_OFFSET = 104;

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
    [availableLetters],
  );

  const [dragging, setDragging] = useState(false);
  const [activeLetter, setActiveLetter] = useState(displayLetters[0] ?? "#");

  const railRef = useRef<HTMLElement>(null);
  const pointerIdRef = useRef<number | null>(null);
  const activeLetterRef = useRef(activeLetter);
  const stopsRef = useRef<ScrollStop[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const pendingIndexRef = useRef<number | null>(null);

  const updateActiveLetter = useCallback((letter: string) => {
    if (activeLetterRef.current === letter) return;
    activeLetterRef.current = letter;
    setActiveLetter(letter);
  }, []);

  const getStops = useCallback((): ScrollStop[] => {
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
            window.scrollY +
              target.getBoundingClientRect().top -
              PAGE_SCROLL_OFFSET,
            0,
            maxScroll,
          ),
        };
      })
      .filter((stop): stop is ScrollStop => Boolean(stop));

    for (let index = 1; index < stops.length; index += 1) {
      stops[index].top = Math.max(stops[index].top, stops[index - 1].top);
    }

    return stops;
  }, [displayLetters]);

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

  function applyIndex(rawIndex: number) {
    const stops = stopsRef.current.length ? stopsRef.current : getStops();
    if (!stops.length) return;

    const index = clamp(rawIndex, 0, stops.length - 1);
    const activeIndex = clamp(Math.round(index), 0, stops.length - 1);
    updateActiveLetter(stops[activeIndex].letter);
    window.scrollTo({ top: topForIndex(index, stops), behavior: "instant" });
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
    const buttons =
      railRef.current?.querySelectorAll<HTMLButtonElement>("button");
    if (!buttons?.length) return 0;
    const centers = Array.from(buttons, (button) => {
      const rect = button.getBoundingClientRect();
      return rect.top + rect.height / 2;
    });
    if (clientY <= centers[0]) return 0;
    for (let i = 1; i < centers.length; i++) {
      if (clientY <= centers[i])
        return (
          i -
          1 +
          (clientY - centers[i - 1]) / Math.max(1, centers[i] - centers[i - 1])
        );
    }
    return centers.length - 1;
  }

  function startGesture(event: ReactPointerEvent<HTMLElement>) {
    if (!event.isPrimary || event.button !== 0 || pointerIdRef.current !== null)
      return;
    const stops = getStops();
    if (!stops.length) return;

    stopsRef.current = stops;
    pointerIdRef.current = event.pointerId;
    setDragging(true);

    event.currentTarget.setPointerCapture(event.pointerId);
    applyIndex(indexFromPointer(event.clientY));
    event.preventDefault();
  }

  function finishGesture(pointerId: number, flush = true) {
    if (pointerIdRef.current !== pointerId) return;

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (flush && pendingIndexRef.current !== null) {
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
    window.scrollTo({
      top: stops[index].top,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }

  useEffect(() => {
    if (!displayLetters.length) return;
    if (!displayLetters.includes(activeLetterRef.current)) {
      updateActiveLetter(displayLetters[0]);
    }
  }, [displayLetters, updateActiveLetter]);

  useEffect(() => {
    const handleScroll = () => {
      if (pointerIdRef.current !== null || scrollFrameRef.current !== null)
        return;
      scrollFrameRef.current = requestAnimationFrame(() => {
        scrollFrameRef.current = null;
        if (pointerIdRef.current !== null) return;
        const stops = getStops();
        if (!stops.length) return;
        // The current section is the last heading to pass the fixed header.
        let current = 0;
        for (let i = 1; i < stops.length; i++) {
          if (window.scrollY + 2 >= stops[i].top) current = i;
          else break;
        }
        updateActiveLetter(stops[current].letter);
      });
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      if (scrollFrameRef.current !== null)
        cancelAnimationFrame(scrollFrameRef.current);
      scrollFrameRef.current = null;
    };
  }, [getStops, updateActiveLetter]);

  useEffect(
    () => () => {
      if (animationFrameRef.current !== null)
        cancelAnimationFrame(animationFrameRef.current);
    },
    [],
  );

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
        onPointerMove={(event) => {
          if (pointerIdRef.current !== event.pointerId) return;
          scheduleIndex(indexFromPointer(event.clientY));
          event.preventDefault();
        }}
        onPointerUp={(event) => finishGesture(event.pointerId)}
        onPointerCancel={(event) => finishGesture(event.pointerId, false)}
        onLostPointerCapture={(event) => finishGesture(event.pointerId, false)}
        style={{ "--alphabet-count": displayLetters.length, backdropFilter: "none", WebkitBackdropFilter: "none" } as CSSProperties}
      >
        {displayLetters.map((letter) => (
          <button
            key={letter}
            type="button"
            className={activeLetter === letter ? "active" : undefined}
            aria-label={`Vai alla lettera ${letter}`}
            aria-current={activeLetter === letter ? "location" : undefined}
            onClick={(event) => {
              // Pointer gestures already scroll; keep keyboard/assistive activation.
              if (event.detail === 0) jumpToLetter(letter);
            }}
          >
            {letter}
          </button>
        ))}
      </aside>
    </div>
  );
}
