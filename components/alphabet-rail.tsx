"use client";

import {
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const letters = ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
const PAGE_SCROLL_OFFSET = 104;
const DRAG_THRESHOLD = 5;

type ScrollStop = {
  letter: string;
  alphabetIndex: number;
  top: number;
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
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const railRef = useRef<HTMLElement>(null);
  const animationFrame = useRef<number | null>(null);
  const pendingPointerY = useRef<number | null>(null);
  const dragStops = useRef<ScrollStop[]>([]);
  const pointerStartY = useRef<number | null>(null);
  const pointerMoved = useRef(false);
  const activeLetterRef = useRef<string | null>(null);
  const triggerGestureActive = useRef(false);
  const triggerWasOpen = useRef(false);

  const available = useMemo(
    () => new Set(availableLetters.map((letter) => letter.toUpperCase())),
    [availableLetters],
  );
  const hasAvailability = available.size > 0;
  const enabledLetters = useMemo(
    () => letters.filter((letter) => !hasAvailability || available.has(letter)),
    [available, hasAvailability],
  );

  function updateActiveLetter(letter: string | null) {
    if (activeLetterRef.current === letter) return;
    activeLetterRef.current = letter;
    setActiveLetter(letter);
  }

  function getScrollStops(): ScrollStop[] {
    const maxScroll = Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight,
    );

    return enabledLetters.flatMap((letter) => {
      const target = document.getElementById(`letter-${letter}`);
      if (!target) return [];

      return [
        {
          letter,
          alphabetIndex: letters.indexOf(letter),
          top: clamp(
            window.scrollY + target.getBoundingClientRect().top - PAGE_SCROLL_OFFSET,
            0,
            maxScroll,
          ),
        },
      ];
    });
  }

  function nearestEnabledLetter(rawIndex: number, stops: ScrollStop[]) {
    if (!stops.length) return null;

    let nearest = stops[0];
    let distance = Math.abs(rawIndex - nearest.alphabetIndex);

    for (const stop of stops.slice(1)) {
      const nextDistance = Math.abs(rawIndex - stop.alphabetIndex);
      if (nextDistance < distance) {
        nearest = stop;
        distance = nextDistance;
      }
    }

    return nearest.letter;
  }

  function interpolatedScrollTop(rawIndex: number, stops: ScrollStop[]) {
    if (!stops.length) return null;
    if (rawIndex <= stops[0].alphabetIndex) return stops[0].top;
    if (rawIndex >= stops.at(-1)!.alphabetIndex) return stops.at(-1)!.top;

    let previous = stops[0];
    let next = stops.at(-1)!;

    for (let index = 1; index < stops.length; index += 1) {
      if (stops[index].alphabetIndex >= rawIndex) {
        next = stops[index];
        previous = stops[index - 1];
        break;
      }
    }

    const span = next.alphabetIndex - previous.alphabetIndex;
    if (span <= 0) return previous.top;

    const progress = (rawIndex - previous.alphabetIndex) / span;
    return previous.top + (next.top - previous.top) * progress;
  }

  function scrubAt(clientY: number) {
    const rail = railRef.current;
    if (!rail) return;

    const rect = rail.getBoundingClientRect();
    const progress = clamp((clientY - rect.top) / Math.max(1, rect.height), 0, 1);
    const rawIndex = progress * (letters.length - 1);
    const stops = dragStops.current.length ? dragStops.current : getScrollStops();
    const top = interpolatedScrollTop(rawIndex, stops);
    const nearest = nearestEnabledLetter(rawIndex, stops);

    updateActiveLetter(nearest);
    if (top !== null) window.scrollTo(0, top);
  }

  function scheduleScrub(clientY: number) {
    pendingPointerY.current = clientY;
    if (animationFrame.current !== null) return;

    animationFrame.current = requestAnimationFrame(() => {
      animationFrame.current = null;
      const pendingY = pendingPointerY.current;
      if (pendingY !== null) scrubAt(pendingY);
    });
  }

  function scrollToLetter(letter: string, behavior: ScrollBehavior = "smooth") {
    const target = document.getElementById(`letter-${letter}`);
    if (!target) return;

    const top = window.scrollY + target.getBoundingClientRect().top - PAGE_SCROLL_OFFSET;
    window.scrollTo({ top: Math.max(0, top), behavior });
    updateActiveLetter(letter);
  }

  useEffect(() => {
    if (open) railRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [open]);

  useEffect(() => {
    let frame = 0;

    const syncActiveLetter = () => {
      if (dragging) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!enabledLetters.length) {
          updateActiveLetter(null);
          return;
        }

        let current = enabledLetters[0];
        for (const letter of enabledLetters) {
          const target = document.getElementById(`letter-${letter}`);
          if (!target) continue;
          if (target.getBoundingClientRect().top <= PAGE_SCROLL_OFFSET + 18) {
            current = letter;
          } else {
            break;
          }
        }
        updateActiveLetter(current);
      });
    };

    syncActiveLetter();
    window.addEventListener("scroll", syncActiveLetter, { passive: true });
    window.addEventListener("resize", syncActiveLetter);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", syncActiveLetter);
      window.removeEventListener("resize", syncActiveLetter);
    };
  }, [enabledLetters, dragging]);

  useEffect(
    () => () => {
      if (animationFrame.current !== null) {
        cancelAnimationFrame(animationFrame.current);
      }
    },
    [],
  );

  function prepareGesture(clientY: number) {
    pointerStartY.current = clientY;
    pointerMoved.current = false;
    pendingPointerY.current = clientY;
    dragStops.current = getScrollStops();
  }

  function endGesture(event: ReactPointerEvent<HTMLElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    pointerStartY.current = null;
    pendingPointerY.current = null;
    dragStops.current = [];
    triggerGestureActive.current = false;
  }

  function handleRailPointerDown(event: ReactPointerEvent<HTMLElement>) {
    prepareGesture(event.clientY);
    setOpen(true);
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    scheduleScrub(event.clientY);
    event.preventDefault();
  }

  function handleRailPointerMove(event: ReactPointerEvent<HTMLElement>) {
    if (!dragging) return;

    if (
      pointerStartY.current !== null &&
      Math.abs(event.clientY - pointerStartY.current) > 3
    ) {
      pointerMoved.current = true;
    }

    scheduleScrub(event.clientY);
    event.preventDefault();
  }

  function finishRailScrub(event: ReactPointerEvent<HTMLElement>) {
    if (!dragging) return;

    if (animationFrame.current !== null) {
      cancelAnimationFrame(animationFrame.current);
      animationFrame.current = null;
    }
    scrubAt(event.clientY);
    setDragging(false);
    endGesture(event);
  }

  function handleTriggerPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    triggerGestureActive.current = true;
    triggerWasOpen.current = open;
    prepareGesture(event.clientY);
    setOpen(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function handleTriggerPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!triggerGestureActive.current || pointerStartY.current === null) return;

    const distance = Math.abs(event.clientY - pointerStartY.current);
    if (distance < DRAG_THRESHOLD && !pointerMoved.current) return;

    if (!pointerMoved.current) {
      pointerMoved.current = true;
      setDragging(true);
    }

    scheduleScrub(event.clientY);
    event.preventDefault();
  }

  function finishTriggerGesture(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!triggerGestureActive.current) return;

    const wasDrag = pointerMoved.current;

    if (wasDrag) {
      if (animationFrame.current !== null) {
        cancelAnimationFrame(animationFrame.current);
        animationFrame.current = null;
      }
      scrubAt(event.clientY);
      setDragging(false);
      setOpen(true);
    } else {
      setOpen(!triggerWasOpen.current);
    }

    endGesture(event);
  }

  return (
    <div
      className={`alphabet-rail-shell ${open ? "open" : ""} ${dragging ? "scrubbing" : ""}`}
    >
      <button
        type="button"
        className="alphabet-rail-trigger"
        aria-label={open ? "Chiudi indice alfabetico" : "Apri indice alfabetico"}
        aria-expanded={open}
        onPointerDown={handleTriggerPointerDown}
        onPointerMove={handleTriggerPointerMove}
        onPointerUp={finishTriggerGesture}
        onPointerCancel={finishTriggerGesture}
      >
        <span>A–Z</span>
      </button>

      {dragging && activeLetter ? (
        <div className="alphabet-scrub-bubble" aria-hidden="true">
          {activeLetter}
        </div>
      ) : null}

      <aside
        ref={railRef}
        className="alphabet-rail"
        aria-label="Indice alfabetico"
        onPointerDown={handleRailPointerDown}
        onPointerMove={handleRailPointerMove}
        onPointerUp={finishRailScrub}
        onPointerCancel={finishRailScrub}
      >
        {letters.map((letter) => {
          const enabled = !hasAvailability || available.has(letter);
          if (!enabled) {
            return (
              <span
                key={letter}
                className="alphabet-letter-disabled"
                aria-hidden="true"
                data-alphabet-letter={letter}
                data-alphabet-enabled="false"
              >
                {letter}
              </span>
            );
          }

          return (
            <a
              key={letter}
              href={`#letter-${letter}`}
              className={activeLetter === letter ? "active" : undefined}
              data-alphabet-letter={letter}
              data-alphabet-enabled="true"
              aria-current={activeLetter === letter ? "location" : undefined}
              onClick={(event) => {
                event.preventDefault();
                if (pointerMoved.current) {
                  pointerMoved.current = false;
                  return;
                }
                scrollToLetter(letter);
              }}
            >
              {letter}
            </a>
          );
        })}
      </aside>
    </div>
  );
}
