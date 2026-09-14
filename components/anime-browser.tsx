"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { DemoItem } from "@/lib/demo-data";
import type { Density, GroupBy } from "@/lib/preferences";
import { AlphabetRail } from "@/components/alphabet-rail";

function creatorSortKey(creator: string) {
  const parts = creator.trim().split(/\s+/);
  return parts.at(-1) ?? creator;
}
function keyFor(item: DemoItem, groupBy: GroupBy) {
  return groupBy === "creator" ? creatorSortKey(item.creator) : item.title;
}
function letterFor(value: string) {
  const first = value.trim().charAt(0).toUpperCase();
  return /[A-Z]/.test(first) ? first : "#";
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
  const groups = useMemo(() => {
    const map = new Map<string, DemoItem[]>();
    filtered.forEach((item) => {
      const letter = letterFor(keyFor(item, groupBy));
      map.set(letter, [...(map.get(letter) ?? []), item]);
    });
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered, groupBy]);
  const recentlyUpdated = items.filter((item) => item.progress).slice(0, 4);
  const featured = recentlyUpdated[0] ?? items[0];
  return (
    <section className={`anime-browser density-${density}`}>
      {featured ? (
        <section className={`media-room ${featured.coverClass}`}>
          <div className="tv-frame">
            <div className="tv-screen">
              <span className="eyebrow">In evidenza</span>
              <h2>{featured.title}</h2>
              <p>{featured.progress ?? featured.status}</p>
              <Link
                href={`/library/anime/${featured.id}`}
                className="watch-button"
              >
                Apri scheda
              </Link>
            </div>
          </div>
        </section>
      ) : null}
      <div className="library-toolbar anime-toolbar">
        <label className="search-control">
          <span className="sr-only">Cerca</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca anime, studio o titolo…"
          />
        </label>
        <div className="segmented">
          <button
            className={groupBy === "title" ? "active" : ""}
            onClick={() => setGroupBy("title")}
            type="button"
          >
            Titolo
          </button>
          <button
            className={groupBy === "creator" ? "active" : ""}
            onClick={() => setGroupBy("creator")}
            type="button"
          >
            Studio
          </button>
        </div>
      </div>
      <section className="stream-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">La tua videoteca</span>
            <h2>Ultimi aggiornati</h2>
          </div>
        </div>
        <div className="stream-strip">
          {recentlyUpdated.map((item) => (
            <Link
              className="stream-tile"
              href={`/library/anime/${item.id}`}
              key={item.id}
            >
              <div
                className={`poster-art ${item.coverClass} ${item.coverUrl ? "poster-has-image" : ""}`}
              >
                {item.coverUrl ? (
                  <Image
                    className="poster-image"
                    src={item.coverUrl}
                    alt=""
                    width={400}
                    height={600}
                    sizes="160px"
                  />
                ) : null}
                <strong>{item.title}</strong>
              </div>
              <div>
                <strong>{item.title}</strong>
                <span>{item.progress}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <AlphabetRail />
      <section className="catalog-a-z">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Videoteca</span>
            <h2>Catalogo A–Z</h2>
          </div>
        </div>
        {groups.map(([letter, group]) => (
          <section
            key={letter}
            id={`letter-${letter}`}
            className="anime-letter-group"
          >
            <div className="anime-letter">{letter}</div>
            <div className="poster-grid">
              {group.map((item) => (
                <Link
                  className="poster-card"
                  href={`/library/anime/${item.id}`}
                  key={item.id}
                >
                  <div
                    className={`poster-art ${item.coverClass} ${item.coverUrl ? "poster-has-image" : ""}`}
                  >
                    {item.coverUrl ? (
                      <Image
                        className="poster-image"
                        src={item.coverUrl}
                        alt=""
                        width={400}
                        height={600}
                        sizes="(max-width: 640px) 42vw, 180px"
                      />
                    ) : null}
                    <strong>{item.title}</strong>
                  </div>
                  <div className="poster-info">
                    <strong>{item.title}</strong>
                    <span>{item.progress ?? item.status ?? item.creator}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </section>
    </section>
  );
}
