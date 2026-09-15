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

export function AlphabetRail({
  availableLetters = [],
}: {
  availableLetters?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const railRef = useRef<HTMLElement>(null);
  const lastScrubbedLetter = useRef<string | null>(null);
  const pointerStartY = useRef<number | null>(null);
  const pointerMoved = useRef(false);

  const available = useMemo(
    () => new Set(availableLetters.map((letter) => letter.toUpperCase())),
    [availableLetters],
  );
  const hasAvailability = available.size > 0;
  const enabledLetters = useMemo(
    () => letters.filter((letter) => !hasAvailability || available.has(letter)),
    [available, hasAvailability],
  );

  useEffect(() => {
    if (open) railRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [open]);

  useEffect(() => {
    let frame = 0;

    const syncActiveLetter = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!enabledLetters.length) {
          setActiveLetter(null);
          return;
        }

        let current = enabledLetters[0];
        for (const letter of enabledLetters) {
          const target = document.getElementById(`letter-${letter}`);
          if (!target) continue;
          if (target.getBoundingClientRect().top <= PAGE_SCROLL_OFFSET + 10) {
            current = letter;
          } else {
            break;
          }
        }
        setActiveLetter(current);
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
  }, [enabledLetters]);

  function scrollToLetter(letter: string, behavior: ScrollBehavior = "auto") {
    const target = document.getElementById(`letter-${letter}`);
    if (!target) return;

    const top = window.scrollY + target.getBoundingClientRect().top - PAGE_SCROLL_OFFSET;
    window.scrollTo({ top: Math.max(0, top), behavior });
    setActiveLetter(letter);
  }

  function nearestEnabledLetter(clientY: number) {
    const rail = railRef.current;
    if (!rail) return null;

    const nodes = Array.from(
      rail.querySelectorAll<HTMLElement>("[data-alphabet-enabled='true']"),
    );
    if (!nodes.length) return null;

    let nearest: HTMLElement | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const node of nodes) {
      const rect = node.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const distance = Math.abs(clientY - center);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = node;
      }
    }

    return nearest?.dataset.alphabetLetter ?? null;
  }

  function scrubAt(clientY: number) {
    const letter = nearestEnabledLetter(clientY);
    if (!letter || letter === lastScrubbedLetter.current) return;
    lastScrubbedLetter.current = letter;
    scrollToLetter(letter, "auto");
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLElement>) {
    pointerStartY.current = event.clientY;
    pointerMoved.current = false;
    lastScrubbedLetter.current = null;
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    scrubAt(event.clientY);
    event.preventDefault();
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLElement>) {
    if (!dragging) return;
    if (
      pointerStartY.current !== null &&
      Math.abs(event.clientY - pointerStartY.current) > 4
    ) {
      pointerMoved.current = true;
    }
    scrubAt(event.clientY);
    event.preventDefault();
  }

  function finishScrub(event: ReactPointerEvent<HTMLElement>) {
    if (!dragging) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragging(false);
    lastScrubbedLetter.current = null;
    pointerStartY.current = null;

    if (window.matchMedia("(max-width: 760px)").matches) {
      window.setTimeout(() => setOpen(false), 90);
    }
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
        onClick={() => setOpen((value) => !value)}
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
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishScrub}
        onPointerCancel={finishScrub}
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
                scrollToLetter(letter, "smooth");
                setOpen(false);
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
