"use client";

import Image from "next/image";
import { BookOpen, Bookmark, Film, Home, LibraryBig, Plus, Search, UserRound, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { DemoCover } from "@/components/demo-cover";
import { demoAnime, demoBooks, demoManga, type DemoItem } from "@/lib/demo-data";

type PreviewSection = "home" | "books" | "manga" | "anime" | "wishlist";

const mangaPreview: DemoItem[] = [
  { ...demoManga[0], meta: "18 volumi", progress: undefined },
  { ...demoManga[7], meta: "9 volumi", progress: undefined },
  { ...demoManga[8], meta: "12 volumi", progress: undefined },
  { ...demoManga[9], meta: "17 volumi", progress: undefined },
  { ...demoManga[10], meta: "30 volumi", progress: undefined },
];

const dockItems: Array<[PreviewSection, string, typeof Home]> = [
  ["home", "Home", Home],
  ["books", "Libri", BookOpen],
  ["manga", "Manga", LibraryBig],
  ["anime", "Anime", Film],
  ["wishlist", "Wishlist", Bookmark],
];

function PreviewShelf({ items, kind }: { items: DemoItem[]; kind: "book" | "manga" }) {
  return (
    <div className={`preview-real-shelf ${kind}`}>
      <div className="preview-shelf-back">
        {items.map((item) => (
          <div className="preview-shelf-item" key={item.id}>
            <DemoCover item={item} />
          </div>
        ))}
      </div>
    </div>
  );
}

function AnimeTvPreview() {
  const [index, setIndex] = useState(0);
  const selected = demoAnime[index];
  const prev = () => setIndex((value) => (value <= 0 ? demoAnime.length - 1 : value - 1));
  const next = () => setIndex((value) => (value >= demoAnime.length - 1 ? 0 : value + 1));

  return (
    <section className="preview-anime-room">
      <div className="preview-tv-cabinet">
        <div className="preview-tv-bezel">
          <div className={`preview-tv-screen ${selected.coverClass ?? "poster-blue"}`}>
            <div className="preview-tv-poster">
              <span>{selected.title}</span>
              <small>{selected.creator}</small>
            </div>
            <div className="preview-tv-copy">
              <span className="eyebrow">Videoteca personale</span>
              <h2>{selected.title}</h2>
              <p>{selected.creator}</p>
              <strong>{selected.progress ?? selected.status ?? "Catalogato"}</strong>
              <span className="preview-tv-note">Scheda catalogo · nessuna riproduzione</span>
            </div>
          </div>
          <div className="preview-tv-controls">
            <button type="button" onClick={prev} aria-label="Anime precedente"><ChevronLeft size={20} /></button>
            <div><small>LIBRONIA TV</small><strong>{index + 1} / {demoAnime.length}</strong></div>
            <button type="button" onClick={next} aria-label="Anime successivo"><ChevronRight size={20} /></button>
          </div>
        </div>
        <div className="preview-tv-stand" aria-hidden="true" />
      </div>

      <div className="preview-video-library" aria-label="Titoli anime">
        {demoAnime.slice(0, 8).map((item, itemIndex) => (
          <button
            type="button"
            key={item.id}
            onClick={() => setIndex(itemIndex)}
            className={itemIndex === index ? "active" : ""}
            aria-pressed={itemIndex === index}
          >
            <span className={`preview-anime-case ${item.coverClass ?? "poster-blue"}`}>
              <i>{item.title.slice(0, 1)}</i>
            </span>
            <strong>{item.title}</strong>
          </button>
        ))}
      </div>
    </section>
  );
}

export function LibroniaPublicPreview() {
  const [section, setSection] = useState<PreviewSection>("home");

  return (
    <div className="libronia-preview-shell" data-theme="dark" data-wood="walnut">
      <div className="preview-notice">Anteprima grafica · dati dimostrativi · nessun account richiesto</div>
      <header className="preview-topbar">
        <div className="preview-brand">
          <Image src="/library-stories-v2-192.png" alt="" width={34} height={34} unoptimized />
          <div><strong>Libronia</strong><small>anteprima redesign</small></div>
        </div>
        <div className="preview-top-actions" aria-hidden="true">
          <span><Search size={17} /></span>
          <span><Plus size={17} /></span>
          <span><UserRound size={17} /></span>
        </div>
      </header>

      <main className="preview-main">
        {section === "home" ? (
          <>
            <section className="collection-home-intro preview-collection-intro">
              <div className="collection-home-title">
                <p className="eyebrow">La tua libreria personale</p>
                <h1>La tua collezione</h1>
                <p>Libri, manga e anime organizzati come oggetti della tua libreria, non come contenuti da consumare.</p>
              </div>
              <button type="button" className="primary-btn collection-add-button"><Plus size={17} /> Aggiungi alla collezione</button>
              <div className="collection-counts">
                <div className="collection-count-card"><BookOpen size={18} /><span>Libri</span><strong>34</strong></div>
                <div className="collection-count-card"><LibraryBig size={18} /><span>Volumi manga</span><strong>86</strong><small>7 serie</small></div>
                <div className="collection-count-card"><Film size={18} /><span>Anime</span><strong>18</strong></div>
              </div>
            </section>

            <section className="collection-home-section">
              <div className="collection-home-heading"><div><p className="eyebrow">Collezione</p><h2>Ultimi aggiunti</h2></div></div>
              <PreviewShelf items={[demoBooks[8], mangaPreview[0], demoBooks[10], mangaPreview[1], demoBooks[1]]} kind="book" />
            </section>
            <section className="collection-home-section">
              <div className="collection-home-heading"><div><p className="eyebrow">Scelti da te</p><h2>Preferiti</h2></div></div>
              <PreviewShelf items={[demoBooks[9], mangaPreview[2], demoBooks[3], mangaPreview[3]]} kind="book" />
            </section>
          </>
        ) : null}

        {section === "books" ? (
          <section className="preview-page-section">
            <div className="preview-section-head"><div><p className="eyebrow">Libri</p><h1>La tua libreria.</h1><p>Copertine proporzionate, appoggiate sul ripiano, con etichette discrete sotto.</p></div><button className="primary-btn" type="button"><Plus size={17} /> Aggiungi libro</button></div>
            <PreviewShelf items={demoBooks.slice(0, 8)} kind="book" />
          </section>
        ) : null}

        {section === "manga" ? (
          <section className="preview-page-section">
            <div className="preview-section-head"><div><p className="eyebrow">Manga</p><h1>Una serie, un elemento.</h1><p>Nella vista generale mostriamo solo la serie e i volumi realmente posseduti.</p></div><button className="primary-btn" type="button"><Plus size={17} /> Aggiungi manga</button></div>
            <PreviewShelf items={mangaPreview} kind="manga" />
            <div className="preview-owned-volumes">
              <div><p className="eyebrow">Esempio scheda serie</p><h2>I tuoi volumi</h2><span>Solo i volumi posseduti, ordinati per numero.</span></div>
              <div className="preview-volume-row">
                {[1,2,3,4,5,7,8,10,12,13,15,18].map((volume) => <div className="preview-volume" key={volume}><span>{String(volume).padStart(2,"0")}</span></div>)}
              </div>
            </div>
          </section>
        ) : null}

        {section === "anime" ? (
          <section className="preview-page-section">
            <div className="preview-section-head"><div><p className="eyebrow">Anime</p><h1>Videoteca.</h1><p>Un richiamo alla TV domestica integrato nel mobile, senza player e senza trasformare Libronia in un servizio streaming.</p></div><button className="primary-btn" type="button"><Plus size={17} /> Aggiungi anime</button></div>
            <AnimeTvPreview />
          </section>
        ) : null}

        {section === "wishlist" ? (
          <section className="preview-page-section">
            <div className="preview-section-head"><div><p className="eyebrow">Wishlist</p><h1>Da aggiungere un giorno.</h1><p>Resta una sezione separata dalla collezione posseduta.</p></div></div>
            <PreviewShelf items={[demoBooks[2], demoManga[11], demoBooks[12], demoManga[13]]} kind="book" />
          </section>
        ) : null}
      </main>

      <nav className="preview-bottom-dock" aria-label="Navigazione anteprima">
        {dockItems.map(([id, label, Icon]) => (
          <button key={id} type="button" onClick={() => setSection(id)} className={section === id ? "active" : ""} aria-current={section === id ? "page" : undefined}>
            <Icon size={20} /><span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
