"use client";

import { Check, Pencil } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

function syncSpecialVolumes() {
  const source = document.querySelector<HTMLElement>("#manga-special-volume-source");
  const stage = document.querySelector<HTMLElement>("#volumi");
  if (!source || !stage) return;

  const sourceCards = Array.from(
    source.querySelectorAll<HTMLElement>("[data-special-key]"),
  );
  if (!sourceCards.length) return;

  let grid = stage.querySelector<HTMLElement>(".volume-grid.volume-grid-visual");
  if (!grid) {
    grid = document.createElement("div");
    grid.className = "volume-grid volume-grid-visual special-volume-created-grid";
    grid.dataset.specialGridCreated = "true";
    const notice = stage.querySelector(".catalog-notice");
    if (notice) stage.insertBefore(grid, notice);
    else stage.appendChild(grid);
  }

  const desiredKeys = sourceCards.map((card) => card.dataset.specialKey ?? "");
  const currentCards = Array.from(
    grid.querySelectorAll<HTMLElement>("[data-injected-special-volume='true']"),
  );
  const currentKeys = currentCards.map((card) => card.dataset.specialKey ?? "");
  const alreadySynced =
    desiredKeys.length === currentKeys.length &&
    desiredKeys.every((key, index) => key === currentKeys[index]);

  if (!alreadySynced) {
    currentCards.forEach((card) => card.remove());
    sourceCards.forEach((card) => {
      const clone = card.cloneNode(true) as HTMLElement;
      clone.hidden = false;
      clone.dataset.injectedSpecialVolume = "true";
      const volumeNumber = clone.dataset.volumeNumber;
      const sameVolume = Array.from(grid?.children ?? []).filter((child) => {
        const element = child as HTMLElement;
        if (
          element.dataset.injectedSpecialVolume === "true" &&
          element.dataset.volumeNumber === volumeNumber
        ) {
          return true;
        }
        if (element.classList.contains("variant-volume")) return false;
        const spine = element.querySelector(".volume-spine span")?.textContent;
        return Number(spine) === Number(volumeNumber);
      });
      const anchor = sameVolume.at(-1) as HTMLElement | undefined;
      if (anchor) anchor.insertAdjacentElement("afterend", clone);
      else grid?.appendChild(clone);
    });
  }

  const heading = stage.querySelector<HTMLElement>(".section-heading > span:last-child");
  if (heading) {
    const currentText = heading.textContent?.trim() ?? "";
    const base =
      heading.dataset.specialBaseLabel ??
      currentText.replace(/\s·\s\+\d+\s(?:speciale|speciali)$/, "");
    heading.dataset.specialBaseLabel = base;
    const suffix = sourceCards.length === 1 ? "speciale" : "speciali";
    const wanted = `${base} · +${sourceCards.length} ${suffix}`;
    if (heading.textContent !== wanted) heading.textContent = wanted;
  }
}

function cleanupSpecialVolumes() {
  document
    .querySelectorAll<HTMLElement>("[data-injected-special-volume='true']")
    .forEach((card) => card.remove());
  document
    .querySelectorAll<HTMLElement>("[data-special-grid-created='true']")
    .forEach((grid) => grid.remove());
  document
    .querySelectorAll<HTMLElement>("[data-special-base-label]")
    .forEach((heading) => {
      const base = heading.dataset.specialBaseLabel;
      if (base) heading.textContent = base;
      delete heading.dataset.specialBaseLabel;
    });
}

export function DetailAppMode() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const body = document.body;
    let frame = 0;

    const sync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const hasDetail = Boolean(document.querySelector(".work-detail-v2"));
        setActive(hasDetail);
        body.classList.toggle("detail-app-shell", hasDetail);
        if (hasDetail) syncSpecialVolumes();
      });
    };

    setEditing(false);
    body.classList.remove("detail-edit-mode");
    sync();

    const observer = new MutationObserver(sync);
    observer.observe(body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      cleanupSpecialVolumes();
      body.classList.remove("detail-edit-mode", "detail-app-shell");
    };
  }, [pathname]);

  if (!active) return null;

  const toggleEditing = () => {
    setEditing((current) => {
      const next = !current;
      document.body.classList.toggle("detail-edit-mode", next);
      return next;
    });
  };

  return (
    <button
      type="button"
      className={`detail-edit-fab ${editing ? "active" : ""}`}
      onClick={toggleEditing}
      aria-pressed={editing}
      aria-label={editing ? "Chiudi modifica scheda" : "Modifica scheda"}
    >
      {editing ? <Check size={17} /> : <Pencil size={17} />}
      <span>{editing ? "Fine" : "Modifica"}</span>
    </button>
  );
}
