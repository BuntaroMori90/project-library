import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BookMarked,
  Bookmark,
  Heart,
  LibraryBig,
  Star,
  StickyNote,
} from "lucide-react";
import { requireProfile } from "@/lib/profile";
import { getBookDetail } from "@/lib/repositories/library";
import { demoBooks } from "@/lib/demo-data";
import { DemoCover } from "@/components/demo-cover";
import { WishlistToggle } from "@/components/wishlist-toggle";
import {
  updateBookPersonal,
  updateBookProgress,
  updateBookState,
} from "./actions";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const statusLabels: Record<string, string> = {
  PLANNED: "Da iniziare",
  IN_PROGRESS: "In lettura",
  COMPLETED: "Completato",
  PAUSED: "In pausa",
  DROPPED: "Abbandonato",
};

function BookTabs() {
  return (
    <nav className="detail-tabs book-tabs" aria-label="Sezioni libro">
      <a className="active" href="#panoramica">
        Panoramica
      </a>
      <a href="#edizioni">Edizioni</a>
      <a href="#personale">La mia scheda</a>
    </nav>
  );
}
function ReadingProgress({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  const percentage =
    total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  return (
    <div className="book-progress-visual" aria-label={`${percentage}% letto`}>
      <div className="book-progress-track">
        <span style={{ width: `${percentage}%` }} />
      </div>
      <div>
        <strong>{percentage}%</strong>
        <span>
          {current} / {total} pagine
        </span>
      </div>
    </div>
  );
}

function DemoBookDetail({ id }: { id: string }) {
  const item = demoBooks.find((book) => book.id === id);
  if (!item) notFound();
  const isDune = id === "dune";
  const currentPage = isDune ? 284 : item.status === "Letto" ? 420 : 0;
  const totalPages = isDune ? 688 : 420;
  const status =
    item.status === "Letto"
      ? "Completato"
      : currentPage > 0
        ? "In lettura"
        : "Da iniziare";
  return (
    <main className="page book-detail-page work-detail-v2">
      <Link href="/library/books" className="back-link">
        ← Libri
      </Link>
      <section className="work-hero book-work-hero">
        <div className="work-cover-wrap book-cover-wrap">
          <DemoCover item={item} />
          <button className="round-favorite active" aria-label="Preferito">
            <Heart size={18} fill="currentColor" />
          </button>
        </div>
        <div className="work-identity">
          <p className="eyebrow">Libro · catalogo demo</p>
          <h1>{item.title}</h1>
          <p className="work-byline">{item.creator} · Romanzo</p>
          <div className="meta-pills">
            <span>Fantascienza</span>
            <span>Romanzo</span>
            <span>Classico</span>
          </div>
          <p className="work-description">
            La scheda dell'opera resta unica. Edizione posseduta, formato,
            progresso, voto e note sono invece dati personali.
          </p>
        </div>
      </section>
      <section
        className="personal-dashboard book-personal-dashboard"
        id="personale"
      >
        <div className="personal-dashboard-head">
          <div>
            <span className="eyebrow">La mia scheda</span>
            <h2>{item.title} nella mia libreria</h2>
          </div>
          <button className="soft-action">Modifica</button>
        </div>
        <div className="personal-metrics book-personal-metrics">
          <div>
            <span>Stato</span>
            <strong>{status}</strong>
            <small>Gestito dentro l'opera</small>
          </div>
          <div>
            <span>Progresso</span>
            <strong>{currentPage ? `Pag. ${currentPage}` : "—"}</strong>
            <small>
              {currentPage
                ? `${Math.round((currentPage / totalPages) * 100)}% letto`
                : "Non iniziato"}
            </small>
          </div>
          <div>
            <span>Edizione posseduta</span>
            <strong>Oscar Vault</strong>
            <small>Mondadori · Cartaceo</small>
          </div>
          <div>
            <span>Il mio voto</span>
            <strong>
              9,0 <Star size={15} fill="currentColor" />
            </strong>
            <small>Personale</small>
          </div>
        </div>
        <ReadingProgress current={currentPage} total={totalPages} />
      </section>
      <BookTabs />
      <section
        id="panoramica"
        className="detail-section overview-grid book-overview-grid"
      >
        <article className="overview-card book-facts-card">
          <span className="eyebrow">Opera</span>
          <h2>Panoramica</h2>
          <dl>
            <div>
              <dt>Autore</dt>
              <dd>{item.creator}</dd>
            </div>
            <div>
              <dt>Prima pubblicazione</dt>
              <dd>{isDune ? "1965" : "—"}</dd>
            </div>
            <div>
              <dt>Lingua originale</dt>
              <dd>Inglese</dd>
            </div>
            <div>
              <dt>Stato</dt>
              <dd>Opera completa</dd>
            </div>
          </dl>
        </article>
        <article className="overview-card note-preview book-note-preview">
          <StickyNote size={20} />
          <span className="eyebrow">Le mie note</span>
          <p>
            Note personali sull'opera, citazioni da ricordare o impressioni di
            lettura. Restano private e separate dai dati editoriali.
          </p>
        </article>
      </section>
      <section id="edizioni" className="detail-section book-editions-stage">
        <div className="section-heading detail-heading">
          <div>
            <span className="eyebrow">Edizioni</span>
            <h2>Le versioni di {item.title}</h2>
          </div>
          <span>1 posseduta</span>
        </div>
        <p className="subtitle detail-explainer">
          Per i libri l'edizione è centrale: cambia copertina, editore, formato,
          numero di pagine e ISBN.
        </p>
        <div className="book-edition-grid">
          <article className="book-edition-card owned selected">
            <div className="edition-book-mini cover-sand">
              <span>{item.title}</span>
            </div>
            <div className="book-edition-copy">
              <span className="edition-badge">Posseduta</span>
              <h3>Oscar Vault</h3>
              <p>Mondadori · Italiano · Cartaceo</p>
              <dl>
                <div>
                  <dt>Pagine</dt>
                  <dd>{totalPages}</dd>
                </div>
                <div>
                  <dt>ISBN</dt>
                  <dd>978-88-04-00000-0</dd>
                </div>
              </dl>
            </div>
          </article>
          <article className="book-edition-card">
            <div className="edition-book-mini edition-alt">
              <span>{item.title}</span>
            </div>
            <div className="book-edition-copy">
              <h3>Edizione inglese</h3>
              <p>Paperback · English</p>
              <dl>
                <div>
                  <dt>Pagine</dt>
                  <dd>688</dd>
                </div>
                <div>
                  <dt>Formato</dt>
                  <dd>Brossura</dd>
                </div>
              </dl>
            </div>
          </article>
          <article className="book-edition-card digital">
            <div className="digital-edition-icon">
              <BookMarked size={28} />
            </div>
            <div className="book-edition-copy">
              <h3>Edizione digitale</h3>
              <p>Kindle / eBook</p>
              <dl>
                <div>
                  <dt>Formato</dt>
                  <dd>Digitale</dd>
                </div>
                <div>
                  <dt>Possesso</dt>
                  <dd>No</dd>
                </div>
              </dl>
            </div>
          </article>
        </div>
      </section>
      <section className="detail-section two-up-detail book-bottom-panels">
        <article className="info-panel">
          <Bookmark size={22} />
          <div>
            <span className="eyebrow">Wishlist</span>
            <h2>Edizioni da recuperare</h2>
            <p>
              Puoi desiderare un'edizione specifica senza duplicare il libro
              nella libreria.
            </p>
          </div>
        </article>
        <article className="info-panel">
          <LibraryBig size={22} />
          <div>
            <span className="eyebrow">Principio</span>
            <h2>Opera ≠ copia posseduta</h2>
            <p>
              Leggi {item.title} una volta sola, ma puoi possedere più edizioni
              fisiche o digitali della stessa opera.
            </p>
          </div>
        </article>
      </section>
    </main>
  );
}

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID.test(id)) return <DemoBookDetail id={id} />;
  const { profile } = await requireProfile();
  const detail = await getBookDetail(profile.id, id);
  const { work, creators, libraryEntry, progress, editions, ownedEditionIds } =
    detail;
  if (!work) notFound();
  const ownedEdition =
    editions?.find((edition) => ownedEditionIds.has(edition.id)) ?? null;
  const currentPage = progress?.current_page ?? null;
  const totalPages =
    progress?.total_pages ??
    ownedEdition?.page_count ??
    ownedEdition?.total_units ??
    null;
  const percentage =
    progress?.percentage != null
      ? Number(progress.percentage)
      : currentPage && totalPages
        ? Math.min(100, Math.round((currentPage / totalPages) * 1000) / 10)
        : null;
  const status = libraryEntry?.status ?? "PLANNED";
  const statusText = statusLabels[status] ?? "Da iniziare";
  return (
    <main className="page book-detail-page work-detail-v2">
      <Link href="/library/books" className="back-link">
        ← Libri
      </Link>
      <section className="work-hero book-work-hero">
        <div className="work-cover-wrap book-cover-wrap">
          {work.cover_url ? (
            <div className="book-real-cover">
              <Image
                src={work.cover_url}
                alt={`Copertina di ${work.title}`}
                width={500}
                height={750}
                sizes="(max-width: 640px) 55vw, 260px"
                priority
              />
            </div>
          ) : (
            <div className="book-real-cover fallback">
              <span>{work.title}</span>
              <small>{creators[0] ?? "Autore da verificare"}</small>
            </div>
          )}
          <span
            className={`round-favorite ${libraryEntry?.favorite ? "active" : ""}`}
            aria-label="Preferito"
          >
            <Heart
              size={18}
              fill={libraryEntry?.favorite ? "currentColor" : "none"}
            />
          </span>
        </div>
        <div className="work-identity">
          <p className="eyebrow">Libro</p>
          <h1>{work.title}</h1>
          {work.original_title ? (
            <p className="work-original">{work.original_title}</p>
          ) : null}
          <p className="work-byline">
            {creators.join(", ") || "Autore da verificare"}
            {work.release_year ? ` · ${work.release_year}` : ""}
          </p>
          {work.genres?.length ? (
            <div className="meta-pills">
              {work.genres.slice(0, 4).map((genre: string) => (
                <span key={genre}>{genre}</span>
              ))}
            </div>
          ) : null}
          <p className="work-description">
            {work.description || "Descrizione non ancora disponibile."}
          </p>
        </div>
      </section>
      <section
        className="personal-dashboard book-personal-dashboard"
        id="personale"
      >
        <div className="personal-dashboard-head">
          <div>
            <span className="eyebrow">La mia scheda</span>
            <h2>{work.title} nella mia libreria</h2>
          </div>
          <WishlistToggle
            profileId={profile.id}
            workId={work.id}
            returnPath={"/library/books/" + work.id}
          />
        </div>
        <div className="personal-metrics book-personal-metrics">
          <div>
            <span>Stato</span>
            <strong>{statusText}</strong>
            <small>Personale</small>
          </div>
          <div>
            <span>Progresso</span>
            <strong>
              {currentPage !== null ? `Pag. ${currentPage}` : "—"}
            </strong>
            <small>
              {percentage !== null
                ? `${percentage}% letto`
                : "Nessun progresso"}
            </small>
          </div>
          <div>
            <span>Edizione posseduta</span>
            <strong>{ownedEdition?.name || "Nessuna"}</strong>
            <small>
              {[ownedEdition?.publisher, ownedEdition?.format]
                .filter(Boolean)
                .join(" · ") || "Da impostare"}
            </small>
          </div>
          <div>
            <span>Il mio voto</span>
            <strong>
              {libraryEntry?.rating ?? "—"}
              {libraryEntry?.rating ? (
                <>
                  <span> </span>
                  <Star size={15} fill="currentColor" />
                </>
              ) : null}
            </strong>
            <small>Personale</small>
          </div>
        </div>
        {currentPage !== null && totalPages ? (
          <ReadingProgress current={currentPage} total={totalPages} />
        ) : null}
        <div className="book-edit-grid">
          <form action={updateBookState} className="mini-edit-form">
            <input type="hidden" name="workId" value={work.id} />
            <label>
              Stato
              <select name="status" defaultValue={status}>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="soft-action">
              Salva stato
            </button>
          </form>
          <form action={updateBookProgress} className="mini-edit-form">
            <input type="hidden" name="workId" value={work.id} />
            <label>
              Pagina attuale
              <input
                name="currentPage"
                type="number"
                min="0"
                defaultValue={currentPage ?? ""}
              />
            </label>
            <label>
              Pagine edizione
              <input
                name="totalPages"
                type="number"
                min="1"
                defaultValue={totalPages ?? ""}
              />
            </label>
            <button type="submit" className="soft-action">
              Salva progresso
            </button>
          </form>
          <form action={updateBookPersonal} className="mini-edit-form wide">
            <input type="hidden" name="workId" value={work.id} />
            <label className="check-line">
              <input
                name="favorite"
                type="checkbox"
                defaultChecked={Boolean(libraryEntry?.favorite)}
              />{" "}
              Preferito
            </label>
            <label>
              Voto
              <input
                name="rating"
                type="number"
                min="0"
                max="10"
                step="0.5"
                defaultValue={libraryEntry?.rating ?? ""}
              />
            </label>
            <label className="wide-field">
              Note
              <textarea name="notes" defaultValue={libraryEntry?.notes ?? ""} />
            </label>
            <button type="submit" className="soft-action">
              Salva scheda
            </button>
          </form>
        </div>
      </section>
      <BookTabs />
      <section
        id="panoramica"
        className="detail-section overview-grid book-overview-grid"
      >
        <article className="overview-card book-facts-card">
          <span className="eyebrow">Opera</span>
          <h2>Panoramica</h2>
          <dl>
            <div>
              <dt>Autore</dt>
              <dd>{creators.join(", ") || "—"}</dd>
            </div>
            <div>
              <dt>Prima pubblicazione</dt>
              <dd>{work.release_year ?? "—"}</dd>
            </div>
            <div>
              <dt>Stato editoriale</dt>
              <dd>
                {work.publication_status === "COMPLETED"
                  ? "Completa"
                  : work.publication_status === "ONGOING"
                    ? "In pubblicazione"
                    : "Da verificare"}
              </dd>
            </div>
            <div>
              <dt>Generi</dt>
              <dd>{work.genres?.join(", ") || "—"}</dd>
            </div>
          </dl>
        </article>
        <article className="overview-card note-preview book-note-preview">
          <StickyNote size={20} />
          <span className="eyebrow">Le mie note</span>
          <p>{libraryEntry?.notes || "Nessuna nota personale."}</p>
        </article>
      </section>
      <section id="edizioni" className="detail-section book-editions-stage">
        <div className="section-heading detail-heading">
          <div>
            <span className="eyebrow">Edizioni</span>
            <h2>Le versioni di {work.title}</h2>
          </div>
          <span>{ownedEditionIds.size} possedute</span>
        </div>
        <p className="subtitle detail-explainer">
          Copertina, editore, ISBN, lingua, formato e numero di pagine
          appartengono alla singola edizione.
        </p>
        {editions?.length ? (
          <div className="book-edition-grid">
            {editions.map((edition) => {
              const owned = ownedEditionIds.has(edition.id);
              return (
                <article
                  key={edition.id}
                  className={`book-edition-card ${owned ? "owned selected" : ""}`}
                >
                  <div className="edition-book-mini">
                    {edition.cover_url ? (
                      <Image
                        src={edition.cover_url}
                        alt=""
                        width={240}
                        height={360}
                        sizes="120px"
                      />
                    ) : (
                      <span>{work.title}</span>
                    )}
                  </div>
                  <div className="book-edition-copy">
                    {owned ? (
                      <span className="edition-badge">Posseduta</span>
                    ) : null}
                    <h3>{edition.name}</h3>
                    <p>
                      {[edition.publisher, edition.language, edition.format]
                        .filter(Boolean)
                        .join(" · ") || "Dati da arricchire"}
                    </p>
                    <dl>
                      <div>
                        <dt>Anno</dt>
                        <dd>{edition.publication_year ?? "—"}</dd>
                      </div>
                      <div>
                        <dt>ISBN</dt>
                        <dd>{edition.isbn13 || edition.isbn10 || "—"}</dd>
                      </div>
                    </dl>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="catalog-notice">
            <div>
              <strong>Nessuna edizione ancora collegata.</strong>
              <p>
                L'opera può comunque stare nella libreria; aggiungeremo le
                edizioni quando il catalogo le restituisce.
              </p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
