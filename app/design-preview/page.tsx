import Image from "next/image";
import { BookOpen, Bookmark, Film, Home, LibraryBig, Plus } from "lucide-react";

const demoShelf = [
  { title: "Norwegian Wood", meta: "Einaudi · Tascabile", type: "book", tone: "red" },
  { title: "Dune", meta: "Edizione illustrata", type: "book", tone: "sand" },
  { title: "Monster", meta: "9 volumi posseduti", type: "manga", tone: "ink" },
  { title: "Vagabond", meta: "14 volumi posseduti", type: "manga", tone: "paper" },
  { title: "Vinland Saga", meta: "Anime catalogato", type: "anime", tone: "north" },
] as const;

const demoVolumes = Array.from({ length: 10 }, (_, index) => index + 1);

export default function PublicDesignPreviewPage() {
  return (
    <div className="app-shell public-design-preview" data-theme="dark" data-wood="walnut">
      <header className="preview-public-topbar">
        <div className="preview-public-brand">
          <Image src="/library-stories-v2-192.png" alt="" width={38} height={38} />
          <div><strong>Libronia</strong><span>Anteprima grafica</span></div>
        </div>
        <span className="preview-demo-pill">CONTENUTO DEMO</span>
      </header>

      <main className="preview-public-main">
        <section className="preview-public-intro">
          <p className="eyebrow">Proposta visiva · fase 1</p>
          <h1>La tua collezione</h1>
          <p>
            Questa pagina non usa il tuo inventario: serve soltanto a valutare il
            trattamento grafico di scaffali, copertine, etichette e navigazione.
          </p>
          <button type="button" className="collection-add-action">
            <Plus size={18} /> Aggiungi alla collezione
          </button>
        </section>

        <section className="collection-count-grid preview-demo-counts" aria-label="Conteggi dimostrativi">
          <div className="collection-count-card"><BookOpen size={17} /><strong>38</strong><span>libri</span></div>
          <div className="collection-count-card manga-count-card"><LibraryBig size={17} /><strong>17</strong><span>serie manga</span><small>67 volumi posseduti</small></div>
          <div className="collection-count-card"><Film size={17} /><strong>16</strong><span>anime</span></div>
        </section>

        <section className="collection-shelf-section">
          <header className="collection-shelf-heading">
            <div><p className="eyebrow">Inventario</p><h2>Ultimi aggiunti</h2></div>
            <span>scorri →</span>
          </header>
          <div className="collection-shelf preview-demo-shelf">
            <div className="collection-shelf-scroll">
              <div className="collection-shelf-track">
                {demoShelf.map((item) => (
                  <article className={`collection-shelf-item is-${item.type}`} key={item.title}>
                    <div className="collection-object-zone">
                      <div className={`preview-demo-cover preview-demo-cover-${item.tone}`}>
                        <small>Libronia · demo</small>
                        <strong>{item.title}</strong>
                        <span>{item.type === "anime" ? "ANIME" : item.type === "manga" ? "MANGA" : "LIBRO"}</span>
                      </div>
                    </div>
                    <div className="collection-label">
                      <div className="collection-label-title"><strong>{item.title}</strong></div>
                      <span>{item.meta}</span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
            <div className="collection-shelf-lip" aria-hidden="true" />
          </div>
        </section>

        <section className="preview-public-manga-block">
          <header className="collection-shelf-heading">
            <div><p className="eyebrow">Scheda serie · demo</p><h2>Scaffale dei volumi posseduti</h2></div>
            <span>solo ciò che possiedi</span>
          </header>
          <div className="manga-series-object preview-demo-series-object">
            <div className="preview-demo-cover preview-demo-cover-ink preview-demo-series-cover">
              <small>Serie demo</small><strong>Monster</strong><span>MANGA</span>
            </div>
            <div>
              <span className="eyebrow">Serie nella collezione</span>
              <h2>Monster</h2>
              <strong>10 volumi posseduti</strong>
              <p>La vista generale mostra una sola serie. Qui dentro compaiono esclusivamente i volumi posseduti.</p>
            </div>
          </div>
          <div className="manga-owned-shelf">
            <div className="manga-owned-scroll">
              <div className="manga-owned-track">
                {demoVolumes.map((volume) => (
                  <article className="manga-owned-volume" key={volume}>
                    <div className="manga-owned-object"><small>Libronia</small><strong>{String(volume).padStart(2, "0")}</strong><span>Monster</span></div>
                    <div className="manga-owned-label">Vol. {volume}</div>
                  </article>
                ))}
              </div>
            </div>
            <div className="manga-owned-lip" aria-hidden="true" />
          </div>
          <p className="preview-data-note">Copertine neutre numerate = volume posseduto senza immagine affidabile disponibile. Non sono ricostruzioni dell’edizione reale.</p>
        </section>
      </main>

      <nav className="bottom-dock preview-static-dock" aria-label="Anteprima navigazione inferiore">
        <span className="active"><Home size={20} /><small>Home</small></span>
        <span><BookOpen size={20} /><small>Libri</small></span>
        <span><LibraryBig size={20} /><small>Manga</small></span>
        <span><Film size={20} /><small>Anime</small></span>
        <span><Bookmark size={20} /><small>Wishlist</small></span>
      </nav>
    </div>
  );
}
