"use client";

import { useMemo, useState } from "react";
import type { DemoItem } from "@/lib/demo-data";
import type { CoverView, Density, GroupBy } from "@/lib/preferences";
import { DemoCover } from "@/components/demo-cover";
import { AlphabetRail } from "@/components/alphabet-rail";

function creatorSortKey(creator: string) { const clean = creator.trim(); const parts = clean.split(/\s+/); return parts.at(-1) ?? clean; }
function groupKey(item: DemoItem, groupBy: GroupBy) { return groupBy === "creator" ? creatorSortKey(item.creator) : item.title.trim(); }
function initialLetter(value: string) { const first = value.charAt(0).toUpperCase(); return /[A-Z]/.test(first) ? first : "#"; }

export function ShelfBrowser({ items, kind, defaultGroupBy, density, coverView }: { items: DemoItem[]; kind: "book" | "manga"; defaultGroupBy: GroupBy; density: Density; coverView: CoverView }) {
  const [query, setQuery] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>(defaultGroupBy);
  const filtered = useMemo(() => { const q=query.trim().toLowerCase(); const result=q?items.filter((item)=>`${item.title} ${item.creator}`.toLowerCase().includes(q)):items; return [...result].sort((a,b)=>groupKey(a,groupBy).localeCompare(groupKey(b,groupBy),"it",{sensitivity:"base"})); }, [items,query,groupBy]);
  const groups = useMemo(() => { const map=new Map<string,DemoItem[]>(); filtered.forEach((item)=>{ const letter=initialLetter(groupKey(item,groupBy)); map.set(letter,[...(map.get(letter)??[]),item]); }); return [...map.entries()].sort(([a],[b])=>a.localeCompare(b)); }, [filtered,groupBy]);
  return (
    <section className={`shelf-browser ${kind} density-${density} view-${coverView}`}>
      <div className="library-toolbar"><label className="search-control"><span className="sr-only">Cerca</span><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder={kind === "manga" ? "Cerca serie o autore…" : "Cerca libro o autore…"} /></label><div className="segmented" aria-label="Raggruppamento"><button className={groupBy === "title" ? "active" : ""} onClick={()=>setGroupBy("title")} type="button">Titolo</button><button className={groupBy === "creator" ? "active" : ""} onClick={()=>setGroupBy("creator")} type="button">Autore</button></div></div>
      <AlphabetRail />
      <div className="library-frame">{groups.length ? groups.map(([letter,group]) => <section className="wood-section" id={`letter-${letter}`} key={letter}><header className="shelf-heading"><div><span className="shelf-letter">{letter}</span><span className="shelf-mode">{groupBy === "title" ? "Titoli" : "Autori"}</span></div><span>{group.length} {group.length === 1 ? "opera" : "opere"}</span></header><div className="shelf-grid">{group.map((item)=><DemoCover key={item.id} item={item} href={kind === "manga" ? `/library/manga/${item.id}` : `/library/books/${item.id}`} />)}</div></section>) : <section className="empty-shelf"><p>Nessun risultato.</p></section>}</div>
    </section>
  );
}
