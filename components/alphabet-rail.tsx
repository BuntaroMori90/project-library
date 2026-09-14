"use client";

import { useMemo, useState } from "react";

const letters = ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];

export function AlphabetRail({
  availableLetters = [],
}: {
  availableLetters?: string[];
}) {
  const [open, setOpen] = useState(false);
  const available = useMemo(
    () => new Set(availableLetters.map((letter) => letter.toUpperCase())),
    [availableLetters],
  );
  const hasAvailability = available.size > 0;

  return (
    <div className={`alphabet-rail-shell ${open ? "open" : ""}`}>
      <button
        type="button"
        className="alphabet-rail-trigger"
        aria-label={open ? "Chiudi indice alfabetico" : "Apri indice alfabetico"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span>A–Z</span>
      </button>

      <aside className="alphabet-rail" aria-label="Indice alfabetico">
        {letters.map((letter) => {
          const enabled = !hasAvailability || available.has(letter);
          if (!enabled) {
            return (
              <span
                key={letter}
                className="alphabet-letter-disabled"
                aria-hidden="true"
              >
                {letter}
              </span>
            );
          }

          return (
            <a
              key={letter}
              href={`#letter-${letter}`}
              onClick={() => setOpen(false)}
            >
              {letter}
            </a>
          );
        })}
      </aside>
    </div>
  );
}
