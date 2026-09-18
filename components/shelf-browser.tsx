"use client";

import { useMemo, useState } from "react";
import type { DemoItem } from "@/lib/demo-data";
import type { CoverView, Density, GroupBy } from "@/lib/preferences";
import { DemoCover } from "@/components/demo-cover";
import { AlphabetRail } from "@/components/alphabet-rail";

export type ShelfScope = "collection" | "outside";
type ScopeFilter = "collection" | "outside" | "all";

type ShelfItem = DemoItem & {
  href?: string;
  badge?: string;
  shelfScope?: ShelfScope;
};

function creatorSortKey(creator: string) {
  const clean = creator.trim();
  const parts = clean.split(/\s+/);
  return parts.at(-1) ?? clean;
}

function groupKey(item: DemoItem, groupBy: GroupBy) {
  return groupBy === "creator" ? creatorSortKey(item.creator) : item.title.trim();
}

function initialLetter(value: string) {
  const first = value.charAt(0).toUpperCase();
  return /[A-Z]/.test(first) ? first : "#";
}

export function ShelfBrowser({
  items,
  kind,
  defaultGroupBy,
  density,
  coverView,
  showScopeTabs = false,
}: {
  items: ShelfItem[];
  kind: "book" | "manga";
  defaultGroupBy: GroupBy;
  density: Density;
  coverView: CoverView;
  showScopeTabs?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>(defaultGroupBy);
  const [scope, setScope] = useState<ScopeFilter>("collection");

  const counts = useMemo(
    () => ({
      collection: items.filter((item) => item.shelfScope === "collection").length,
      outside: items.filter((item) => item.shelfScope === "outside").length,
      all: items.length,
    }),
    [items],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const scoped =
      showScopeTabs && scope !== "all"
        ? items.filter((item) => item.shelfScope === scope)
        : items;
    const result = q
      ? scoped.filter((item) =>
          `${item.title} ${item.creator} ${item.progress ?? ""} ${item.meta ?? ""} ${item.badge ?? ""}`
            .toLowerCase()
            .includes(q),
        )
      : scoped;
    return [...result].sort((a, b) =>
      groupKey(a, groupBy).localeCompare(groupKey(b, groupBy), "it", {
        sensitivity: "base",
      }),
    );
  }, [items, query, groupBy, scope, showScopeTabs]);

  const groups = useMemo(() => {
    const map = new Map<string, ShelfItem[]>();
    filtered.forEach((item) => {
      const letter = initialLetter(groupKey(item, groupBy));
      const group = map.get(letter);
      if (group) group.push(item);
      else map.set(letter, [item]);
    });
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered, groupBy]);

  const emptyCopy =
    showScopeTabs && scope === "collection"
      ? "Nessun manga con volumi posseduti."
      : showScopeTabs && scope === "outside"
        ? "Nessun manga letto o in lettura fuori dalla collezione fisica."
        : "Nessun risultato.";

  return (
    <section
      className={`shelf-browser ${kind} density-${density} view-${coverView}`}
    >
      {showScopeTabs ? (
        <div className="manga-scope-tabs" aria-label="Visualizzazione manga">
          {([
            ["collection", "Collezione"],
            ["outside", "Fuori collezione"],
            ["all", "Tutti"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={scope === value ? "active" : ""}
              onClick={() => setScope(value)}
              aria-pressed={scope === value}
            >
              <span>{label}</span>
              <small>{counts[value]}</small>
            </button>
          ))}
        </div>
      ) : null}

      <div className="library-toolbar">
        <label className="search-control">
          <span className="sr-only">Cerca</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={
              kind === "manga" ? "Cerca serie o autore…" : "Cerca libro o autore…"
            }
          />
        </label>
        <div className="segmented" aria-label="Raggruppamento">
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
            Autore
          </button>
        </div>
      </div>

      <AlphabetRail availableLetters={groups.map(([letter]) => letter)} />

      <div className="library-frame">
        {groups.length ? (
          groups.map(([letter, group]) => (
            <section className="wood-section" id={`letter-${letter}`} key={letter}>
              <header className="shelf-heading">
                <div>
                  <span className="shelf-letter">{letter}</span>
                  <span className="shelf-mode">
                    {groupBy === "title" ? "Titoli" : "Autori"}
                  </span>
                </div>
                <span>
                  {group.length}{" "}
                  {kind === "manga"
                    ? group.length === 1
                      ? "copertina"
                      : "copertine"
                    : group.length === 1
                      ? "opera"
                      : "opere"}
                </span>
              </header>
              <div className="shelf-grid">
                {group.map((item) => (
                  <DemoCover
                    key={item.id}
                    item={item}
                    badge={item.badge}
                    href={
                      item.href ??
                      (kind === "manga"
                        ? `/library/manga/${item.id}`
                        : `/library/books/${item.id}`)
                    }
                  />
                ))}
              </div>
            </section>
          ))
        ) : (
          <section className="empty-shelf">
            <p>{emptyCopy}</p>
          </section>
        )}
      </div>
    </section>
  );
}
