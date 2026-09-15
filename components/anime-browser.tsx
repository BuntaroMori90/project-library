"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import type { DemoItem } from "@/lib/demo-data";
import type { Density, GroupBy } from "@/lib/preferences";

function creatorSortKey(creator: string) {
  const parts = creator.trim().split(/\s+/);
  return parts.at(-1) ?? creator;
}

function keyFor(item: DemoItem, groupBy: GroupBy) {
  return groupBy === "creator" ? creatorSortKey(item.creator) : item.title;
}

export function AnimeBrowser({
  items,
  defaultGroupBy,
  density,
}: {
  items: DemoItem[];
  defaultGroupBy: GroupBy;
  density: Density;
}) {
  const [query, setQuery] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>(defaultGroupBy);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (
      q
        ? items.filter((item) =>
            `${item.title} ${item.creator}`.toLowerCase().includes(q),
          )
        : items
    )
      .slice()
      .sort((a, b) =>
        keyFor(a, groupBy).localeCompare(keyFor(b, groupBy), "it", {
          sensitivity: "base",
        }),
      );
  }, [items, query, groupBy]);

  const safeIndex = filtered.length
    ? Math.min(selectedIndex, filtered.length - 1)
    : 0;
  const selected = filtered[safeIndex] ?? null;

  function changeQuery(value: string) {
    setQuery(value);
    setSelectedIndex(0);
  }

  function changeGroupBy(value: GroupBy) {
    setGroupBy(value);
    setSelectedIndex(0);
  }

  function previous() {
    if (!filtered.length) return;
    setSelectedIndex((current) =>
      current <= 0 ? filtered.length - 1 : current - 1,
    );
  }

  function next() {
    if (!filtered.length) return;
    setSelectedIndex((current) =>
      current >= filtered.length - 1 ? 0 : current + 1,
    );
  }

  return (
    <section className={`anime-browser anime-browser-tv-only density-${density}`}>
      <div className="library-toolbar anime-toolbar anime-tv-toolbar">
        <label className="search-control">
          <span className="sr-only">Cerca</span>
          <input
            value={query}
            onChange={(event) => changeQuery(event.target.value)}
            placeholder="Cerca anime, studio o titolo…"
          />
        </label>
        <div className="segmented">
          <button
            className={groupBy === "title" ? "active" : ""}
            onClick={() => changeGroupBy("title")}
            type="button"
          >
            Titolo
          </button>
          <button
            className={groupBy === "creator" ? "active" : ""}
            onClick={() => changeGroupBy("creator")}
            type="button"
          >
            Studio
          </button>
        </div>
      </div>

      {selected ? (
        <section className={`media-room tv-only-room ${selected.coverClass}`}>
          <div className="tv-frame tv-catalog-frame">
            <div className="tv-screen tv-catalog-screen">
              <div className="tv-catalog-poster">
                {selected.coverUrl ? (
                  <Image
                    src={selected.coverUrl}
                    alt={`Copertina di ${selected.title}`}
                    width={420}
                    height={630}
                    sizes="(max-width: 760px) 38vw, 210px"
                    priority
                  />
                ) : (
                  <div className="tv-poster-placeholder">
                    <span>{selected.title}</span>
                  </div>
                )}
              </div>
              <div className="tv-catalog-copy">
                <span className="eyebrow">La tua videoteca</span>
                <h2>{selected.title}</h2>
                <p className="tv-creator">{selected.creator}</p>
                <div className="tv-meta-line">
                  <strong>{selected.progress ?? selected.status ?? "Da vedere"}</strong>
                  {selected.meta ? <span>{selected.meta}</span> : null}
                </div>
                <Link
                  href={`/library/anime/${selected.id}`}
                  className="watch-button"
                >
                  Apri scheda
                </Link>
              </div>
            </div>

            <div className="tv-controls" aria-label="Naviga nella videoteca">
              <button type="button" onClick={previous} aria-label="Anime precedente">
                <ChevronLeft size={20} />
              </button>
              <div className="tv-channel-display">
                <span>{safeIndex + 1} / {filtered.length}</span>
                <strong>{selected.title}</strong>
              </div>
              <button type="button" onClick={next} aria-label="Anime successivo">
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </section>
      ) : (
        <div className="catalog-notice anime-empty-search">
          <div>
            <strong>Nessun anime corrisponde alla ricerca.</strong>
            <p>Prova con un altro titolo o con il nome dello studio.</p>
          </div>
        </div>
      )}

      {filtered.length ? (
        <section className="tv-library-strip" aria-label="Anime nella videoteca">
          <div className="tv-library-strip-head">
            <div>
              <span className="eyebrow">Videoteca</span>
              <strong>{filtered.length} titoli</strong>
            </div>
            <span>Scorri e scegli cosa mostrare nella TV</span>
          </div>
          <div className="tv-library-posters">
            {filtered.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className={`tv-library-poster ${index === safeIndex ? "active" : ""}`}
                onClick={() => setSelectedIndex(index)}
                aria-label={`Mostra ${item.title} nella TV`}
                aria-pressed={index === safeIndex}
              >
                <div className="tv-library-poster-art">
                  {item.coverUrl ? (
                    <Image
                      src={item.coverUrl}
                      alt=""
                      width={240}
                      height={360}
                      sizes="110px"
                    />
                  ) : (
                    <span>{item.title.slice(0, 1)}</span>
                  )}
                </div>
                <strong>{item.title}</strong>
                <small>{item.progress ?? item.status ?? "Da vedere"}</small>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}